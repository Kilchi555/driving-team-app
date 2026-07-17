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

import { logger } from '~/utils/logger'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export async function notifyGenuineWalleeFailure(paymentId: string, walleeState: string) {
  const supabase = getSupabaseAdmin()

  const { data: payment, error } = await supabase
    .from('payments')
    .select('id, tenant_id, total_amount_rappen, metadata, created_at')
    .eq('id', paymentId)
    .single()

  if (error || !payment) {
    logger.warn(`⚠️ notifyGenuineWalleeFailure: could not load payment ${paymentId}:`, error?.message)
    return
  }

  // Already tagged/notified for this payment — nothing to do.
  if (payment.metadata?.wallee_failure_state) return

  const updatedMetadata = {
    ...(payment.metadata || {}),
    wallee_failure_state: walleeState,
    wallee_failure_detected_at: new Date().toISOString()
  }

  try {
    await supabase
      .from('payments')
      .update({ metadata: updatedMetadata })
      .eq('id', payment.id)
  } catch (e: any) {
    logger.warn(`⚠️ Could not tag genuine Wallee failure on payment ${payment.id}:`, e.message)
  }

  // Only course-enrollment payments have enough metadata (name/email/course)
  // to build a useful notification right now.
  const meta = payment.metadata || {}
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
      try {
        const retryBaseUrl = (process.env.NUXT_PUBLIC_APP_URL
          ? (process.env.NUXT_PUBLIC_APP_URL.startsWith('http') ? process.env.NUXT_PUBLIC_APP_URL : `https://${process.env.NUXT_PUBLIC_APP_URL}`)
          : 'https://app.simy.ch').replace(/\/$/, '')
        const retryLink = tenant.slug ? `${retryBaseUrl}/customer/courses/${tenant.slug}` : retryBaseUrl

        await sendTenantEmail(payment.tenant_id, {
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
      } catch (custErr: any) {
        logger.warn(`⚠️ Could not send customer failure notification for payment ${payment.id}:`, custErr.message)
      }
    }

    logger.info(`📧 Notified tenant ${payment.tenant_id} of failed course payment ${payment.id}`)
  } catch (notifyErr: any) {
    logger.warn(`⚠️ Could not send genuine-failure notification for payment ${payment.id}:`, notifyErr.message)
  }
}
