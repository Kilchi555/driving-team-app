// server/api/website/wizard-save.post.ts
// Build + save + optionally publish a high-converting tenant landing page

import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { buildLandingPage, type LandingService, type LandingTestimonial } from '~/server/utils/website-landing-builder'

function appBaseUrl(event: any) {
  const fromEnv = process.env.NUXT_PUBLIC_APP_URL || process.env.NUXT_PUBLIC_BASE_URL || process.env.APP_BASE_URL
  if (fromEnv) return fromEnv.replace(/\/$/, '')
  const host = getRequestHeader(event, 'x-forwarded-host') || getRequestHeader(event, 'host')
  const proto = getRequestHeader(event, 'x-forwarded-proto') || 'https'
  return host ? `${proto}://${host}` : 'https://app.simy.ch'
}

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const body = await readBody(event)
  const publish = body?.publish !== false
  const supabase = getSupabaseAdmin()

  const { data: user } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('auth_user_id', authUser.id)
    .single()

  if (!user?.tenant_id) {
    throw createError({ statusCode: 404, statusMessage: 'User or tenant not found' })
  }

  const { data: tenant } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', user.tenant_id)
    .single()

  if (!tenant) {
    throw createError({ statusCode: 404, statusMessage: 'Tenant not found' })
  }

  let { data: website } = await supabase
    .from('website_tenants')
    .select('*')
    .eq('tenant_id', user.tenant_id)
    .maybeSingle()

  if (!website) {
    const subdomain = (tenant.slug || tenant.id.slice(0, 8)).toLowerCase().replace(/[^a-z0-9-]/g, '-')
    const { data: created, error: websiteCreateError } = await supabase
      .from('website_tenants')
      .insert({
        tenant_id: user.tenant_id,
        subdomain,
        primary_color: tenant.primary_color || '#0F766E',
        secondary_color: tenant.secondary_color || '#134E4A',
        accent_color: tenant.accent_color || '#F59E0B',
        logo_url: tenant.logo_url || null,
      })
      .select()
      .single()
    if (websiteCreateError || !created) {
      throw createError({ statusCode: 500, statusMessage: websiteCreateError?.message || 'Failed to create website' })
    }
    website = created

    await supabase.from('website_pages').insert({
      website_id: website.id,
      title: 'Home',
      slug: 'index',
      is_home: true,
      blocks: [],
    })
  }

  const { data: homePage } = await supabase
    .from('website_pages')
    .select('id')
    .eq('website_id', website.id)
    .eq('is_home', true)
    .maybeSingle()

  if (!homePage) {
    throw createError({ statusCode: 404, statusMessage: 'Home page not found' })
  }

  // Services: prefer wizard payload, else load pricing + categories
  let services: LandingService[] = []
  const serviceDescriptions: Record<string, string> = body.serviceDescriptions || {}

  if (Array.isArray(body.services) && body.services.length) {
    services = body.services.map((s: any) => ({
      id: String(s.id),
      name: s.name || s.category || 'Angebot',
      description: serviceDescriptions[s.id] || s.description || '',
      duration_minutes: s.duration_minutes,
      price_cents: s.price,
      category: s.category,
    }))
  } else {
    const [{ data: pricing }, { data: categories }] = await Promise.all([
      supabase
        .from('pricing')
        .select('id, duration_minutes, price, category')
        .eq('tenant_id', user.tenant_id)
        .order('category')
        .limit(20),
      supabase
        .from('categories')
        .select('code, name')
        .eq('tenant_id', user.tenant_id)
        .eq('is_active', true),
    ])
    const catName = new Map((categories || []).map((c: any) => [c.code, c.name]))
    services = (pricing || []).map((p: any) => ({
      id: String(p.id),
      name: catName.get(p.category) || p.category || 'Angebot',
      description: serviceDescriptions[p.id] || '',
      duration_minutes: p.duration_minutes,
      price_cents: p.price,
      category: p.category,
    }))
  }

  // Testimonials
  let testimonials: LandingTestimonial[] = []
  const selectedIds: string[] = Array.isArray(body.selectedTestimonials) ? body.selectedTestimonials : []

  if (Array.isArray(body.testimonials) && body.testimonials.length) {
    testimonials = body.testimonials
      .filter((t: any) => !selectedIds.length || selectedIds.includes(t.id))
      .map((t: any) => ({
        id: String(t.id),
        author: t.author || 'Kunde',
        text: t.text || t.rating_text || '',
        rating: t.rating || 5,
      }))
  } else {
    const { data: rows } = await supabase
      .from('appointments')
      .select('id, rating, rating_text, customer_first_name, customer_last_name')
      .eq('tenant_id', user.tenant_id)
      .eq('rating', 5)
      .not('rating_text', 'is', null)
      .order('created_at', { ascending: false })
      .limit(10)
    testimonials = (rows || [])
      .filter((t: any) => !selectedIds.length || selectedIds.includes(t.id))
      .map((t: any) => ({
        id: String(t.id),
        author:
          t.customer_first_name && t.customer_last_name
            ? `${t.customer_first_name} ${t.customer_last_name}`
            : 'Kunde',
        text: t.rating_text,
        rating: t.rating || 5,
      }))
  }

  const base = appBaseUrl(event)
  const slug = tenant.slug || website.subdomain
  const bookingUrl = `${base}/booking/availability/${encodeURIComponent(slug)}`
  const siteUrl = `${base}/s/${encodeURIComponent(website.subdomain)}`

  const landing = buildLandingPage({
    tenant: {
      ...tenant,
      contact_email: body.email || tenant.contact_email,
      contact_phone: body.phone || tenant.contact_phone,
      address: body.address || tenant.address,
      name: body.name || tenant.name,
      logo_url: body.logo_url || tenant.logo_url || tenant.logo_square_url || null,
      hero_image_url: body.hero_image_url || website.hero_image_url || null,
    },
    bio: body.bio,
    seo_title: body.seo_title,
    seo_description: body.seo_description,
    seo_keywords: body.seo_keywords,
    services,
    testimonials,
    stats: body.stats || undefined,
    bookingUrl,
    siteUrl,
  })

  // Replace content blocks
  await supabase.from('website_content_blocks').delete().eq('page_id', homePage.id)

  const blockRows = landing.blocks.map((block, index) => ({
    page_id: homePage.id,
    block_type: block.type,
    block_order: index,
    content: block.content,
  }))
  if (blockRows.length) {
    const { error: blocksError } = await supabase.from('website_content_blocks').insert(blockRows)
    if (blocksError) {
      throw createError({ statusCode: 500, statusMessage: blocksError.message })
    }
  }

  const now = new Date().toISOString()
  const { error: pageError } = await supabase
    .from('website_pages')
    .update({
      title: 'Home',
      blocks: landing,
      seo_title: landing.seo.title,
      seo_description: landing.seo.description,
      seo_keywords: landing.seo.keywords,
      is_published: publish,
      published_at: publish ? now : null,
      updated_at: now,
    })
    .eq('id', homePage.id)

  if (pageError) {
    throw createError({ statusCode: 500, statusMessage: pageError.message })
  }

  const { error: websiteError } = await supabase
    .from('website_tenants')
    .update({
      seo_title: landing.seo.title,
      seo_description: landing.seo.description,
      seo_keywords: landing.seo.keywords,
      primary_color: landing.brand.primary,
      secondary_color: landing.brand.secondary,
      accent_color: landing.brand.accent,
      logo_url: landing.brand.logo_url,
      hero_image_url: landing.brand.hero_image_url,
      is_published: publish,
      last_published_at: publish ? now : website.last_published_at,
      updated_at: now,
    })
    .eq('id', website.id)

  if (websiteError) {
    throw createError({ statusCode: 500, statusMessage: websiteError.message })
  }

  return {
    success: true,
    message: publish ? 'Website veröffentlicht' : 'Website gespeichert',
    website_id: website.id,
    subdomain: website.subdomain,
    preview_url: `${siteUrl}?preview=1`,
    live_url: siteUrl,
    published: publish,
  }
})
