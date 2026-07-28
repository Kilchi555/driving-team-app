// server/utils/wallee-failure-notify.ts
//
// Shared logic for handling a genuine Wallee payment failure (card declined,
// checkout cancelled at Wallee, etc.) for guest course-enrollment payments.
//
// This is called from THREE places that can each be first to observe a
// failure, depending on timing/network conditions:
//   1. server/api/wallee/webhook.post.ts        — real-time webhook (fastest path)
//   2. server/api/cron/recover-pending-wallee-payments.get.ts Phase 1 — polls
//      Wallee directly for stale 'pending' payments when the webhook never arrived
//   3. .../recover-pending-wallee-payments.get.ts Phase 3 — resets stale
//      'failed' rows back to 'pending' so the pay button isn't blocked
//
// It is idempotent (guarded by `metadata.wallee_failure_state`) so no matter
// which of the three call sites reaches a given payment first, staff and the
// customer are each notified exactly once.
//
// Sibling-success guard: if the customer already paid successfully for the
// same course (retry created a second payment row), we still tag the failed
// attempt but do NOT email staff/customer.

import { logger } from '~/utils/logger'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

type PaymentMeta = {
  course_id?: string
  course_name?: string
  email?: string
  phone?: string
  firstname?: string
  lastname?: string
  [key: string]: any
}

function normalizeEmail(email: string | null | undefined): string | null {
  const trimmed = String(email || '').trim().toLowerCase()
  return trimmed || null
}

/**
 * Returns true when the customer already has a successful payment or a
 * confirmed/paid registration for the same course (typical retry after decline).
 */
export async function hasSuccessfulSiblingCourseEnrollment(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  payment: {
    id: string
    tenant_id: string
    user_id?: string | null
    metadata?: PaymentMeta | null
  }
): Promise<boolean> {
  const meta = payment.metadata || {}
  const courseId = meta.course_id
  if (!courseId) return false

  const email = normalizeEmail(meta.email)

  // 1) Completed sibling payment for same course + same email / user
  const { data: siblingPayments, error: payErr } = await supabase
    .from('payments')
    .select('id, user_id, metadata')
    .eq('tenant_id', payment.tenant_id)
    .eq('payment_status', 'completed')
    .neq('id', payment.id)
    .contains('metadata', { course_id: courseId })
    .limit(20)

  if (payErr) {
    logger.warn(`⚠️ hasSuccessfulSiblingCourseEnrollment payment lookup failed:`, payErr.message)
  } else {
    const hit = (siblingPayments || []).some((p: any) => {
      const pMeta = p.metadata || {}
      if (payment.user_id && p.user_id && payment.user_id === p.user_id) return true
      if (email && normalizeEmail(pMeta.email) === email) return true
      return false
    })
    if (hit) return true
  }

  // 2) Confirmed/paid course registration for same course + email/user
  const { data: regs, error: regErr } = await supabase
    .from('course_registrations')
    .select('id, user_id, email, status, payment_status')
    .eq('course_id', courseId)
    .eq('payment_status', 'paid')
    .limit(50)

  if (regErr) {
    logger.warn(`⚠️ hasSuccessfulSiblingCourseEnrollment registration lookup failed:`, regErr.message)
    return false
  }

  return (regs || []).some((r: any) => {
    if (payment.user_id && r.user_id === payment.user_id) return true
    if (email && normalizeEmail(r.email) === email) return true
    return false
  })
}

/**
 * After a successful course payment, cancel leftover guest/retry attempts for
 * the same course + email/user so recover-cron does not later notify "unpaid".
 */
export async function cancelOrphanedSiblingCoursePayments(opts: {
  successfulPaymentId: string
  tenantId: string
  courseId: string
  email?: string | null
  userId?: string | null
}): Promise<number> {
  const { successfulPaymentId, tenantId, courseId, userId } = opts
  const email = normalizeEmail(opts.email)
  if (!courseId || (!email && !userId)) return 0

  const supabase = getSupabaseAdmin()

  const { data: candidates, error } = await supabase
    .from('payments')
    .select('id, user_id, payment_status, metadata, course_registration_id, appointment_id')
    .eq('tenant_id', tenantId)
    .in('payment_status', ['pending', 'failed', 'processing'])
    .neq('id', successfulPaymentId)
    .contains('metadata', { course_id: courseId })
    .limit(100)

  if (error) {
    logger.warn(`⚠️ cancelOrphanedSiblingCoursePayments lookup failed:`, error.message)
    return 0
  }

  const orphanIds = (candidates || [])
    .filter((p: any) => {
      if (p.appointment_id) return false
      if (p.course_registration_id) return false
      const pMeta = p.metadata || {}
      if (pMeta.course_id !== courseId) return false
      if (userId && p.user_id && p.user_id === userId) return true
      if (email && normalizeEmail(pMeta.email) === email) return true
      // Guest orphan: no user_id, same course+email in metadata
      if (!p.user_id && email && normalizeEmail(pMeta.email) === email) return true
      return false
    })
    .map((p: any) => p.id)

  if (orphanIds.length === 0) return 0

  let cancelled = 0
  for (const orphanId of orphanIds) {
    const orphan = (candidates || []).find((p: any) => p.id === orphanId)
    const { error: rowErr } = await supabase
      .from('payments')
      .update({
        payment_status: 'cancelled',
        notes: `Automatisch storniert: ersetzt durch erfolgreiche Zahlung ${successfulPaymentId}`,
        updated_at: new Date().toISOString(),
        metadata: {
          ...(orphan?.metadata || {}),
          replaced_by_payment_id: successfulPaymentId,
          replaced_at: new Date().toISOString()
        }
      })
      .eq('id', orphanId)
      .in('payment_status', ['pending', 'failed', 'processing'])

    if (!rowErr) cancelled++
    else logger.warn(`⚠️ Could not cancel orphan payment ${orphanId}:`, rowErr.message)
  }

  if (cancelled > 0) {
    logger.info(`🧹 Cancelled ${cancelled} orphaned course payment(s) after success ${successfulPaymentId}`)
  }
  return cancelled
}

export async function notifyGenuineWalleeFailure(paymentId: string, walleeState: string) {
  const supabase = getSupabaseAdmin()

  const { data: payment, error } = await supabase
    .from('payments')
    .select('id, tenant_id, user_id, total_amount_rappen, metadata, created_at')
    .eq('id', paymentId)
    .single()

  if (error || !payment) {
    logger.warn(`⚠️ notifyGenuineWalleeFailure: could not load payment ${paymentId}:`, error?.message)
    return
  }

  // Already tagged/notified for this payment — nothing to do.
  if (payment.metadata?.wallee_failure_state) return

  const meta = payment.metadata || {}
  const siblingSuccess = meta.course_id
    ? await hasSuccessfulSiblingCourseEnrollment(supabase, payment)
    : false

  const updatedMetadata = {
    ...meta,
    wallee_failure_state: walleeState,
    wallee_failure_detected_at: new Date().toISOString(),
    ...(siblingSuccess
      ? {
          failure_notify_suppressed: true,
          failure_notify_suppressed_reason: 'sibling_course_payment_succeeded'
        }
      : {})
  }

  try {
    await supabase
      .from('payments')
      .update({ metadata: updatedMetadata })
      .eq('id', payment.id)
  } catch (e: any) {
    logger.warn(`⚠️ Could not tag genuine Wallee failure on payment ${payment.id}:`, e.message)
  }

  // Customer already paid / enrolled via a retry — do not send confusing emails.
  // Also cancel this leftover attempt so recover-cron / Phase 4 stop touching it.
  if (siblingSuccess) {
    logger.info(
      `⏭️ Skipping failure notify for payment ${payment.id}: sibling course enrollment already succeeded`
    )
    try {
      await supabase
        .from('payments')
        .update({
          payment_status: 'cancelled',
          notes: 'Automatisch storniert: Kunde hat denselben Kurs bereits erfolgreich bezahlt',
          updated_at: new Date().toISOString(),
          metadata: {
            ...updatedMetadata,
            cancelled_as_orphan_after_sibling_success: true
          }
        })
        .eq('id', payment.id)
        .in('payment_status', ['pending', 'failed', 'processing'])
    } catch (cancelErr: any) {
      logger.warn(`⚠️ Could not cancel orphan failed payment ${payment.id}:`, cancelErr.message)
    }
    return
  }

  // Only course-enrollment payments have enough metadata (name/email/course)
  // to build a useful notification right now.
  if (!meta.course_id) return

  try {
    const { data: tenant } = await supabase
      .from('tenants')
      .select('contact_email, slug, name')
      .eq('id', payment.tenant_id)
      .maybeSingle()

    if (!tenant) return

    const { sendTenantEmail } = await import('~/server/utils/email')
    const customerName = [meta.firstname, meta.lastname].filter(Boolean).join(' ') || 'Unbekannt'
    const amountChf = ((payment.total_amount_rappen || 0) / 100).toFixed(2)
    // Real attempt time (when the customer tried to pay), NOT the detection time —
    // those can be weeks apart if the webhook was missed and a cron cycle caught it late.
    const attemptedAt = new Date(payment.created_at).toLocaleString('de-CH')

    // ── 1) Notify tenant staff ──────────────────────────────────────────────
    if (tenant.contact_email) {
      try {
        await sendTenantEmail(payment.tenant_id, {
          to: tenant.contact_email,
          subject: `⚠️ Online-Zahlung fehlgeschlagen: ${meta.course_name || 'Kursanmeldung'}`,
          html: `
            <p>Eine Kursanmeldung konnte nicht abgeschlossen werden, weil die Wallee-Zahlung fehlgeschlagen ist (Status: <strong>${walleeState}</strong>).</p>
            <p>Der/die Kunde/in wurde automatisch per E-Mail informiert und kann die Zahlung selbst erneut versuchen. Bitte bei Bedarf trotzdem direkt Kontakt aufnehmen.</p>
            <ul>
              <li><strong>Kurs:</strong> ${meta.course_name || '–'}</li>
              <li><strong>Name:</strong> ${customerName}</li>
              <li><strong>E-Mail:</strong> ${meta.email || '–'}</li>
              <li><strong>Telefon:</strong> ${meta.phone || '–'}</li>
              <li><strong>Betrag:</strong> CHF ${amountChf}</li>
              <li><strong>Anmeldeversuch:</strong> ${attemptedAt}</li>
              <li><strong>Payment-ID:</strong> ${payment.id}</li>
            </ul>
          `
        })
      } catch (staffErr: any) {
        logger.warn(`⚠️ Could not send staff failure notification for payment ${payment.id}:`, staffErr.message)
      }

      try {
        await supabase.from('admin_notifications').insert({
          notification_type: 'course_payment_failed',
          tenant_id: payment.tenant_id,
          recipients: [tenant.contact_email],
          details: {
            payment_id: payment.id,
            course_id: meta.course_id,
            course_name: meta.course_name,
            customer_name: customerName,
            customer_email: meta.email,
            amount_rappen: payment.total_amount_rappen,
            wallee_state: walleeState
          }
        })
      } catch (logErr: any) {
        logger.warn('⚠️ Could not log course_payment_failed admin notification:', logErr.message)
      }
    }

    // ── 2) Notify the customer so they know to retry ────────────────────────
    if (meta.email) {
      const retryBaseUrl = (process.env.NUXT_PUBLIC_APP_URL
        ? (process.env.NUXT_PUBLIC_APP_URL.startsWith('http') ? process.env.NUXT_PUBLIC_APP_URL : `https://${process.env.NUXT_PUBLIC_APP_URL}`)
        : 'https://app.simy.ch').replace(/\/$/, '')
      const retryLink = tenant.slug ? `${retryBaseUrl}/customer/courses/${tenant.slug}` : retryBaseUrl

      try {
        const { messageId } = await sendTenantEmail(payment.tenant_id, {
          to: meta.email,
          subject: `Zahlung fehlgeschlagen – ${meta.course_name || 'Kursanmeldung'}`,
          html: `
            <p>Hallo ${meta.firstname || ''},</p>
            <p>Deine Zahlung für <strong>${meta.course_name || 'den Kurs'}</strong> (CHF ${amountChf}) konnte leider nicht abgeschlossen werden. Deine Anmeldung wurde daher <strong>nicht</strong> übernommen.</p>
            <p>Das kann z.B. an einer abgelehnten Karte oder einem Abbruch während der Zahlung liegen. Du kannst es jederzeit erneut versuchen:</p>
            <p style="text-align:center;margin:24px 0;">
              <a href="${retryLink}" style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">Jetzt erneut anmelden</a>
            </p>
            <p style="font-size:14px;color:#6b7280;">Bei Fragen melde dich gerne bei ${tenant.name || 'uns'}${tenant.contact_email ? ` (${tenant.contact_email})` : ''}.</p>
          `
        })
        logger.info(`📧 Notified customer ${meta.email} of failed course payment ${payment.id}`)

        try {
          await supabase.from('admin_notifications').insert({
            notification_type: 'course_payment_failed_customer',
            tenant_id: payment.tenant_id,
            recipients: [meta.email],
            details: {
              payment_id: payment.id,
              course_id: meta.course_id,
              course_name: meta.course_name,
              customer_name: customerName,
              customer_email: meta.email,
              amount_rappen: payment.total_amount_rappen,
              wallee_state: walleeState,
              retry_link: retryLink,
              resend_message_id: messageId || null,
              send_status: 'sent'
            }
          })
        } catch (logErr: any) {
          logger.warn('⚠️ Could not log course_payment_failed_customer notification:', logErr.message)
        }
      } catch (custErr: any) {
        logger.warn(`⚠️ Could not send customer failure notification for payment ${payment.id}:`, custErr.message)

        try {
          await supabase.from('admin_notifications').insert({
            notification_type: 'course_payment_failed_customer',
            tenant_id: payment.tenant_id,
            recipients: [meta.email],
            details: {
              payment_id: payment.id,
              course_id: meta.course_id,
              course_name: meta.course_name,
              customer_name: customerName,
              customer_email: meta.email,
              amount_rappen: payment.total_amount_rappen,
              wallee_state: walleeState,
              retry_link: retryLink,
              send_status: 'failed',
              error: custErr.message
            }
          })
        } catch (logErr: any) {
          logger.warn('⚠️ Could not log failed course_payment_failed_customer notification:', logErr.message)
        }
      }
    }

    logger.info(`📧 Notified tenant ${payment.tenant_id} of failed course payment ${payment.id}`)
  } catch (notifyErr: any) {
    logger.warn(`⚠️ Could not send genuine-failure notification for payment ${payment.id}:`, notifyErr.message)
  }
}
