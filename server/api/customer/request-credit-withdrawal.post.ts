// server/api/customer/request-credit-withdrawal.post.ts
// Customer-initiated payout request.
//
// Path A (preferred): If the student has a completed Wallee payment, issues an
//   immediate Wallee refund — no admin step needed, money arrives in 3–5 days.
// Path B (fallback):  If no Wallee payment exists, creates a pending IBAN
//   withdrawal that the admin exports as a Pain.001 bank transfer file.

import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { processWalleeRefund } from '~/server/utils/wallee-refund'
import { logger } from '~/utils/logger'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { getClientIP } from '~/server/utils/ip-utils'
import { getAuthenticatedUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const ipAddress = getClientIP(event)
  const supabase = getSupabaseAdmin()

  try {
    // ── Auth ──────────────────────────────────────────────────────────────────
    const authUser = await getAuthenticatedUser(event)
    if (!authUser) throw createError({ statusCode: 401, message: 'Authentication required' })

    const userId = authUser.db_user_id || authUser.id

    // ── Rate limiting: max 5 requests per day ─────────────────────────────────
    const rateLimitResult = await checkRateLimit(userId, 'request_credit_withdrawal', 5, 86400000)
    if (!rateLimitResult.allowed) {
      throw createError({ statusCode: 429, message: 'Zu viele Anfragen. Bitte morgen erneut versuchen.' })
    }

    // ── Get user profile ──────────────────────────────────────────────────────
    const { data: userProfile } = await supabase
      .from('users')
      .select('id, tenant_id, first_name, last_name, email')
      .eq('id', userId)
      .single()
    if (!userProfile) throw createError({ statusCode: 404, message: 'Benutzerprofil nicht gefunden' })

    // ── Body ──────────────────────────────────────────────────────────────────
    const body = await readBody(event)
    const { amountRappen } = body

    if (!amountRappen || typeof amountRappen !== 'number' || amountRappen < 100) {
      throw createError({ statusCode: 400, message: 'Mindestbetrag CHF 1.00 erforderlich' })
    }

    // ── Check student credit balance ──────────────────────────────────────────
    const { data: creditData } = await supabase
      .from('student_credits')
      .select('id, balance_rappen, pending_withdrawal_rappen, completed_withdrawal_rappen')
      .eq('user_id', userProfile.id)
      .eq('tenant_id', userProfile.tenant_id)
      .maybeSingle()

    if (!creditData || creditData.balance_rappen <= 0) {
      throw createError({ statusCode: 400, message: 'Kein verfügbares Guthaben' })
    }

    const availableBalance = creditData.balance_rappen - (creditData.pending_withdrawal_rappen || 0)
    if (amountRappen > availableBalance) {
      throw createError({
        statusCode: 400,
        message: `Betrag überschreitet verfügbares Guthaben (CHF ${(availableBalance / 100).toFixed(2)})`
      })
    }

    const now = new Date()

    // ── Path A: Immediate Wallee Refund (preferred) ───────────────────────────
    const { data: walleePayment } = await supabase
      .from('payments')
      .select('id, wallee_transaction_id, total_amount_rappen, credit_used_rappen, payment_status, tenant_id')
      .eq('user_id', userProfile.id)
      .eq('payment_status', 'completed')
      .not('wallee_transaction_id', 'is', null)
      .order('paid_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (walleePayment) {
      logger.info('💳 request-credit-withdrawal: attempting immediate Wallee refund', {
        userId: userProfile.id,
        amountChf: (amountRappen / 100).toFixed(2),
        paymentId: walleePayment.id,
      })

      const idempotencyKey = `withdrawal-${userProfile.id}-${amountRappen}-${now.toISOString().slice(0, 10)}`
      const refundResult = await processWalleeRefund({
        payment: walleePayment,
        requestedAmountRappen: amountRappen,
        tenantId: walleePayment.tenant_id,
        idempotencyKey,
        reason: 'Guthabenrückzahlung (Auszahlung)',
      })

      if (refundResult.success) {
        // Atomically deduct from balance — guard prevents double-withdrawal
        const newBalance = Math.max(0, creditData.balance_rappen - amountRappen)
        const completedTotal = (creditData.completed_withdrawal_rappen || 0) + amountRappen

        const { data: updatedRows } = await supabase
          .from('student_credits')
          .update({
            balance_rappen: newBalance,
            completed_withdrawal_rappen: completedTotal,
            last_withdrawal_at: now.toISOString(),
            last_withdrawal_amount_rappen: amountRappen,
            last_withdrawal_status: 'completed',
            last_wallee_refund_id: refundResult.refundId || null,
            updated_at: now.toISOString(),
          })
          .eq('id', creditData.id)
          .eq('balance_rappen', creditData.balance_rappen) // atomic guard
          .select('id')

        if (!updatedRows || updatedRows.length === 0) {
          logger.error('⚠️ Race condition detected during withdrawal — Wallee refund may be duplicated', {
            userId: userProfile.id,
            refundId: refundResult.refundId,
          })
          throw createError({ statusCode: 409, message: 'Gleichzeitige Auszahlung erkannt. Bitte Guthaben prüfen.' })
        }

        // Create completed credit_transaction record
        await supabase.from('credit_transactions').insert({
          user_id: userProfile.id,
          tenant_id: userProfile.tenant_id,
          transaction_type: 'withdrawal',
          amount_rappen: -amountRappen,
          balance_before_rappen: creditData.balance_rappen,
          balance_after_rappen: newBalance,
          payment_method: 'wallee_refund',
          status: 'completed',
          wallee_refund_id: refundResult.refundId || null,
          notes: `Sofortauszahlung via Wallee (Refund ID: ${refundResult.refundId})`,
          created_at: now.toISOString(),
        })

        // Store refund ID on payments so the webhook can locate it
        if (refundResult.refundId) {
          await supabase
            .from('payments')
            .update({ wallee_refund_id: refundResult.refundId })
            .eq('id', walleePayment.id)
        }

        // Notify customer
        try {
          await $fetch('/api/email/send-withdrawal-notification', {
            method: 'POST',
            body: {
              type: 'withdrawal_completed',
              email: userProfile.email,
              studentName: `${userProfile.first_name} ${userProfile.last_name}`.trim(),
              amountChf: refundResult.refundedAmountChf.toFixed(2),
              method: 'wallee',
            }
          })
        } catch (e) { logger.warn('⚠️ Could not send withdrawal confirmation email:', e) }

        logger.info('✅ Immediate Wallee withdrawal successful', {
          userId: userProfile.id,
          amountChf: refundResult.refundedAmountChf,
          refundId: refundResult.refundId,
        })

        return {
          success: true,
          method: 'wallee',
          message: `CHF ${refundResult.refundedAmountChf.toFixed(2)} wird auf dein Zahlungsmittel zurückerstattet (3–5 Werktage).`,
          walleeRefundId: refundResult.refundId,
          amountChf: refundResult.refundedAmountChf.toFixed(2),
        }
      }

      // Wallee failed — log and fall through to IBAN path
      logger.warn('⚠️ Wallee refund failed, falling back to IBAN pending flow:', refundResult.error)
    }

    // ── Path B: Pending IBAN withdrawal (requires IBAN prefs) ────────────────
    const { data: withdrawalPrefs } = await supabase
      .from('student_withdrawal_preferences')
      .select('id, iban_last4, account_holder, withdrawal_unlocked_at, street, zip, city')
      .eq('user_id', userProfile.id)
      .maybeSingle()

    if (!withdrawalPrefs?.iban_last4) {
      throw createError({
        statusCode: 400,
        message: walleePayment
          ? 'Wallee-Rückerstattung fehlgeschlagen. Bitte IBAN hinterlegen für manuelle Banküberweisung.'
          : 'Keine Wallee-Zahlung gefunden. Bitte IBAN hinterlegen für manuelle Banküberweisung.',
      })
    }

    if (!withdrawalPrefs.street || !withdrawalPrefs.zip || !withdrawalPrefs.city) {
      throw createError({ statusCode: 400, message: 'Bitte Adresse in den Auszahlungseinstellungen hinterlegen' })
    }

    // Create pending credit_transaction
    const { data: transaction, error: txError } = await supabase
      .from('credit_transactions')
      .insert({
        user_id: userProfile.id,
        tenant_id: userProfile.tenant_id,
        transaction_type: 'withdrawal',
        amount_rappen: -amountRappen,
        balance_before_rappen: creditData.balance_rappen,
        balance_after_rappen: creditData.balance_rappen - amountRappen,
        payment_method: 'bank_transfer',
        status: 'withdrawal_pending',
        notes: `Auszahlungsantrag via IBAN ****${withdrawalPrefs.iban_last4}`,
        created_at: now.toISOString()
      })
      .select('id')
      .single()

    if (txError) {
      logger.error('❌ Error creating withdrawal transaction:', txError)
      throw createError({ statusCode: 500, message: 'Fehler beim Erstellen der Transaktion' })
    }

    // Freeze the amount in student_credits
    const { error: updateError } = await supabase
      .from('student_credits')
      .update({
        pending_withdrawal_rappen: (creditData.pending_withdrawal_rappen || 0) + amountRappen,
        last_withdrawal_at: now.toISOString(),
        updated_at: now.toISOString()
      })
      .eq('id', creditData.id)

    if (updateError) {
      logger.error('❌ Error freezing withdrawal amount:', updateError)
      await supabase.from('credit_transactions').delete().eq('id', transaction.id)
      throw createError({ statusCode: 500, message: 'Fehler beim Einfrieren des Betrags' })
    }

    logger.info('📋 Pending IBAN withdrawal created', { userId: userProfile.id, amountRappen })

    // Notify customer
    try {
      await $fetch('/api/email/send-withdrawal-notification', {
        method: 'POST',
        body: {
          type: 'withdrawal_requested',
          email: userProfile.email,
          studentName: `${userProfile.first_name} ${userProfile.last_name}`.trim(),
          amountChf: (amountRappen / 100).toFixed(2),
          ibanLast4: withdrawalPrefs.iban_last4,
          accountHolder: withdrawalPrefs.account_holder
        }
      })
    } catch (e) { logger.warn('⚠️ Could not send withdrawal confirmation email:', e) }

    // Notify admin
    try {
      await $fetch('/api/email/send-withdrawal-notification', {
        method: 'POST',
        body: {
          type: 'admin_new_withdrawal',
          tenantId: userProfile.tenant_id,
          studentName: `${userProfile.first_name} ${userProfile.last_name}`.trim(),
          studentEmail: userProfile.email,
          amountChf: (amountRappen / 100).toFixed(2),
          ibanLast4: withdrawalPrefs.iban_last4
        }
      })
    } catch (e) { logger.warn('⚠️ Could not send admin notification email:', e) }

    return {
      success: true,
      method: 'iban',
      message: 'Auszahlungsantrag erfolgreich gestellt. Wir überweisen den Betrag in den nächsten Werktagen.',
      transactionId: transaction.id,
      amountChf: (amountRappen / 100).toFixed(2)
    }

  } catch (error: any) {
    if (error.statusCode) throw error
    logger.error('❌ request-credit-withdrawal error:', error)
    throw createError({ statusCode: 500, message: 'Interner Fehler' })
  }
})
