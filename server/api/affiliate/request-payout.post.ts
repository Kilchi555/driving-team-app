import { defineEventHandler, readBody, createError, getHeader } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

/**
 * POST /api/affiliate/request-payout
 */
export default defineEventHandler(async (event) => {
  const supabaseAdmin = getSupabaseAdmin()

  const authUser = await getAuthenticatedUser(event)
  if (!authUser) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const { data: userProfile } = await supabaseAdmin
    .from('users')
    .select('id, tenant_id')
    .eq('auth_user_id', authUser.id)
    .single()

  if (!userProfile) throw createError({ statusCode: 403, message: 'User not found' })

  const body = await readBody(event)
  const { type, amount_rappen, iban, account_holder } = body

  if (!type || !['credit', 'bank'].includes(type)) {
    throw createError({ statusCode: 400, message: "type must be 'credit' or 'bank'" })
  }

  if (!amount_rappen || amount_rappen < 100) {
    throw createError({ statusCode: 400, message: 'amount_rappen must be at least 100 (CHF 1.00)' })
  }

  if (type === 'bank' && (!iban || !account_holder)) {
    throw createError({ statusCode: 400, message: 'iban and account_holder are required for bank payouts' })
  }

  // Verify user has sufficient credit balance
  const { data: credits } = await supabaseAdmin
    .from('student_credits')
    .select('balance_rappen')
    .eq('user_id', userProfile.id)
    .eq('tenant_id', userProfile.tenant_id)
    .maybeSingle()

  const currentBalance = credits?.balance_rappen ?? 0

  if (currentBalance < amount_rappen) {
    throw createError({
      statusCode: 400,
      message: `Insufficient balance. Available: ${currentBalance} rappen, requested: ${amount_rappen} rappen`
    })
  }

  if (type === 'credit') {
    // 'credit' just means: keep it as Fahrstunden-Guthaben – nothing to do
    return {
      success: true,
      message: 'Guthaben bleibt als Fahrstunden-Guthaben gespeichert.',
      data: { type: 'credit', balance_rappen: currentBalance }
    }
  }

  // type === 'bank': create payout request and deduct from balance (put in "pending" hold)
  // Deduct balance immediately so the user can't request twice
  const newBalance = currentBalance - amount_rappen
  const { error: deductError } = await supabaseAdmin
    .from('student_credits')
    .update({ balance_rappen: newBalance, updated_at: new Date().toISOString() })
    .eq('user_id', userProfile.id)
    .eq('tenant_id', userProfile.tenant_id)

  if (deductError) {
    throw createError({ statusCode: 500, message: 'Failed to deduct balance' })
  }

  // Log withdrawal transaction
  await supabaseAdmin.from('credit_transactions').insert({
    user_id: userProfile.id,
    tenant_id: userProfile.tenant_id,
    transaction_type: 'withdrawal',
    amount_rappen: -amount_rappen,
    balance_before_rappen: currentBalance,
    balance_after_rappen: newBalance,
    payment_method: 'bank_transfer',
    reference_type: 'payout_request',
    notes: 'Affiliate-Auszahlung per Banküberweisung',
    created_at: new Date().toISOString(),
  })

  // Create payout request for admin
  const { data: payoutRequest, error: payoutError } = await supabaseAdmin
    .from('affiliate_payout_requests')
    .insert({
      tenant_id: userProfile.tenant_id,
      user_id: userProfile.id,
      amount_rappen,
      iban: iban.replace(/\s/g, '').toUpperCase(),
      account_holder,
      status: 'pending',
    })
    .select('id')
    .single()

  if (payoutError) {
    throw createError({ statusCode: 500, message: 'Failed to create payout request' })
  }

  return {
    success: true,
    message: 'Auszahlungsantrag erfolgreich eingereicht. Du wirst per E-Mail benachrichtigt sobald die Überweisung durchgeführt wurde.',
    data: {
      payout_request_id: payoutRequest.id,
      amount_rappen,
      new_balance_rappen: newBalance,
    }
  }
})
