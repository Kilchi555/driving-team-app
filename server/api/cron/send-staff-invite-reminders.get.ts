/**
 * Reminds pending staff invitations once, 3 days after they were created.
 * All tenants. Skips placeholder onboarding emails and expired tokens.
 *
 * Schedule: daily 08:10 UTC
 */
import { getHeader } from 'h3'
import { getSupabaseAdmin } from '~/utils/supabase'
import { sendEmail } from '~/server/utils/email'
import { logger } from '~/utils/logger'
import { logAudit } from '~/server/utils/audit'
import { getTenantTerminology } from '~/server/utils/tenant-terminology'
import {
  buildStaffInviteEmailHtml,
  isDueForStaffInviteReminder,
} from '~/server/utils/staff-invite-email'

const BASE_URL = process.env.NUXT_PUBLIC_BASE_URL || 'https://app.simy.ch'
const MAX_PER_RUN = 80

export default defineEventHandler(async (event) => {
  const startTime = Date.now()
  const authHeader = getHeader(event, 'authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    logger.warn('⚠️ Unauthorized cron attempt on send-staff-invite-reminders')
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const supabase = getSupabaseAdmin()
  const now = new Date()

  const { data: invites, error } = await supabase
    .from('staff_invitations')
    .select('id, tenant_id, first_name, last_name, email, status, invitation_token, created_at, expires_at, reminder_sent_at')
    .eq('status', 'pending')
    .is('reminder_sent_at', null)
    .gt('expires_at', now.toISOString())
    .lte('created_at', new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: true })
    .limit(MAX_PER_RUN)

  if (error) {
    logger.error('❌ send-staff-invite-reminders: fetch failed', error)
    throw createError({ statusCode: 500, statusMessage: 'Failed to load invitations' })
  }

  const due = (invites || []).filter(inv => isDueForStaffInviteReminder(inv, now))
  if (!due.length) {
    return { success: true, sent: 0, skipped: (invites || []).length, duration_ms: Date.now() - startTime }
  }

  const tenantIds = [...new Set(due.map(i => i.tenant_id).filter(Boolean))]
  const { data: tenants } = await supabase
    .from('tenants')
    .select('id, name, slug, business_type, primary_color, logo_wide_url, logo_url, logo_square_url, from_email, resend_domain_verified')
    .in('id', tenantIds)

  const tenantById = new Map((tenants || []).map(t => [t.id, t]))
  const termsByTenant = new Map<string, Awaited<ReturnType<typeof getTenantTerminology>>>()
  for (const id of tenantIds) {
    termsByTenant.set(id, await getTenantTerminology(supabase, id))
  }

  const { data: admins } = await supabase
    .from('users')
    .select('tenant_id, email')
    .in('tenant_id', tenantIds)
    .eq('role', 'admin')
    .eq('is_active', true)

  const adminEmailByTenant = new Map<string, string>()
  for (const admin of admins || []) {
    if (admin.tenant_id && admin.email && !adminEmailByTenant.has(admin.tenant_id)) {
      adminEmailByTenant.set(admin.tenant_id, admin.email)
    }
  }

  let sent = 0
  let failed = 0

  for (const inv of due) {
    const tenant = tenantById.get(inv.tenant_id)
    if (!tenant || !inv.invitation_token || !inv.email) {
      failed += 1
      continue
    }

    const terms = termsByTenant.get(inv.tenant_id)
    const tenantName = tenant.name || terms?.businessNoun || 'Simy'
    const staffLabel = terms?.staff || 'Mitarbeiter'
    const inviteLink = `${BASE_URL}/register/staff?token=${inv.invitation_token}`
    const loginUrl = tenant.slug ? `${BASE_URL}/${tenant.slug}` : BASE_URL
    const rawLogo = tenant.logo_wide_url || tenant.logo_url || tenant.logo_square_url || null
    const logoUrl = rawLogo?.startsWith('data:') ? null : rawLogo

    try {
      await sendEmail({
        to: inv.email,
        subject: `Erinnerung: Einladung als ${staffLabel} – ${tenantName}`,
        html: buildStaffInviteEmailHtml({
          firstName: inv.first_name || 'Hallo',
          tenantName,
          inviteLink,
          staffLabel,
          clientsLabel: terms?.clientsPlural,
          loginUrl,
          adminEmail: adminEmailByTenant.get(inv.tenant_id) || null,
          showDualLoginHint: false,
          primaryColor: tenant.primary_color || '#6000BD',
          logoUrl,
          isReminder: true,
        }),
        fromName: tenantName,
        fromEmail: tenant.from_email,
        domainVerified: !!tenant.resend_domain_verified,
      })

      await supabase
        .from('staff_invitations')
        .update({ reminder_sent_at: now.toISOString(), updated_at: now.toISOString() })
        .eq('id', inv.id)

      sent += 1
    } catch (emailErr: any) {
      failed += 1
      logger.warn('⚠️ staff invite reminder failed', {
        invitationId: inv.id,
        email: inv.email,
        error: emailErr?.message,
      })
    }
  }

  await logAudit({
    action: 'staff_invite_reminders_cron',
    resource_type: 'staff_invitation',
    status: 'success',
    details: { sent, failed, candidates: due.length, duration_ms: Date.now() - startTime },
  }).catch(() => {})

  logger.debug('✅ send-staff-invite-reminders', { sent, failed, candidates: due.length })
  return { success: true, sent, failed, candidates: due.length, duration_ms: Date.now() - startTime }
})
