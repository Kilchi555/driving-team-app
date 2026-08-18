import type Stripe from 'stripe'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import {
  isWebsiteHostingPlan,
  websiteSubscriptionPlanId,
  WEBSITE_PRICE_ENV,
  type WebsiteHostingPlan,
} from '~/utils/website-billing'
import { notifySuperadminsWebsitePublished } from '~/server/utils/website-publish-notify'

export function getWebsitePriceIds() {
  return {
    setup: process.env[WEBSITE_PRICE_ENV.setup]?.trim() || '',
    host: process.env[WEBSITE_PRICE_ENV.host]?.trim() || '',
    care: process.env[WEBSITE_PRICE_ENV.care]?.trim() || '',
  }
}

export function hostingPlanFromPriceId(priceId: string | null | undefined): WebsiteHostingPlan | null {
  const ids = getWebsitePriceIds()
  if (!priceId) return null
  if (priceId === ids.host) return 'host'
  if (priceId === ids.care) return 'care'
  return null
}

export function isWebsiteStripeSubscription(sub: Stripe.Subscription): boolean {
  if (sub.metadata?.product === 'website') return true
  const ids = getWebsitePriceIds()
  return sub.items.data.some((item) => {
    const id = typeof item.price === 'string' ? item.price : item.price?.id
    return id === ids.host || id === ids.care
  })
}

export function homepageHasContent(blocks: unknown): boolean {
  if (!blocks || typeof blocks !== 'object') return false
  const landing = blocks as { blocks?: unknown[] }
  if (Array.isArray(landing.blocks) && landing.blocks.length > 0) return true
  return Object.keys(blocks as object).length > 0
}

export async function loadWebsiteHomePage(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  websiteId: string,
) {
  const { data } = await supabase
    .from('website_pages')
    .select('id, blocks, is_published')
    .eq('website_id', websiteId)
    .eq('is_home', true)
    .maybeSingle()
  return data
}

export function websitePublishBlockedReason(tenant: {
  website_only?: boolean | null
  website_setup_paid_at?: string | null
  website_hosting_plan?: string | null
  trial_ends_at?: string | null
} | null): 'hosting' | 'setup' | null {
  if (!tenant?.website_only) return null
  // Trial (or unpaid setup) may go live. After the window, hosting is required.
  // Setup fee is collected at checkout — not a second gate during trial.
  if (isWebsiteHostingPlan(tenant.website_hosting_plan)) return null
  const trialOpen = tenant.trial_ends_at
    ? Date.now() <= new Date(tenant.trial_ends_at).getTime()
    : true
  if (trialOpen) return null
  return 'hosting'
}

export async function publishWebsiteForTenant(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  tenantId: string,
  baseUrl: string,
) {
  const { data: website } = await supabase
    .from('website_tenants')
    .select(
      'id, subdomain, custom_domain, custom_domain_verified, hero_image_url, logo_url, primary_color, secondary_color, accent_color',
    )
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (!website) {
    throw createError({ statusCode: 404, statusMessage: 'Website not found' })
  }

  const home = await loadWebsiteHomePage(supabase, website.id)
  if (!home || !homepageHasContent(home.blocks)) {
    throw createError({ statusCode: 400, statusMessage: 'Homepage ist noch nicht bereit' })
  }

  const now = new Date().toISOString()
  await supabase
    .from('website_pages')
    .update({ is_published: true, published_at: now })
    .eq('website_id', website.id)

  const { data: updatedWebsite, error } = await supabase
    .from('website_tenants')
    .update({ is_published: true, last_published_at: now })
    .eq('id', website.id)
    .select()
    .single()

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  const { data: tenant } = await supabase
    .from('tenants')
    .select(
      'id, name, slug, business_type, primary_color, secondary_color, accent_color, logo_url, logo_square_url, contact_email, contact_phone, address, invoice_city, invoice_zip',
    )
    .eq('id', tenantId)
    .maybeSingle()

  await supabase
    .from('tenants')
    .update({ website_status: 'live' })
    .eq('id', tenantId)

  const liveUrl =
    website.custom_domain_verified && website.custom_domain
      ? `https://${website.custom_domain}`
      : `${baseUrl}/s/${encodeURIComponent(website.subdomain)}`
  const previewUrl = `${baseUrl}/s/${encodeURIComponent(website.subdomain)}?preview=1`

  try {
    const { ensureWebsiteSeoPages } = await import('~/server/utils/website-ensure-seo-pages')
    await ensureWebsiteSeoPages(supabase, {
      website,
      tenant: tenant || { id: tenantId, name: website.subdomain, slug: website.subdomain },
      baseUrl,
      publish: true,
    })
  } catch (err: any) {
    console.warn('[website-publish] seo pages skipped:', err?.message)
  }

  await notifySuperadminsWebsitePublished({
    tenantId,
    tenantName: tenant?.name || website.subdomain,
    tenantSlug: tenant?.slug || website.subdomain,
    subdomain: website.subdomain,
    liveUrl,
    previewUrl,
  })

  return { website: updatedWebsite, liveUrl, previewUrl, subdomain: website.subdomain }
}

export async function unpublishWebsiteForTenant(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  tenantId: string,
) {
  const { data: website } = await supabase
    .from('website_tenants')
    .select('id')
    .eq('tenant_id', tenantId)
    .maybeSingle()
  if (!website) return
  await supabase
    .from('website_tenants')
    .update({ is_published: false })
    .eq('id', website.id)
  await supabase
    .from('website_pages')
    .update({ is_published: false })
    .eq('website_id', website.id)
  await supabase
    .from('tenants')
    .update({ website_status: 'disabled' })
    .eq('id', tenantId)
}

export async function applyWebsiteHostingFromSubscription(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  tenantId: string,
  sub: Stripe.Subscription,
  extras?: { setupPaid?: boolean; currentPeriodEnd?: string | null },
) {
  let hosting: WebsiteHostingPlan | null = null
  if (sub.metadata?.hosting_plan && isWebsiteHostingPlan(sub.metadata.hosting_plan)) {
    hosting = sub.metadata.hosting_plan
  } else {
    for (const item of sub.items.data) {
      const id = typeof item.price === 'string' ? item.price : item.price?.id
      hosting = hostingPlanFromPriceId(id) || hosting
    }
  }
  if (!hosting) hosting = 'host'

  const payload: Record<string, unknown> = {
    stripe_subscription_id: sub.id,
    website_hosting_plan: hosting,
    subscription_plan: websiteSubscriptionPlanId(hosting),
    is_trial: false,
    website_only: true,
  }
  if (typeof sub.customer === 'string') payload.stripe_customer_id = sub.customer
  if (extras?.currentPeriodEnd) payload.current_period_end = extras.currentPeriodEnd
  if (extras?.setupPaid) payload.website_setup_paid_at = new Date().toISOString()

  const { error } = await supabase.from('tenants').update(payload).eq('id', tenantId)
  if (error) throw new Error(error.message)
  return hosting
}

export async function applyWebsiteSetupPaid(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  tenantId: string,
) {
  const { data } = await supabase
    .from('tenants')
    .select('website_setup_paid_at')
    .eq('id', tenantId)
    .single()
  if (data?.website_setup_paid_at) return
  await supabase
    .from('tenants')
    .update({ website_setup_paid_at: new Date().toISOString() })
    .eq('id', tenantId)
}

export async function applyWebsiteCheckoutSession(opts: {
  supabase: ReturnType<typeof getSupabaseAdmin>
  stripe: Stripe
  session: Stripe.Checkout.Session
  baseUrl: string
}) {
  const { supabase, stripe, session, baseUrl } = opts
  const meta = session.metadata || {}
  if (meta.product !== 'website') return false

  const tenantId = meta.tenant_id
  if (!tenantId) return false

  const includeSetup = meta.include_setup === 'true'
  const publishAfterPay = meta.publish_after_pay === 'true'

  if (session.mode === 'subscription' && session.subscription) {
    const sub = await stripe.subscriptions.retrieve(session.subscription as string)
    const { resolveSubscriptionPeriodEnd } = await import('~/server/utils/stripe-subscription-period')
    await applyWebsiteHostingFromSubscription(supabase, tenantId, sub, {
      setupPaid: includeSetup,
      currentPeriodEnd: resolveSubscriptionPeriodEnd(sub),
    })
  } else if (includeSetup) {
    await applyWebsiteSetupPaid(supabase, tenantId)
  }

  if (publishAfterPay) {
    try {
      await publishWebsiteForTenant(supabase, tenantId, baseUrl)
    } catch (err: any) {
      console.warn('⚠️ website checkout: publish after pay skipped:', err?.message)
    }
  }

  return true
}
