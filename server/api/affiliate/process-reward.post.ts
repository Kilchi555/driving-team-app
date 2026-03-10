import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

/**
 * POST /api/affiliate/process-reward
 *
 * INTERNAL endpoint – called from the appointment status update hook
 * when an appointment transitions to 'completed'.
 *
 * Body: { appointment_id: string, user_id: string, tenant_id: string }
 *
 * Flow:
 * 1. Find if the user was referred (users.referred_by_code)
 * 2. Find the matching affiliate_codes row
 * 3. Find pending affiliate_referrals row for this user
 * 4. Fetch reward amount from tenant_settings (category=affiliate, key=reward_rappen)
 * 5. Credit affiliate's student_credits (deposit)
 * 6. Mark referral as 'credited', update counters
 *
 * Idempotent: if referral is already credited, returns success without re-crediting.
 *
 * Security: This endpoint uses the service role key (no user auth required).
 * It should only be called from server-side code, never from the client.
 */
export default defineEventHandler(async (event) => {
  const supabaseAdmin = getSupabaseAdmin()

  const body = await readBody(event)
  const { appointment_id, user_id, tenant_id } = body

  if (!appointment_id || !user_id || !tenant_id) {
    throw createError({ statusCode: 400, message: 'appointment_id, user_id, and tenant_id are required' })
  }

  // Look up the user's referred_by_code
  const { data: referredUser } = await supabaseAdmin
    .from('users')
    .select('id, referred_by_code')
    .eq('id', user_id)
    .eq('tenant_id', tenant_id)
    .maybeSingle()

  if (!referredUser?.referred_by_code) {
    // User was not referred – nothing to do
    return { success: true, credited: false, reason: 'not_referred' }
  }

  // Find the affiliate referral entry
  const { data: referral } = await supabaseAdmin
    .from('affiliate_referrals')
    .select('id, status, affiliate_code_id, affiliate_user_id')
    .eq('referred_user_id', user_id)
    .eq('tenant_id', tenant_id)
    .maybeSingle()

  if (!referral) {
    return { success: true, credited: false, reason: 'no_referral_record' }
  }

  if (referral.status === 'credited') {
    return { success: true, credited: false, reason: 'already_credited' }
  }

  // Fetch reward amount from tenant_settings
  const { data: rewardSetting } = await supabaseAdmin
    .from('tenant_settings')
    .select('setting_value')
    .eq('tenant_id', tenant_id)
    .eq('category', 'affiliate')
    .eq('setting_key', 'reward_rappen')
    .maybeSingle()

  const rewardRappen = parseInt(rewardSetting?.setting_value ?? '0', 10)

  if (rewardRappen <= 0) {
    return { success: true, credited: false, reason: 'reward_is_zero' }
  }

  // Credit the affiliate's student_credits
  const { data: currentCredit } = await supabaseAdmin
    .from('student_credits')
    .select('balance_rappen')
    .eq('user_id', referral.affiliate_user_id)
    .eq('tenant_id', tenant_id)
    .maybeSingle()

  const balanceBefore = currentCredit?.balance_rappen ?? 0
  const balanceAfter = balanceBefore + rewardRappen

  const { error: upsertError } = await supabaseAdmin
    .from('student_credits')
    .upsert({
      user_id: referral.affiliate_user_id,
      tenant_id,
      balance_rappen: balanceAfter,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,tenant_id' })

  if (upsertError) {
    throw createError({ statusCode: 500, message: 'Failed to credit affiliate account' })
  }

  // Log credit transaction
  await supabaseAdmin.from('credit_transactions').insert({
    user_id: referral.affiliate_user_id,
    tenant_id,
    transaction_type: 'affiliate_reward',
    amount_rappen: rewardRappen,
    balance_before_rappen: balanceBefore,
    balance_after_rappen: balanceAfter,
    payment_method: 'affiliate',
    reference_type: 'appointment',
    reference_id: appointment_id,
    notes: `Affiliate-Prämie für Empfehlung (Termin ${appointment_id})`,
    created_at: new Date().toISOString(),
  })

  // Mark referral as credited
  await supabaseAdmin
    .from('affiliate_referrals')
    .update({
      status: 'credited',
      reward_rappen: rewardRappen,
      first_appointment_id: appointment_id,
      credited_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', referral.id)

  // Update affiliate_codes counters
  await supabaseAdmin
    .from('affiliate_codes')
    .update({
      total_credited_rappen: (currentCredit?.balance_rappen ?? 0) + rewardRappen,
      updated_at: new Date().toISOString(),
    })
    .eq('id', referral.affiliate_code_id)

  // Increment total_referrals counter using rpc or manual fetch
  const { data: codeRow } = await supabaseAdmin
    .from('affiliate_codes')
    .select('total_referrals, total_credited_rappen')
    .eq('id', referral.affiliate_code_id)
    .single()

  if (codeRow) {
    await supabaseAdmin
      .from('affiliate_codes')
      .update({
        total_referrals: codeRow.total_referrals + 1,
        total_credited_rappen: codeRow.total_credited_rappen + rewardRappen,
        updated_at: new Date().toISOString(),
      })
      .eq('id', referral.affiliate_code_id)
  }

  return {
    success: true,
    credited: true,
    reward_rappen: rewardRappen,
    affiliate_user_id: referral.affiliate_user_id,
  }
})
