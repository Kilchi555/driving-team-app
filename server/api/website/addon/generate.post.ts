// POST /api/website/addon/generate
// Input → AI draft → website_pages row (unpublished)

import Anthropic from '@anthropic-ai/sdk'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import {
  buildAddonPage,
  fallbackAddonCopy,
  suggestAddonSlug,
  type AddonInputs,
  type AddonPageType,
} from '~/server/utils/website-addon-builder'

const client = new Anthropic()
const AI_MODEL = 'claude-haiku-4-5'

function appBaseUrl(event: any) {
  const fromEnv =
    process.env.NUXT_PUBLIC_APP_URL || process.env.NUXT_PUBLIC_BASE_URL || process.env.APP_BASE_URL
  if (fromEnv) return fromEnv.replace(/\/$/, '')
  const host = getRequestHeader(event, 'x-forwarded-host') || getRequestHeader(event, 'host')
  const proto = getRequestHeader(event, 'x-forwarded-proto') || 'https'
  return host ? `${proto}://${host}` : 'https://app.simy.ch'
}

async function generateAiCopy(opts: {
  pageType: AddonPageType
  tenantName: string
  businessType: string
  formal: 'sie' | 'du'
  inputs: AddonInputs
}): Promise<{
  headline: string
  subheadline: string
  body: string
  faq: Array<{ q: string; a: string }>
  cta_headline: string
  cta_subheadline: string
  seo_title: string
  seo_description: string
  seo_keywords: string
} | null> {
  const addressRule =
    opts.formal === 'du'
      ? 'Always use "du" (informal), never "Sie"'
      : 'Always use "Sie" (formal), never "du"'

  const prompt = `You are an expert Swiss SEO copywriter for ${opts.businessType} businesses.
Write ONLY Schweizer Hochdeutsch. ${addressRule}.
Create landing-page copy for a "${opts.pageType}" add-on page for "${opts.tenantName}".

Inputs from the business owner:
- title: ${opts.inputs.title || '-'}
- city: ${opts.inputs.city || '-'}
- category: ${opts.inputs.category_name || '-'}
- keywords: ${opts.inputs.keywords || '-'}
- notes: ${opts.inputs.notes || '-'}
- reference links: ${(opts.inputs.links || []).join(', ') || '-'}

Return ONLY valid JSON:
{
  "headline": "...",
  "subheadline": "...",
  "body": "...",
  "faq": [{"q":"...","a":"..."},{"q":"...","a":"..."}],
  "cta_headline": "...",
  "cta_subheadline": "...",
  "seo_title": "max 60 chars",
  "seo_description": "max 160 chars",
  "seo_keywords": "comma separated"
}`

  try {
    const message = await client.messages.create({
      model: AI_MODEL,
      max_tokens: 1200,
      messages: [{ role: 'user', content: prompt }],
    })
    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return null
    const parsed = JSON.parse(match[0])
    return {
      headline: String(parsed.headline || '').slice(0, 120),
      subheadline: String(parsed.subheadline || '').slice(0, 280),
      body: String(parsed.body || '').slice(0, 800),
      faq: Array.isArray(parsed.faq)
        ? parsed.faq.slice(0, 6).map((f: any) => ({
            q: String(f.q || '').slice(0, 160),
            a: String(f.a || '').slice(0, 500),
          }))
        : [],
      cta_headline: String(parsed.cta_headline || '').slice(0, 100),
      cta_subheadline: String(parsed.cta_subheadline || '').slice(0, 200),
      seo_title: String(parsed.seo_title || '').slice(0, 60),
      seo_description: String(parsed.seo_description || '').slice(0, 160),
      seo_keywords: String(parsed.seo_keywords || '').slice(0, 200),
    }
  } catch (err) {
    console.warn('Addon AI generate failed, using fallback:', (err as any)?.message)
    return null
  }
}

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const body = await readBody(event)
  const pageType = body?.page_type as AddonPageType
  if (!['location', 'category', 'prices'].includes(pageType)) {
    throw createError({ statusCode: 400, statusMessage: 'page_type must be location|category|prices' })
  }

  const inputs: AddonInputs = {
    title: body?.title ? String(body.title).trim() : undefined,
    city: body?.city ? String(body.city).trim() : undefined,
    category_name: body?.category_name ? String(body.category_name).trim() : undefined,
    keywords: body?.keywords ? String(body.keywords).trim() : undefined,
    notes: body?.notes ? String(body.notes).trim() : undefined,
    links: Array.isArray(body?.links)
      ? body.links.map((l: any) => String(l).trim()).filter(Boolean).slice(0, 8)
      : typeof body?.links === 'string'
        ? String(body.links)
            .split(/[\n,]/)
            .map((l) => l.trim())
            .filter(Boolean)
            .slice(0, 8)
        : [],
    photos: Array.isArray(body?.photos)
      ? body.photos.map((p: any) => String(p).trim()).filter(Boolean).slice(0, 6)
      : [],
  }

  const supabase = getSupabaseAdmin()
  const { data: user } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('auth_user_id', authUser.id)
    .single()

  if (!user?.tenant_id) {
    throw createError({ statusCode: 404, statusMessage: 'User or tenant not found' })
  }

  const { data: website } = await supabase
    .from('website_tenants')
    .select('*')
    .eq('tenant_id', user.tenant_id)
    .single()

  if (!website) {
    throw createError({ statusCode: 404, statusMessage: 'Website not found — bitte zuerst Wizard' })
  }
  if (!website.addon_pages_enabled) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Add-on-Seiten sind nicht freigeschaltet. Bitte Simy kontaktieren.',
    })
  }

  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select(
      'id, name, slug, business_type, primary_color, secondary_color, accent_color, logo_url, logo_square_url, contact_email, contact_phone, address, invoice_city, invoice_zip',
    )
    .eq('id', user.tenant_id)
    .single()

  if (tenantError || !tenant) {
    throw createError({
      statusCode: 404,
      statusMessage: tenantError?.message || 'Tenant not found',
    })
  }

  // Prefer formal_address from home page brand
  let formal: 'sie' | 'du' = body?.formal_address === 'du' ? 'du' : 'sie'
  const { data: home } = await supabase
    .from('website_pages')
    .select('blocks')
    .eq('website_id', website.id)
    .eq('is_home', true)
    .maybeSingle()
  if ((home?.blocks as any)?.brand?.formal_address === 'du') formal = 'du'
  if ((home?.blocks as any)?.brand?.formal_address === 'sie') formal = 'sie'

  const base = appBaseUrl(event)
  const bookingUrl = `${base}/booking/availability/${encodeURIComponent(tenant.slug || website.subdomain)}`

  let slug = suggestAddonSlug(pageType, inputs)
  // Ensure unique slug
  for (let i = 0; i < 5; i++) {
    const { data: clash } = await supabase
      .from('website_pages')
      .select('id')
      .eq('website_id', website.id)
      .eq('slug', slug)
      .maybeSingle()
    if (!clash) break
    slug = `${suggestAddonSlug(pageType, inputs)}-${i + 2}`
  }

  const siteUrl = `${base}/s/${encodeURIComponent(website.subdomain)}/${encodeURIComponent(slug)}`

  const aiCopy = await generateAiCopy({
    pageType,
    tenantName: tenant.name,
    businessType: tenant.business_type || 'driving_school',
    formal,
    inputs,
  })
  const copy = aiCopy || fallbackAddonCopy(pageType, tenant.name, inputs, formal)

  const landing = buildAddonPage({
    pageType,
    tenant: {
      id: tenant.id,
      name: tenant.name,
      business_type: tenant.business_type,
      primary_color: website.primary_color || tenant.primary_color,
      secondary_color: website.secondary_color || tenant.secondary_color,
      accent_color: website.accent_color || tenant.accent_color,
      logo_url: website.logo_url || tenant.logo_url || tenant.logo_square_url,
      hero_image_url: website.hero_image_url,
      contact_email: tenant.contact_email,
      contact_phone: tenant.contact_phone,
      address: tenant.address,
      city: tenant.invoice_city,
      postal_code: tenant.invoice_zip,
    },
    formal_address: formal,
    bookingUrl,
    siteUrl,
    inputs,
    copy,
  })
  ;(landing as any).templateId = `${pageType}@v1`
  ;(landing as any).pageType = pageType

  const title =
    inputs.title ||
    inputs.city ||
    inputs.category_name ||
    (pageType === 'prices' ? 'Preise' : pageType === 'location' ? 'Standort' : 'Kategorie')

  const now = new Date().toISOString()
  const { data: page, error } = await supabase
    .from('website_pages')
    .insert({
      website_id: website.id,
      title,
      slug,
      is_home: false,
      is_published: false,
      page_type: pageType,
      source_ref: body?.source_ref || null,
      addon_inputs: inputs,
      blocks: landing,
      seo_title: landing.seo.title,
      seo_description: landing.seo.description,
      seo_keywords: landing.seo.keywords,
      created_at: now,
      updated_at: now,
    })
    .select('id, slug, title, page_type, is_published, seo_title')
    .single()

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return {
    success: true,
    page,
    preview_url: `${siteUrl}?preview=1`,
    editor_url: `/admin/website/editor?page=${encodeURIComponent(slug)}`,
    ai_used: !!aiCopy,
  }
})
