// server/api/customer/request-credit-withdrawal.post.ts
// Customer-initiated payout request — creates a pending withdrawal entry
// Admin processes and exports Pain.001 file for bank transfer

import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { getClientIP } from '~/server/utils/ip-utils'
import { getAuthenticatedUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const ipAddress = getClientIP(event)
  const supabase = getSupabaseAdmin()

  try {
    // ── Auth ──────────────────────────────────────────────
    const authUser = await getAuthenticatedUser(event)
    if (!authUser) throw createError({ statusCode: 401, message: 'Authentication required' })

    const userId = authUser.db_user_id || authUser.id

    // ── Rate limiting: max 5 requests per day ─────────────
    const rateLimitResult = await checkRateLimit(userId, 'request_credit_withdrawal', 5, 86400000)
    if (!rateLimitResult.allowed) {
      throw createError({ statusCode: 429, message: 'Zu viele Anfragen. Bitte morgen erneut versuchen.' })
    }

    // ── Get user profile ──────────────────────────────────
    const { data: userProfile } = await supabase
      .from('users')
      .select('id, tenant_id, first_name, last_name, email')
      .eq('id', userId)
      .single()
    if (!userProfile) throw createError({ statusCode: 404, message: 'Benutzerprofil nicht gefunden' })

    // ── Body ──────────────────────────────────────────────
    const body = await readBody(event)
    const { amountRappen } = body

    logger.info('📥 request-credit-withdrawal body:', {
      amountRappen,
      type: typeof amountRappen,
      userId,
      hasWithdrawalPrefs: false // updated below
    })

    if (!amountRappen || typeof amountRappen !== 'number' || amountRappen < 100) {
      throw createError({ statusCode: 400, message: 'Mindestbetrag CHF 1.00 erforderlich' })
    }

    // ── Check withdrawal preferences (IBAN + address must exist) ──
    const { data: withdrawalPrefs } = await supabase
      .from('student_withdrawal_preferences')
      .select('id, iban_last4, account_holder, withdrawal_unlocked_at, street, zip, city')
      .eq('user_id', userProfile.id)
      .maybeSingle()

    logger.info('🔍 withdrawal prefs check:', {
      hasPrefs: !!withdrawalPrefs,
      hasStreet: !!withdrawalPrefs?.street,
      hasZip: !!withdrawalPrefs?.zip,
      hasCity: !!withdrawalPrefs?.city,
    })

    if (!withdrawalPrefs) {
      throw createError({ statusCode: 400, message: 'Bitte zuerst eine Auszahlungs-IBAN hinterlegen' })
    }

    if (!withdrawalPrefs.street || !withdrawalPrefs.zip || !withdrawalPrefs.city) {
      throw createError({
        statusCode: 400,
        message: 'Bitte Adresse in den Auszahlungseinstellungen hinterlegen'
      })
    }

    // ── Check student credit balance ──────────────────────
    const { data: creditData } = await supabase
      .from('student_credits')
      .select('id, balance_rappen, pending_withdrawal_rappen')
      .eq('user_id', userProfile.id)
      .maybeSingle()

    if (!creditData || creditData.balance_rappen <= 0) {
      logger.info('🔍 credit check failed:', { hasCreditData: !!creditData, balance: creditData?.balance_rappen })
      throw createError({ statusCode: 400, message: 'Kein verfügbares Guthaben' })
    }

    const availableBalance = creditData.balance_rappen - (creditData.pending_withdrawal_rappen || 0)
    logger.info('🔍 balance check:', { balance: creditData.balance_rappen, pending: creditData.pending_withdrawal_rappen, available: availableBalance, requested: amountRappen })
    if (amountRappen > availableBalance) {
      throw createError({
        statusCode: 400,
        message: `Betrag überschreitet verfügbares Guthaben (CHF ${(availableBalance / 100).toFixed(2)})`
      })
    }

    // ── Check no duplicate pending withdrawal ─────────────
    if ((creditData.pending_withdrawal_rappen || 0) > 0) {
      throw createError({
        statusCode: 400,
        message: 'Es gibt bereits einen ausstehenden Auszahlungsantrag'
      })
    }

    // ── Create credit_transaction (withdrawal_pending) ────
    const now = new Date()
    const { data: transaction, error: txError } = await supabase
      .from('credit_transactions')
      .insert({
        user_id: userProfile.id,
        tenant_id: userProfile.tenant_id,
        transaction_type: 'withdrawal',
        amount_rappen: -amountRappen,
        balance_before_rappen: creditData.balance_rappen,
        balance_after_rappen: creditData.balance_rappen - amountRappen,
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

    // ── Freeze the amount in student_credits ──────────────
    const { error: updateError } = await supabase
      .from('student_credits')
      .update({
        pending_withdrawal_rappen: amountRappen,
        last_withdrawal_at: now.toISOString(),
        updated_at: now.toISOString()
      })
      .eq('id', creditData.id)

    if (updateError) {
      logger.error('❌ Error freezing withdrawal amount:', updateError)
      // Rollback transaction
      await supabase.from('credit_transactions').delete().eq('id', transaction.id)
      throw createError({ statusCode: 500, message: 'Fehler beim Einfrieren des Betrags' })
    }

    logger.debug('✅ Withdrawal request created:', {
      userId: userProfile.id,
      amountRappen,
      transactionId: transaction.id
    })

    // ── Notify customer ───────────────────────────────────
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
    } catch (emailError) {
      logger.warn('⚠️ Could not send withdrawal confirmation email:', emailError)
    }

    // ── Notify admin ──────────────────────────────────────
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
    } catch (emailError) {
      logger.warn('⚠️ Could not send admin notification email:', emailError)
    }

    return {
      success: true,
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
