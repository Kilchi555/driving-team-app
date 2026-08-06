import { defineEventHandler, getQuery, getHeader, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { validateEmail } from '~/server/utils/validators'
import { isReservedSlug } from '~/server/utils/reserved-slugs'

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
  const result: {
    slug?: { available: boolean; reason?: 'invalid' | 'reserved' | 'taken' }
    email?: { available: boolean; reason?: 'invalid' | 'taken' | 'admin' | 'auth' }
  } = {}

  if (slug) {
    const normalized = String(slug).toLowerCase().trim()
    // Reject obviously invalid slugs immediately — no DB round-trip
    if (!SLUG_RE.test(normalized)) {
      result.slug = { available: false, reason: 'invalid' }
    } else if (isReservedSlug(normalized)) {
      result.slug = { available: false, reason: 'reserved' }
    } else {
      const { data } = await supabase
        .from('tenants')
        .select('id')
        .eq('slug', normalized)
        .maybeSingle()
      result.slug = data
        ? { available: false, reason: 'taken' }
        : { available: true }
    }
  }

  if (email) {
    const normalized = String(email).toLowerCase().trim()
    if (!validateEmail(normalized).valid) {
      result.email = { available: false, reason: 'invalid' }
    } else {
      const [{ data: existingTenant }, { data: existingUser }] = await Promise.all([
        supabase.from('tenants').select('id').eq('contact_email', normalized).maybeSingle(),
        supabase.from('users').select('id, role').eq('email', normalized).maybeSingle()
      ])

      if (existingTenant || existingUser) {
        result.email = {
          available: false,
          reason: existingUser?.role === 'admin' ? 'admin' : 'taken',
        }
      } else {
        // Also block emails that exist only in Auth (no public.users row yet)
        let authTaken = false
        try {
          const { data: byEmail, error } = await supabase.auth.admin.getUserByEmail(normalized)
          authTaken = !error && !!byEmail?.user
        } catch {
          authTaken = false
        }
        result.email = authTaken
          ? { available: false, reason: 'auth' }
          : { available: true }
      }
    }
  }

  return result
})
