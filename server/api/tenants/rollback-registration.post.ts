// server/api/tenants/rollback-registration.post.ts
// Called by the frontend when create-admin fails after a successful tenant insert.
// Deletes the orphaned tenant so the slug becomes available again.
import { defineEventHandler, createError, readBody, getHeader } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { verifyRegistrationToken } from '~/server/utils/registration-token'

export default defineEventHandler(async (event) => {
  const ipAddress =
    getHeader(event, 'x-forwarded-for')?.split(',')[0].trim() ||
    getHeader(event, 'x-real-ip') ||
    event.node.req.socket.remoteAddress ||
    'unknown'

  // Rate limit: 10 rollback attempts per IP per hour
  const rateLimit = await checkRateLimit(ipAddress, 'rollback_registration', 10, 3600)
  if (!rateLimit.allowed) {
    throw createError({ statusCode: 429, statusMessage: 'Zu viele Anfragen. Bitte warten.' })
  }

  const body = await readBody(event)
  const tenantId = body?.tenant_id as string | undefined
  const registrationToken = body?.registration_token as string | undefined

  if (!tenantId || typeof tenantId !== 'string' || !/^[0-9a-f-]{36}$/.test(tenantId)) {
    throw createError({ statusCode: 400, statusMessage: 'Ungültige tenant_id' })
  }

  // ✅ Verify the short-lived registration token
  if (!verifyRegistrationToken(registrationToken, tenantId)) {
    throw createError({ statusCode: 403, statusMessage: 'Ungültiger oder abgelaufener Registrierungstoken' })
  }

  const supabase = getSupabaseAdmin()

  // Only allow deleting tenants that were just created and have no users yet
  const { data: tenant, error: fetchErr } = await supabase
    .from('tenants')
    .select('id, created_at, subscription_plan')
    .eq('id', tenantId)
    .single()

  if (fetchErr || !tenant) {
    // Already gone or not found — treat as success
    return { success: true }
  }

  // Safety guard: only delete if tenant is in trial/initial state and very recently created (< 10 min)
  const createdAt = new Date(tenant.created_at).getTime()
  const ageMs = Date.now() - createdAt
  const tenMinutes = 10 * 60 * 1000

  if (ageMs > tenMinutes) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Rollback nicht mehr möglich (Tenant zu alt)'
    })
  }

  // Check that no users exist for this tenant (extra safety)
  const { count } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)

  if ((count ?? 0) > 0) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Tenant hat bereits Benutzer – Rollback nicht möglich'
    })
  }

  const { error: deleteErr } = await supabase
    .from('tenants')
    .delete()
    .eq('id', tenantId)

  if (deleteErr) {
    console.error('❌ Rollback failed:', deleteErr)
    throw createError({ statusCode: 500, statusMessage: 'Rollback fehlgeschlagen' })
  }

  console.log(`🔄 Tenant ${tenantId} rolled back (orphaned registration cleanup)`)
  return { success: true }
})
