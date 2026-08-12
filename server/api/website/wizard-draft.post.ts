// POST /api/website/wizard-draft — persist in-progress wizard fields (AI apply, etc.)
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

type WizardDraft = {
  serviceDescriptions?: Record<string, string>
  bio?: string
  seo_title?: string
  seo_description?: string
  seo_keywords?: string
  formal_address?: 'sie' | 'du'
  testimonials?: Array<{ id: string; author: string; text: string; rating?: number }>
  selectedTestimonials?: string[]
  updated_at?: string
}

function asStringMap(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (typeof v === 'string' && v.trim()) out[String(k)] = v
  }
  return out
}

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const body = (await readBody(event)) || {}
  const supabase = getSupabaseAdmin()

  const { data: user } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('auth_user_id', authUser.id)
    .single()

  if (!user?.tenant_id) {
    throw createError({ statusCode: 404, statusMessage: 'User or tenant not found' })
  }

  // Ensure website row exists (same as wizard init)
  let { data: website } = await supabase
    .from('website_tenants')
    .select('id, wizard_draft')
    .eq('tenant_id', user.tenant_id)
    .maybeSingle()

  if (!website) {
    const { data: tenant } = await supabase
      .from('tenants')
      .select('slug, name, primary_color, secondary_color, accent_color, logo_url')
      .eq('id', user.tenant_id)
      .single()

    const subdomain = String(tenant?.slug || tenant?.name || user.tenant_id.slice(0, 8))
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48)

    const { data: created } = await supabase
      .from('website_tenants')
      .insert({
        tenant_id: user.tenant_id,
        subdomain: subdomain || user.tenant_id.slice(0, 8),
        primary_color: tenant?.primary_color || '#0F766E',
        secondary_color: tenant?.secondary_color || '#134E4A',
        accent_color: tenant?.accent_color || '#F59E0B',
        logo_url: tenant?.logo_url || null,
        wizard_draft: {},
      })
      .select('id, wizard_draft')
      .single()

    website = created
  }

  if (!website?.id) {
    throw createError({ statusCode: 500, statusMessage: 'Website not found' })
  }

  const prev = (website.wizard_draft || {}) as WizardDraft
  const next: WizardDraft = {
    ...prev,
    updated_at: new Date().toISOString(),
  }

  if (body.serviceDescriptions && typeof body.serviceDescriptions === 'object') {
    next.serviceDescriptions = {
      ...asStringMap(prev.serviceDescriptions),
      ...asStringMap(body.serviceDescriptions),
    }
  }
  if (typeof body.bio === 'string') next.bio = body.bio
  if (typeof body.seo_title === 'string') next.seo_title = body.seo_title
  if (typeof body.seo_description === 'string') next.seo_description = body.seo_description
  if (typeof body.seo_keywords === 'string') next.seo_keywords = body.seo_keywords
  if (body.formal_address === 'du' || body.formal_address === 'sie') {
    next.formal_address = body.formal_address
  }
  if (Array.isArray(body.testimonials)) {
    next.testimonials = body.testimonials
      .filter((t: any) => t && typeof t === 'object')
      .map((t: any) => ({
        id: String(t.id || `m-${Math.random().toString(36).slice(2, 8)}`),
        author: String(t.author || '').trim() || 'Kunde',
        text: String(t.text || '').trim(),
        rating: Number(t.rating) || 5,
      }))
      .filter((t: any) => t.text.length >= 10)
      .slice(0, 8)
  }
  if (Array.isArray(body.selectedTestimonials)) {
    next.selectedTestimonials = body.selectedTestimonials.map(String)
  }

  const { error } = await supabase
    .from('website_tenants')
    .update({ wizard_draft: next, updated_at: new Date().toISOString() })
    .eq('id', website.id)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return { success: true, draft: next }
})
