import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const { user, tenant_id } = await getAuthenticatedUser(event)
  if (!tenant_id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const supabase = getSupabaseAdmin()

  const [
    { data: tenant },
    { count: staffCount },
    { count: studentCount },
    { count: lessonCount },
    { count: courseCount },
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
    supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenant_id),
    supabase
      .from('courses')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenant_id)
      .eq('is_active', true)
      .eq('sari_managed', false),
  ])

  const hasLogo = !!(tenant?.logo_url || tenant?.logo_square_url)
  const hasWebsite = !!tenant?.website_url
  const hasBranding = hasLogo
  const hasStaff = (staffCount ?? 0) > 0
  const hasStudent = (studentCount ?? 0) > 0
  const hasLesson = (lessonCount ?? 0) > 0
  const hasCourse = (courseCount ?? 0) > 0
  const hasPayments = !!tenant?.wallee_enabled || tenant?.wallee_onboarding_status === 'active'
  const hasEmail = !!(tenant?.from_email && tenant?.resend_domain_verified)
  const isPaid = tenant?.subscription_plan !== 'trial'

  const steps = [
    { id: 'account',  label: 'Konto erstellt',           done: true,        href: null },
    { id: 'branding', label: 'Logo hochgeladen',          done: hasBranding, href: '/admin/profile?tab=branding' },
    { id: 'staff',    label: 'Ersten Fahrlehrer hinzugefügt', done: hasStaff, href: '/admin/staff' },
    { id: 'student',  label: 'Ersten Schüler hinzugefügt',done: hasStudent,  href: '/admin/users' },
    { id: 'lesson',   label: 'Ersten Termin erstellt',    done: hasLesson,   href: '/admin/calendar' },
    { id: 'payments', label: 'Zahlungen einrichten (Wallee)', done: hasPayments, href: '/admin/profile?tab=payments' },
    { id: 'upgrade',  label: 'Plan wählen',               done: isPaid,      href: '/upgrade' },
  ]

  const completedCount = steps.filter(s => s.done).length
  const totalCount = steps.length

  // Hide checklist once all done (except upgrade) or tenant is on paid plan for > 7 days
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
  }
})
