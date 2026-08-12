/**
 * Re-send appointment confirmation emails that were likely dropped by the
 * fire-and-forget path in appointments/save (Vercel freeze).
 *
 * Body (all optional):
 *   days?: number        — lookback window (default 3, max 14)
 *   tenantId?: string    — limit to one tenant
 *   dryRun?: boolean     — list candidates without sending
 *   limit?: number       — max appointments to process (default 100, max 200)
 *
 * Auth: staff/admin session required.
 */
import { defineEventHandler, readBody, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { dispatchAppointmentConfirmation } from '~/server/utils/dispatch-appointment-confirmation'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  await requireAdminProfile(event, ['admin', 'tenant_admin', 'super_admin', 'staff'])

  const body = (await readBody(event).catch(() => ({}))) || {}
  const days = Math.min(Math.max(Number(body.days) || 3, 1), 14)
  const limit = Math.min(Math.max(Number(body.limit) || 100, 1), 200)
  const dryRun = body.dryRun === true
  const tenantIdFilter = typeof body.tenantId === 'string' ? body.tenantId : null
  // Default: future appointments only (what customers still care about)
  const futureOnly = body.futureOnly !== false
  const sources = Array.isArray(body.sources)
    ? body.sources.map(String)
    : ['manual', 'online']

  const supabase = getSupabaseAdmin()
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  let query = supabase
    .from('appointments')
    .select(`
      id,
      created_at,
      start_time,
      source,
      tenant_id,
      user_id,
      status,
      confirmation_email_sent_at,
      confirmation_email_status,
      users!appointments_user_id_fkey (
        email,
        first_name,
        last_name,
        phone,
        onboarding_status
      ),
      tenants!appointments_tenant_id_fkey (
        name,
        booking_policy
      )
    `)
    .in('source', sources.length ? sources : ['manual', 'online'])
    .gte('created_at', since)
    .is('confirmation_email_sent_at', null)
    .not('user_id', 'is', null)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (futureOnly) {
    query = query.gte('start_time', new Date().toISOString())
  }

  if (tenantIdFilter) {
    query = query.eq('tenant_id', tenantIdFilter)
  }

  const { data: rows, error } = await query
  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  type Candidate = {
    appointmentId: string
    userId: string
    tenantId: string
    tenantName: string
    email: string
    name: string
    createdAt: string
    skipReason?: string
  }

  const candidates: Candidate[] = []

  for (const row of rows || []) {
    const user = Array.isArray(row.users) ? row.users[0] : row.users
    const tenant = Array.isArray(row.tenants) ? row.tenants[0] : row.tenants
    if (!user?.email?.trim() || !row.user_id || !row.tenant_id) continue

    const policy = ((tenant as any)?.booking_policy || {}) as Record<string, any>
    if (policy.confirmation_email_enabled === false) {
      candidates.push({
        appointmentId: row.id,
        userId: row.user_id,
        tenantId: row.tenant_id,
        tenantName: (tenant as any)?.name || '',
        email: user.email,
        name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
        createdAt: row.created_at,
        skipReason: 'policy_email_disabled',
      })
      continue
    }
    if (policy.confirmation_email_mode === 'never') {
      candidates.push({
        appointmentId: row.id,
        userId: row.user_id,
        tenantId: row.tenant_id,
        tenantName: (tenant as any)?.name || '',
        email: user.email,
        name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
        createdAt: row.created_at,
        skipReason: 'policy_mode_never',
      })
      continue
    }
    // Avoid duplicate SMS for sms_first tenants (email was intentionally skipped)
    if (policy.customer_notification_channel === 'sms_first' && user.phone) {
      candidates.push({
        appointmentId: row.id,
        userId: row.user_id,
        tenantId: row.tenant_id,
        tenantName: (tenant as any)?.name || '',
        email: user.email,
        name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
        createdAt: row.created_at,
        skipReason: 'sms_first_with_phone',
      })
      continue
    }

    candidates.push({
      appointmentId: row.id,
      userId: row.user_id,
      tenantId: row.tenant_id,
      tenantName: (tenant as any)?.name || '',
      email: user.email,
      name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
      createdAt: row.created_at,
    })
  }

  const toSend = candidates.filter((c) => !c.skipReason)

  if (dryRun) {
    return {
      dryRun: true,
      days,
      found: candidates.length,
      willSend: toSend.length,
      skipped: candidates.filter((c) => c.skipReason).length,
      candidates,
    }
  }

  const results: {
    appointmentId: string
    name: string
    email: string
    tenantName: string
    status: 'sent' | 'error' | 'skipped'
    error?: string
    skipReason?: string
  }[] = []

  for (const skipped of candidates.filter((c) => c.skipReason)) {
    results.push({
      appointmentId: skipped.appointmentId,
      name: skipped.name,
      email: skipped.email,
      tenantName: skipped.tenantName,
      status: 'skipped',
      skipReason: skipped.skipReason,
    })
  }

  for (const entry of toSend) {
    try {
      // Direct dispatch — no nested HTTP (avoids Vercel freeze / silent $fetch failures)
      const result = await dispatchAppointmentConfirmation({
        appointmentId: entry.appointmentId,
        userId: entry.userId,
        tenantId: entry.tenantId,
        skipStaffNotification: true,
      })
      const ok = !!(result.emailSent || result.emailQueued || result.smsSent || result.skipped)
      logger.info(
        `✅ Resent confirmation to ${entry.name} (${entry.email}) for appointment ${entry.appointmentId}:`,
        result.message
      )
      results.push({
        appointmentId: entry.appointmentId,
        name: entry.name,
        email: entry.email,
        tenantName: entry.tenantName,
        status: ok ? (result.skipped && !result.emailSent && !result.emailQueued && !result.smsSent ? 'skipped' : 'sent') : 'error',
        skipReason: result.skipped ? result.reason : undefined,
        error: result.error,
      })
    } catch (err: any) {
      logger.error(`❌ Failed to resend confirmation to ${entry.name}:`, err?.message)
      results.push({
        appointmentId: entry.appointmentId,
        name: entry.name,
        email: entry.email,
        tenantName: entry.tenantName,
        status: 'error',
        error: err?.message || String(err),
      })
    }
  }

  const sentCount = results.filter((r) => r.status === 'sent').length
  const errorCount = results.filter((r) => r.status === 'error').length
  const skippedCount = results.filter((r) => r.status === 'skipped').length

  return {
    message: `${sentCount} Bestätigungs-E-Mails nachgesendet, ${skippedCount} übersprungen, ${errorCount} Fehler (lookback ${days}d)`,
    days,
    sentCount,
    errorCount,
    skippedCount,
    results,
  }
})
