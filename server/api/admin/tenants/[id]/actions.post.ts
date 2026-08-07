/**
 * POST /api/admin/tenants/[id]/actions
 * Super-Admin support actions for a tenant.
 *
 * body.action:
 *  - resend_staff_invite { invitationId }
 *  - copy_invite_link { invitationId }  → renews token, returns link (no email)
 *  - extend_trial { days?: number }     → extends trial_ends_at (+ Stripe if present)
 *  - set_active { is_active: boolean }
 *  - recalc_availability { staff_id?: string }
 *  - sync_calendars { staff_id?: string, calendar_id?: string }
 *  - toggle_staff_active { staff_id: string, is_active: boolean }
 */
import { defineEventHandler, readBody, createError, getRouterParam, getHeader } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { sendEmail } from '~/server/utils/email'
import { logAudit } from '~/server/utils/audit'
import { logger } from '~/utils/logger'
import {
  buildStaffInviteEmailHtml,
  isFirstStaffOnboarding,
  isPlaceholderStaffInviteEmail,
} from '~/server/utils/staff-invite-email'
import { getTenantTerminology } from '~/server/utils/tenant-terminology'
import { syncOneExternalCalendar } from '~/server/utils/sync-external-calendars-job'

async function verifySuperAdmin(event: any) {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) throw createError({ statusCode: 401, message: 'Nicht angemeldet' })

  const supabase = getSupabaseAdmin()
  const { data: profile } = await supabase
    .from('users')
    .select('id, role, auth_user_id')
    .eq('auth_user_id', authUser.id)
    .single()

  if (!profile || profile.role !== 'super_admin') {
    throw createError({ statusCode: 403, message: 'Super-Admin-Zugriff erforderlich' })
  }
  return { authUser, profile }
}

function generateToken(): string {
  const array = new Uint8Array(24)
  crypto.getRandomValues(array)
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

function buildBaseUrl(event: any): string {
  const envBase = process.env.NUXT_PUBLIC_BASE_URL || process.env.BASE_URL
  const host = getHeader(event, 'x-forwarded-host') || getHeader(event, 'host')
  const proto = getHeader(event, 'x-forwarded-proto') || 'https'
  if (envBase) return envBase
  if (host && !host.includes('localhost')) return `${proto}://${host}`
  return 'https://app.simy.ch'
}

export default defineEventHandler(async (event) => {
  const { authUser, profile } = await verifySuperAdmin(event)
  const supabase = getSupabaseAdmin()
  const tenantId = getRouterParam(event, 'id')
  if (!tenantId) throw createError({ statusCode: 400, message: 'Tenant-ID fehlt' })

  const body = await readBody(event)
  const action = String(body?.action || '').trim()
  if (!action) throw createError({ statusCode: 400, message: 'action fehlt' })

  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('id, name, slug, business_type, trial_ends_at, is_trial, stripe_subscription_id, primary_color, from_email, resend_domain_verified')
    .eq('id', tenantId)
    .single()

  if (tenantError || !tenant) {
    throw createError({ statusCode: 404, message: 'Tenant nicht gefunden' })
  }

  const ipAddress = getHeader(event, 'x-forwarded-for')?.split(',')[0].trim() || 'unknown'

  // ── resend_staff_invite / copy_invite_link ─────────────────────────────
  if (action === 'resend_staff_invite' || action === 'copy_invite_link') {
    const invitationId = String(body?.invitationId || '').trim()
    if (!invitationId) throw createError({ statusCode: 400, message: 'invitationId fehlt' })

    const { data: invitation, error: inviteError } = await supabase
      .from('staff_invitations')
      .select('id, tenant_id, first_name, phone, email, status')
      .eq('id', invitationId)
      .eq('tenant_id', tenantId)
      .single()

    if (inviteError || !invitation) {
      throw createError({ statusCode: 404, message: 'Einladung nicht gefunden' })
    }
    if (!['pending', 'expired'].includes(invitation.status)) {
      throw createError({ statusCode: 400, message: 'Einladung kann nicht erneuert werden' })
    }

    const token = generateToken()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)

    const { error: updateError } = await supabase
      .from('staff_invitations')
      .update({
        invitation_token: token,
        expires_at: expiresAt.toISOString(),
        status: 'pending',
      })
      .eq('id', invitation.id)

    if (updateError) {
      throw createError({ statusCode: 500, message: 'Einladung konnte nicht erneuert werden' })
    }

    const baseUrl = buildBaseUrl(event)
    const inviteLink = `${baseUrl}/register/staff?token=${token}`

    await logAudit({
      action: action === 'resend_staff_invite' ? 'sa_staff_invitation_resend' : 'sa_staff_invitation_link',
      user_id: authUser.id,
      tenant_id: tenantId,
      resource_type: 'staff_invitation',
      resource_id: invitation.id,
      ip_address: ipAddress,
      status: 'success',
      details: { email: invitation.email, send_email: action === 'resend_staff_invite' },
    }).catch(() => {})

    if (action === 'copy_invite_link') {
      return { success: true, inviteLink, email: invitation.email, expires_at: expiresAt.toISOString() }
    }

    const hasRealEmail = invitation.email && !isPlaceholderStaffInviteEmail(invitation.email)
    if (!hasRealEmail) {
      return {
        success: true,
        sentVia: 'email_failed',
        inviteLink,
        message: 'Keine Staff-E-Mail hinterlegt — Link erneuert (manuell senden)',
      }
    }

    try {
      const terms = await getTenantTerminology(supabase, tenantId)
      const tenantName = tenant.name || terms.businessNoun
      const loginLink = tenant.slug ? `${baseUrl}/${tenant.slug}` : baseUrl
      const firstName = invitation.first_name || 'Hallo'
      const showDualLoginHint = await isFirstStaffOnboarding(supabase, tenantId, invitation.id)

      const { data: adminRow } = await supabase
        .from('users')
        .select('email')
        .eq('tenant_id', tenantId)
        .eq('role', 'admin')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle()

      await sendEmail({
        to: invitation.email!,
        subject: `Einladung als ${terms.staff} – ${tenantName}`,
        html: buildStaffInviteEmailHtml({
          firstName,
          tenantName,
          inviteLink,
          staffLabel: terms.staff,
          clientsLabel: terms.clientsPlural,
          loginUrl: loginLink,
          adminEmail: adminRow?.email || null,
          showDualLoginHint,
          primaryColor: tenant.primary_color || '#6000BD',
        }),
        fromName: tenantName,
        fromEmail: tenant.from_email,
        domainVerified: !!tenant.resend_domain_verified,
      })

      return {
        success: true,
        sentVia: 'email',
        inviteLink,
        email: invitation.email,
        message: 'Einladung per E-Mail erneut gesendet',
      }
    } catch (emailErr: any) {
      logger.warn('SA resend email failed:', emailErr?.message)
      return {
        success: true,
        sentVia: 'email_failed',
        inviteLink,
        email: invitation.email,
        message: 'Link erneuert, E-Mail fehlgeschlagen: ' + (emailErr?.message || 'unbekannt'),
      }
    }
  }

  // ── extend_trial ───────────────────────────────────────────────────────
  if (action === 'extend_trial') {
    const days = Math.min(90, Math.max(1, Number(body?.days) || 7))
    const base = tenant.trial_ends_at && new Date(tenant.trial_ends_at) > new Date()
      ? new Date(tenant.trial_ends_at)
      : new Date()
    base.setDate(base.getDate() + days)

    const { error: updErr } = await supabase
      .from('tenants')
      .update({
        trial_ends_at: base.toISOString(),
        is_trial: true,
        is_active: true,
      })
      .eq('id', tenantId)

    if (updErr) throw createError({ statusCode: 500, message: updErr.message })

    await logAudit({
      action: 'sa_extend_trial',
      user_id: authUser.id,
      tenant_id: tenantId,
      resource_type: 'tenant',
      resource_id: tenantId,
      ip_address: ipAddress,
      status: 'success',
      details: { days, trial_ends_at: base.toISOString(), by: profile.id },
    }).catch(() => {})

    return {
      success: true,
      trial_ends_at: base.toISOString(),
      has_stripe_subscription: !!tenant.stripe_subscription_id,
      message: `Trial um ${days} Tage verlängert (bis ${base.toLocaleDateString('de-CH')})`,
    }
  }

  // ── set_active ─────────────────────────────────────────────────────────
  if (action === 'set_active') {
    const isActive = body?.is_active === true
    const { error } = await supabase
      .from('tenants')
      .update({ is_active: isActive })
      .eq('id', tenantId)
    if (error) throw createError({ statusCode: 500, message: error.message })

    await logAudit({
      action: isActive ? 'sa_tenant_activate' : 'sa_tenant_deactivate',
      user_id: authUser.id,
      tenant_id: tenantId,
      resource_type: 'tenant',
      resource_id: tenantId,
      ip_address: ipAddress,
      status: 'success',
      details: {},
    }).catch(() => {})

    return { success: true, is_active: isActive }
  }

  // ── toggle_staff_active ────────────────────────────────────────────────
  if (action === 'toggle_staff_active') {
    const staffId = String(body?.staff_id || '').trim()
    if (!staffId) throw createError({ statusCode: 400, message: 'staff_id fehlt' })
    const isActive = body?.is_active === true

    const { data: staff, error: staffErr } = await supabase
      .from('users')
      .select('id, role, first_name, last_name')
      .eq('id', staffId)
      .eq('tenant_id', tenantId)
      .eq('role', 'staff')
      .is('deleted_at', null)
      .single()

    if (staffErr || !staff) {
      throw createError({ statusCode: 404, message: 'Staff nicht gefunden' })
    }

    const { error } = await supabase
      .from('users')
      .update({ is_active: isActive })
      .eq('id', staffId)
      .eq('tenant_id', tenantId)

    if (error) throw createError({ statusCode: 500, message: error.message })

    await logAudit({
      action: isActive ? 'sa_staff_activate' : 'sa_staff_deactivate',
      user_id: authUser.id,
      tenant_id: tenantId,
      resource_type: 'user',
      resource_id: staffId,
      ip_address: ipAddress,
      status: 'success',
      details: { name: `${staff.first_name || ''} ${staff.last_name || ''}`.trim() },
    }).catch(() => {})

    return {
      success: true,
      staff_id: staffId,
      is_active: isActive,
      message: isActive ? 'Staff aktiviert' : 'Staff deaktiviert',
    }
  }

  // ── recalc_availability ────────────────────────────────────────────────
  if (action === 'recalc_availability') {
    const staffIdFilter = body?.staff_id ? String(body.staff_id).trim() : null

    let staffIds: string[] = []
    if (staffIdFilter) {
      const { data: staff } = await supabase
        .from('users')
        .select('id')
        .eq('id', staffIdFilter)
        .eq('tenant_id', tenantId)
        .eq('role', 'staff')
        .is('deleted_at', null)
        .maybeSingle()
      if (!staff) throw createError({ statusCode: 404, message: 'Staff nicht gefunden' })
      staffIds = [staff.id]
    } else {
      const { data: staffRows } = await supabase
        .from('users')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('role', 'staff')
        .eq('is_active', true)
        .is('deleted_at', null)
      staffIds = (staffRows || []).map((s) => s.id)
    }

    if (staffIds.length === 0) {
      return { success: true, queued: 0, message: 'Kein Staff zum Recalc' }
    }

    const now = new Date().toISOString()
    const rows = staffIds.map((staff_id) => ({
      staff_id,
      tenant_id: tenantId,
      trigger: 'settings_change' as const,
      queued_at: now,
      processed: false,
    }))

    const { error: queueError } = await supabase
      .from('availability_recalc_queue')
      .upsert(rows, { onConflict: 'staff_id,tenant_id' })

    if (queueError) {
      throw createError({ statusCode: 500, message: queueError.message })
    }

    const cronSecret = process.env.CRON_SECRET
    $fetch('/api/cron/process-recalc-queue', {
      method: 'GET',
      headers: cronSecret && cronSecret.trim() !== ''
        ? { 'Content-Type': 'application/json', Authorization: `Bearer ${cronSecret}` }
        : { 'Content-Type': 'application/json' },
    }).catch((err: any) => {
      logger.warn('SA recalc background cron failed:', err?.message)
    })

    await logAudit({
      action: 'sa_recalc_availability',
      user_id: authUser.id,
      tenant_id: tenantId,
      resource_type: 'tenant',
      resource_id: tenantId,
      ip_address: ipAddress,
      status: 'success',
      details: { staff_ids: staffIds, count: staffIds.length },
    }).catch(() => {})

    return {
      success: true,
      queued: staffIds.length,
      message: `${staffIds.length} Staff für Recalc eingereiht`,
    }
  }

  // ── sync_calendars ─────────────────────────────────────────────────────
  if (action === 'sync_calendars') {
    const staffIdFilter = body?.staff_id ? String(body.staff_id).trim() : null
    const calendarIdFilter = body?.calendar_id ? String(body.calendar_id).trim() : null

    let query = supabase
      .from('external_calendars')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('sync_enabled', true)

    if (calendarIdFilter) query = query.eq('id', calendarIdFilter)
    if (staffIdFilter) query = query.eq('staff_id', staffIdFilter)

    const { data: calendars, error: calErr } = await query
    if (calErr) throw createError({ statusCode: 500, message: calErr.message })
    if (!calendars?.length) {
      return { success: true, synced: 0, failed: 0, skipped: 0, message: 'Keine Kalender zum Sync' }
    }

    // Force retry: clear backoff so SA can re-test broken calendars
    const calIds = calendars.map((c) => c.id)
    await supabase
      .from('external_calendars')
      .update({
        consecutive_failures: 0,
        last_failure_at: null,
      })
      .in('id', calIds)

    const anonymizeCache = new Map<string, boolean>()
    const results = {
      synced: 0,
      failed: 0,
      skipped: 0,
      details: [] as Array<{ id: string; status: string; error?: string; events?: number }>,
    }

    for (const calendar of calendars) {
      const calForSync = {
        ...calendar,
        consecutive_failures: 0,
        last_failure_at: null,
      }
      const result = await syncOneExternalCalendar(supabase, calForSync, anonymizeCache, {
        notifyOnFailure: false,
      })
      if (result.status === 'synced') {
        results.synced += 1
        results.details.push({ id: calendar.id, status: 'synced', events: result.events })
      } else if (result.status === 'failed') {
        results.failed += 1
        results.details.push({ id: calendar.id, status: 'failed', error: result.error })
      } else {
        results.skipped += 1
        results.details.push({ id: calendar.id, status: 'skipped', error: result.reason })
      }
    }

    await logAudit({
      action: 'sa_sync_calendars',
      user_id: authUser.id,
      tenant_id: tenantId,
      resource_type: 'tenant',
      resource_id: tenantId,
      ip_address: ipAddress,
      status: 'success',
      details: {
        synced: results.synced,
        failed: results.failed,
        skipped: results.skipped,
        staff_id: staffIdFilter,
        calendar_id: calendarIdFilter,
      },
    }).catch(() => {})

    return {
      success: true,
      ...results,
      message: `Sync: ${results.synced} ok, ${results.failed} fehlgeschlagen, ${results.skipped} übersprungen`,
    }
  }

  throw createError({ statusCode: 400, message: `Unbekannte action: ${action}` })
})
