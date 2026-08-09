import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getTenantTerminology } from '~/server/utils/tenant-terminology'
import { probeBookingSlots } from '~/server/utils/booking-slot-probe'

export default defineEventHandler(async (event) => {
  const auth = await getAuthenticatedUser(event)
  if (!auth) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  const { tenant_id } = auth
  if (!tenant_id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const supabase = getSupabaseAdmin()

  const [
    { data: tenant },
    { count: staffCount },
    { count: studentCount },
    terms,
    bookingProbe,
  ] = await Promise.all([
    supabase
      .from('tenants')
      .select('logo_url, logo_square_url, website_url, wallee_enabled, wallee_onboarding_status, from_email, resend_domain_verified, primary_color, is_trial, trial_ends_at, subscription_plan, created_at')
      .eq('id', tenant_id)
      .single(),
    supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenant_id)
      .in('role', ['staff', 'instructor']),
    supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenant_id)
      .eq('role', 'client'),
    getTenantTerminology(supabase, tenant_id),
    probeBookingSlots(supabase, tenant_id, { days: 28 }),
  ])

  const hasLogo = !!(tenant?.logo_url || tenant?.logo_square_url)
  const hasBranding = hasLogo
  const hasStaff = (staffCount ?? 0) > 0
  const hasStudent = (studentCount ?? 0) > 0
  const hasBookingSlots = bookingProbe.ready
  const hasPayments = !!tenant?.wallee_enabled || tenant?.wallee_onboarding_status === 'active'
  const isPaid = tenant?.subscription_plan !== 'trial'

  const clientAccusative =
    terms.client === 'Kunde' ? 'Kunden'
    : terms.client === 'Patient' ? 'Patienten'
    : terms.client

  const steps = [
    { id: 'account',  label: 'Konto erstellt', done: true, href: null, action: null },
    { id: 'branding', label: 'Logo hochgeladen', done: hasBranding, href: '/admin/profile?tab=logos', action: null },
    { id: 'staff',    label: `Ersten ${terms.staff} hinzugefügt`, done: hasStaff, href: '/admin/users', action: null },
    {
      id: 'booking',
      label: 'Online-Buchung prüfen',
      done: hasBookingSlots,
      href: null,
      action: 'booking-readiness',
    },
    { id: 'student',  label: `Ersten ${clientAccusative} hinzugefügt`, done: hasStudent, href: '/admin/privatkunden', action: null },
    { id: 'payments', label: 'Zahlungen einrichten (Wallee)', done: hasPayments, href: '/admin/profile?tab=payments', action: null },
    { id: 'upgrade',  label: 'Plan wählen', done: isPaid, href: '/upgrade', action: null },
  ]

  const completedCount = steps.filter(s => s.done).length
  const totalCount = steps.length
  const allCoreStepsDone = steps.filter(s => s.id !== 'upgrade').every(s => s.done)

  return {
    steps,
    completedCount,
    totalCount,
    progressPercent: Math.round((completedCount / totalCount) * 100),
    allCoreStepsDone,
    isPaid,
    trialEndsAt: tenant?.trial_ends_at ?? null,
    subscriptionPlan: tenant?.subscription_plan ?? 'trial',
    bookingReady: hasBookingSlots,
    bookingSlotsFound: bookingProbe.slotsFound,
  }
})
