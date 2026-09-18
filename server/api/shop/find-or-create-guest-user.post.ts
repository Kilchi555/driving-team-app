import { defineEventHandler, readBody, createError, getHeader } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { sanitizeString, validateEmail, validateUUID } from '~/server/utils/validators'
import { getAuthenticatedUserWithDbId } from '~/server/utils/auth'
import { publicShopSessionPrincipalId } from '~/server/utils/shop-public-identity'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  // Use admin client to avoid RLS visibility issues for guest lookup/create.
  const supabase = getSupabaseAdmin()

  try {
    const ipAddress = getHeader(event, 'x-forwarded-for')?.split(',')[0].trim() ||
      getHeader(event, 'x-real-ip') ||
      event.node.req.socket.remoteAddress ||
      'unknown'

    const body = await readBody(event)

    if (!body || typeof body !== 'object') {
      throw createError({ statusCode: 400, message: 'Ungültiger Request-Body' })
    }

    const tenantId = sanitizeString((body as any).tenant_id, 64)
    const emailRaw = sanitizeString((body as any).email, 255).toLowerCase()
    const firstName = sanitizeString((body as any).first_name, 100)
    const lastName = sanitizeString((body as any).last_name, 100)
    const phone = sanitizeString((body as any).phone, 40)
    const street = sanitizeString((body as any).street, 255)
    const streetNumber = sanitizeString((body as any).street_number, 20)
    const zip = sanitizeString((body as any).zip, 20)
    const city = sanitizeString((body as any).city, 120)

    const rateLimit = await checkRateLimit(
      ipAddress,
      'shop_find_or_create_guest_user',
      20,
      5 * 60 * 1000,
      emailRaw || undefined,
      tenantId || undefined
    )
    if (!rateLimit.allowed) {
      throw createError({
        statusCode: 429,
        message: 'Zu viele Anfragen. Bitte versuchen Sie es in wenigen Minuten erneut.'
      })
    }

    if (!tenantId) {
      throw createError({ statusCode: 400, message: 'tenant_id ist erforderlich' })
    }
    if (!validateUUID(tenantId).valid) {
      throw createError({ statusCode: 400, message: 'tenant_id ist ungültig' })
    }
    if (!emailRaw) {
      throw createError({ statusCode: 400, message: 'email ist erforderlich' })
    }
    if (!validateEmail(emailRaw).valid) {
      throw createError({ statusCode: 400, message: 'email ist ungültig' })
    }

    const normalizedEmail = emailRaw

    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, is_active')
      .eq('id', tenantId)
      .maybeSingle()

    if (tenantError) {
      logger.error('❌ find-or-create-guest-user: Tenant validation error:', tenantError)
      throw createError({ statusCode: 500, message: 'Fehler bei Tenant-Validierung' })
    }
    if (!tenant || tenant.is_active === false) {
      throw createError({ statusCode: 400, message: 'Ungültiger oder inaktiver Tenant' })
    }

    const sessionUser = await getAuthenticatedUserWithDbId(event)
    const sessionPrincipalId = publicShopSessionPrincipalId(sessionUser, tenantId)
    if (sessionPrincipalId) {
      return { data: { id: sessionPrincipalId, created: false } }
    }

    // Contact match is discovery only — never return or mutate an existing account.
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('email', normalizedEmail)
      .maybeSingle()

    if (existingUser?.id) {
      logger.debug('ℹ️ find-or-create-guest-user: existing account is discovery-only', {
        email: normalizedEmail,
      })
      return { data: { id: null, created: false } }
    }

    // Create new guest user
    const userId = crypto.randomUUID()

    const { error: insertError } = await supabase
      .from('users')
      .insert({
        id: userId,
        auth_user_id: null,
        tenant_id: tenantId,
        first_name: firstName || '',
        last_name: lastName || '',
        email: normalizedEmail,
        phone: phone || '',
        street: street || null,
        street_nr: streetNumber || null,
        zip: zip || null,
        city: city || null,
        role: 'client',
        is_active: false,
        onboarding_status: 'pending'
      })

    if (insertError) {
      // Duplicate email must not attach the existing account.
      if (insertError.code === '23505') {
        logger.debug('ℹ️ find-or-create-guest-user: unique conflict is fail-closed', {
          email: normalizedEmail,
        })
        return { data: { id: null, created: false } }
      }

      logger.error('❌ find-or-create-guest-user: Insert error:', insertError)
      throw createError({ statusCode: 500, message: 'Fehler beim Erstellen des Gastbenutzers' })
    }

    logger.debug('✅ New guest user created:', { id: userId, email: normalizedEmail })
    return { data: { id: userId, created: true } }

  } catch (error: any) {
    if (error.statusCode) throw error
    logger.error('❌ find-or-create-guest-user error:', error)
    throw createError({ statusCode: 500, message: 'Interner Fehler' })
  }
})
