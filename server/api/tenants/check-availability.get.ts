import { defineEventHandler, getQuery, getHeader, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { validateEmail } from '~/server/utils/validators'

const SLUG_RE = /^[a-z0-9-]{3,50}$/

export default defineEventHandler(async (event) => {
  const ipAddress =
    getHeader(event, 'x-forwarded-for')?.split(',')[0].trim() ||
    getHeader(event, 'x-real-ip') ||
    event.node.req.socket.remoteAddress ||
    'unknown'

  // Rate limit: 60 availability checks per IP per minute
  const rateLimit = await checkRateLimit(ipAddress, 'check_availability', 60, 60)
  if (!rateLimit.allowed) {
    throw createError({ statusCode: 429, statusMessage: 'Zu viele Anfragen. Bitte warten.' })
  }

  const { slug, email } = getQuery(event) as { slug?: string; email?: string }

  if (!slug && !email) {
    throw createError({ statusCode: 400, statusMessage: 'slug oder email erforderlich' })
  }

  const supabase = getSupabaseAdmin()
  const result: { slug?: { available: boolean }; email?: { available: boolean } } = {}

  if (slug) {
    const normalized = String(slug).toLowerCase().trim()
    // Reject obviously invalid slugs immediately — no DB round-trip
    if (!SLUG_RE.test(normalized)) {
      result.slug = { available: false }
    } else {
      const { data } = await supabase
        .from('tenants')
        .select('id')
        .eq('slug', normalized)
        .maybeSingle()
      result.slug = { available: !data }
    }
  }

  if (email) {
    const normalized = String(email).toLowerCase().trim()
    if (!validateEmail(normalized).valid) {
      result.email = { available: false }
    } else {
      // Only check if the email is already used as a tenant contact email.
      // Cross-tenant and cross-role user existence is allowed — the definitive
      // role+tenant-scoped check happens in each registration backend.
      const { data: existingTenant } = await supabase
        .from('tenants')
        .select('id')
        .eq('contact_email', normalized)
        .maybeSingle()
      result.email = { available: !existingTenant }
    }
  }

  return result
})
