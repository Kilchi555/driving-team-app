/**
 * GET /api/admin/tenants/[id]
 * Super-Admin tenant detail: health, billing, invites, SMS usage.
 */
import { defineEventHandler, createError, getRouterParam } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getTenantSmsQuotaSnapshot } from '~/server/utils/sms-quota'
import { logger } from '~/utils/logger'

async function verifySuperAdmin(event: any) {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) throw createError({ statusCode: 401, message: 'Nicht angemeldet' })

  const supabase = getSupabaseAdmin()
  const { data: profile } = await supabase
    .from('users')
    .select('id, role')
    .eq('auth_user_id', authUser.id)
    .single()

  if (!profile || profile.role !== 'super_admin') {
    throw createError({ statusCode: 403, message: 'Super-Admin-Zugriff erforderlich' })
  }
  return profile
}

export default defineEventHandler(async (event) => {
  await verifySuperAdmin(event)
  const supabase = getSupabaseAdmin()
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Tenant-ID fehlt' })

  const { data: tenant, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !tenant) {
    throw createError({ statusCode: 404, message: 'Tenant nicht gefunden' })
  }

  const [
    adminsRes,
    staffRes,
    clientsRes,
    invitesRes,
    apptsTotalRes,
    apptsFutureRes,
    smsSnapshot,
  ] = await Promise.all([
    supabase
      .from('users')
      .select('id, first_name, last_name, email, phone, role, is_active, created_at')
      .eq('tenant_id', id)
      .eq('role', 'admin')
      .is('deleted_at', null)
      .order('created_at', { ascending: true }),
    supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', id)
      .eq('role', 'staff')
      .eq('is_active', true)
      .is('deleted_at', null),
    supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', id)
      .eq('role', 'client')
      .eq('is_active', true)
      .is('deleted_at', null),
    supabase
      .from('staff_invitations')
      .select('id, first_name, last_name, phone, email, status, expires_at, created_at, invitation_token')
      .eq('tenant_id', id)
      .in('status', ['pending', 'expired'])
      .order('created_at', { ascending: false }),
    supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', id),
    supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', id)
      .gte('start_time', new Date().toISOString()),
    getTenantSmsQuotaSnapshot(supabase, id).catch((err) => {
      logger.warn('SMS quota snapshot failed:', err?.message)
      return null
    }),
  ])

  const pendingInvites = (invitesRes.data || []).filter((i) => i.status === 'pending')

  return {
    success: true,
    tenant,
    health: {
      admin_count: adminsRes.data?.length || 0,
      staff_count: staffRes.count || 0,
      client_count: clientsRes.count || 0,
      pending_invites: pendingInvites.length,
      appointments_total: apptsTotalRes.count || 0,
      appointments_future: apptsFutureRes.count || 0,
    },
    admins: adminsRes.data || [],
    invites: (invitesRes.data || []).map(({ invitation_token, ...rest }) => ({
      ...rest,
      // Never expose full token in list — only whether a link can be rebuilt server-side
      has_token: !!invitation_token,
    })),
    sms: smsSnapshot,
    billing: {
      subscription_plan: tenant.subscription_plan,
      subscription_status: tenant.subscription_status,
      is_trial: tenant.is_trial,
      is_active: tenant.is_active,
      trial_ends_at: tenant.trial_ends_at,
      current_period_end: tenant.current_period_end,
      subscription_cancel_at: tenant.subscription_cancel_at,
      stripe_customer_id: tenant.stripe_customer_id,
      stripe_subscription_id: tenant.stripe_subscription_id,
      addon_seats: tenant.addon_seats || 0,
      addon_courses_enabled: !!tenant.addon_courses_enabled,
      addon_affiliate_enabled: !!tenant.addon_affiliate_enabled,
      addon_gbp_enabled: !!tenant.addon_gbp_enabled,
      customer_number: tenant.customer_number,
    },
    payments: {
      wallee_onboarding_status: tenant.wallee_onboarding_status,
      wallee_enabled: !!tenant.wallee_enabled,
      wallee_test_mode: !!tenant.wallee_test_mode,
      wallee_space_id: tenant.wallee_space_id,
      wallee_uid_number: tenant.wallee_uid_number,
      wallee_iban: tenant.wallee_iban,
    },
    comms: {
      contact_email: tenant.contact_email,
      contact_phone: tenant.contact_phone,
      twilio_from_sender: tenant.twilio_from_sender,
      from_email: tenant.from_email,
      resend_domain_verified: !!tenant.resend_domain_verified,
      contact_person_first_name: tenant.contact_person_first_name,
      contact_person_last_name: tenant.contact_person_last_name,
    },
  }
})
