// server/api/admin/courses/refund-preview.post.ts
// Returns the refund calculation for a course enrollment (for admin preview before removal)

import { defineEventHandler, readBody, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'

/**
 * POST /api/admin/courses/refund-preview
 *
 * Body: { enrollmentId: string }
 *
 * Returns:
 *   - paymentStatus: string (completed / pending / cash / none)
 *   - totalPaidChf: number
 *   - walleeCapturedChf: number (amount Wallee actually captured = total - credit)
 *   - refundPercentage: number (0–100 based on applicable policy)
 *   - refundAmountChf: number
 *   - policyName: string | null
 *   - policyDescription: string | null
 *   - hoursUntilCourse: number
 *   - canRefundViaWallee: boolean
 */
export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const { enrollmentId } = await readBody(event) as { enrollmentId: string }

  if (!enrollmentId) throw createError({ statusCode: 400, statusMessage: 'Missing enrollmentId' })

  const supabase = getSupabaseAdmin()

  // Load enrollment with course sessions and payment
  const { data: reg, error: regError } = await supabase
    .from('course_registrations')
    .select(`
      id,
      payment_id,
      courses!inner(
        id,
        tenant_id,
        course_sessions(start_time, session_number)
      )
    `)
    .eq('id', enrollmentId)
    .single()

  if (regError || !reg) throw createError({ statusCode: 404, statusMessage: 'Registration not found' })

  const course = reg.courses as any
  if (course?.tenant_id !== profile.tenant_id) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  // Find the first session start time as the policy anchor
  const sessions: any[] = course.course_sessions || []
  const firstSession = sessions
    .filter((s: any) => s.start_time)
    .sort((a: any, b: any) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())[0]

  const courseStartTime = firstSession?.start_time ? new Date(firstSession.start_time) : null
  const now = new Date()
  const hoursUntilCourse = courseStartTime
    ? (courseStartTime.getTime() - now.getTime()) / (1000 * 60 * 60)
    : null

  // Load payment
  let payment: any = null
  if (reg.payment_id) {
    const { data: paymentData } = await supabase
      .from('payments')
      .select('id, payment_status, total_amount_rappen, credit_used_rappen, wallee_transaction_id, tenant_id')
      .eq('id', reg.payment_id)
      .single()
    payment = paymentData
  }

  if (!payment) {
    // Also try reverse lookup
    const { data: paymentData } = await supabase
      .from('payments')
      .select('id, payment_status, total_amount_rappen, credit_used_rappen, wallee_transaction_id, tenant_id')
      .eq('course_registration_id', enrollmentId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    payment = paymentData
  }

  // Load applicable courses cancellation policy for this tenant
  const { data: policy } = await supabase
    .from('cancellation_policies')
    .select(`*, rules:cancellation_rules(*)`)
    .or(`tenant_id.eq.${profile.tenant_id},tenant_id.is.null`)
    .eq('is_active', true)
    .eq('applies_to', 'courses')
    .order('tenant_id', { ascending: false })
    .order('is_default', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Calculate refund percentage from policy
  let refundPercentage = 100 // default: full refund
  let policyName: string | null = null
  let policyDescription: string | null = null

  if (policy && policy.rules && hoursUntilCourse !== null) {
    policyName = policy.name
    const rules: any[] = policy.rules || []

    // Sort rules: more_than rules descending (highest hours first)
    const applicableRule = rules.find((rule: any) => {
      const compType = rule.comparison_type || 'more_than'
      if (compType === 'more_than') {
        return hoursUntilCourse >= rule.hours_before_appointment
      } else {
        return hoursUntilCourse <= rule.hours_before_appointment
      }
    }) || rules[rules.length - 1]

    if (applicableRule) {
      // Policy stores charge_percentage (what we KEEP), so refund = 100 - charge
      const chargePercentage = applicableRule.charge_percentage ?? 0
      refundPercentage = 100 - chargePercentage
      policyDescription = applicableRule.description
        || `${refundPercentage}% Rückerstattung (${chargePercentage}% Gebühr)`
    }
  } else if (!policy && hoursUntilCourse !== null) {
    // No course policy configured → fall back to 100% refund (admin decides manually)
    refundPercentage = 100
    policyDescription = 'Keine Stornierungsrichtlinie für Kurse konfiguriert — 100% wird angenommen'
  }

  // Calculate amounts
  const totalPaidRappen = payment?.total_amount_rappen ?? 0
  const creditUsedRappen = payment?.credit_used_rappen ?? 0
  const walleeCapturedRappen = Math.round(
    Math.round((totalPaidRappen - creditUsedRappen) / 5) * 5
  )
  const refundAmountRappen = Math.round(totalPaidRappen * refundPercentage / 100)
  const walleeRefundAmountRappen = Math.min(refundAmountRappen, walleeCapturedRappen)
  const creditRefundAmountRappen = refundAmountRappen - walleeRefundAmountRappen

  const canRefundViaWallee =
    payment?.payment_status === 'completed' &&
    !!payment?.wallee_transaction_id &&
    walleeCapturedRappen > 0 &&
    !!payment?.tenant_id  // tenant_id required to load Wallee config

  const refundBlockedReason: string | null = (() => {
    if (!payment) return null
    if (payment.payment_status !== 'completed') return `Zahlung ist nicht abgeschlossen (Status: ${payment.payment_status})`
    if (!payment.tenant_id) return 'Keine Tenant-ID für diese Zahlung — manuelle Rückerstattung via Wallee-Dashboard erforderlich'
    if (!payment.wallee_transaction_id) return 'Keine Wallee Transaction ID gefunden — manuelle Rückerstattung via Wallee-Dashboard erforderlich'
    if (walleeCapturedRappen <= 0) return 'Betrag wurde vollständig mit Guthaben bezahlt — keine Wallee-Rückerstattung möglich'
    return null
  })()

  logger.debug('🔍 [Refund Preview]', {
    enrollmentId,
    hoursUntilCourse: hoursUntilCourse?.toFixed(1),
    refundPercentage,
    totalPaidChf: totalPaidRappen / 100,
    walleeCapturedChf: walleeCapturedRappen / 100,
    refundAmountChf: refundAmountRappen / 100,
    canRefundViaWallee,
  })

  return {
    success: true,
    payment: payment
      ? {
          id: payment.id,
          status: payment.payment_status,
          totalPaidChf: totalPaidRappen / 100,
          creditUsedChf: creditUsedRappen / 100,
          walleeCapturedChf: walleeCapturedRappen / 100,
          hasTenantId: !!payment.tenant_id,
        }
      : null,
    hoursUntilCourse,
    courseStartDate: courseStartTime?.toISOString() ?? null,
    policyName,
    policyDescription,
    refundPercentage,
    refundAmountChf: refundAmountRappen / 100,
    walleeRefundAmountChf: walleeRefundAmountRappen / 100,
    creditRefundAmountChf: creditRefundAmountRappen / 100,
    canRefundViaWallee,
    refundBlockedReason,
  }
})
