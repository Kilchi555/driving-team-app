/**
 * GET /api/affiliate/debug-user?user_id=...&tenant_id=...
 *
 * Debug endpoint – traces the full affiliate reward eligibility for a given user.
 * Returns a step-by-step report so you can see exactly why a reward would or would not fire.
 *
 * ONLY accessible to staff/admin.
 */
import { defineEventHandler, getQuery, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const supabase = getSupabaseAdmin()

  // Verify requester is staff/admin
  const { data: requester } = await supabase
    .from('users')
    .select('role, tenant_id')
    .eq('auth_user_id', authUser.id)
    .maybeSingle()

  if (!requester || !['staff', 'admin', 'tenant_admin', 'superadmin'].includes(requester.role)) {
    throw createError({ statusCode: 403, statusMessage: 'Staff/Admin only' })
  }

  const query = getQuery(event)
  const user_id = query.user_id as string
  const tenant_id = (query.tenant_id as string) || requester.tenant_id

  if (!user_id) throw createError({ statusCode: 400, statusMessage: 'user_id required' })

  const steps: Record<string, any> = {}

  // Step 1: Does the user exist + have referred_by_code?
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, email, first_name, last_name, referred_by_code, category')
    .eq('id', user_id)
    .eq('tenant_id', tenant_id)
    .maybeSingle()

  steps['1_user'] = {
    found: !!user,
    email: user?.email,
    name: `${user?.first_name} ${user?.last_name}`,
    category: user?.category,
    referred_by_code: user?.referred_by_code ?? null,
    verdict: user?.referred_by_code ? '✅ Has referral code' : '❌ No referred_by_code → reward will NOT fire',
    error: userError?.message ?? null,
  }

  if (!user?.referred_by_code) {
    return { user_id, tenant_id, steps, conclusion: '❌ User was not referred – nothing to do' }
  }

  // Step 2: Does an affiliate_referrals record exist?
  const { data: referral, error: refError } = await supabase
    .from('affiliate_referrals')
    .select('id, status, affiliate_code_id, affiliate_user_id, first_appointment_id, reward_rappen, credited_at')
    .eq('referred_user_id', user_id)
    .eq('tenant_id', tenant_id)
    .maybeSingle()

  steps['2_referral_record'] = {
    found: !!referral,
    status: referral?.status,
    affiliate_user_id: referral?.affiliate_user_id,
    first_appointment_id: referral?.first_appointment_id,
    reward_rappen: referral?.reward_rappen,
    credited_at: referral?.credited_at,
    verdict: referral ? '✅ Referral record found' : '❌ No affiliate_referrals row → reward will NOT fire',
    error: refError?.message ?? null,
  }

  if (!referral) {
    return { user_id, tenant_id, steps, conclusion: '❌ No referral record found' }
  }

  // Step 3: Does the affiliate user exist?
  const { data: affiliateUser } = await supabase
    .from('users')
    .select('id, email, first_name, last_name')
    .eq('id', referral.affiliate_user_id)
    .maybeSingle()

  steps['3_affiliate_user'] = {
    found: !!affiliateUser,
    id: referral.affiliate_user_id,
    email: affiliateUser?.email,
    name: `${affiliateUser?.first_name} ${affiliateUser?.last_name}`,
    verdict: affiliateUser ? '✅ Affiliate user found' : '⚠️ Affiliate user missing',
  }

  // Step 4: Does the user have any completed payments?
  const { data: completedPayments } = await supabase
    .from('payments')
    .select('id, payment_status, payment_method, appointment_id, total_amount_rappen, paid_at, appointments(id, type)')
    .eq('user_id', user_id)
    .eq('tenant_id', tenant_id)
    .eq('payment_status', 'completed')

  steps['4_completed_payments'] = {
    count: completedPayments?.length ?? 0,
    payments: completedPayments?.map(p => ({
      id: p.id,
      method: p.payment_method,
      amount_chf: ((p.total_amount_rappen ?? 0) / 100).toFixed(2),
      paid_at: p.paid_at,
      appointment_id: p.appointment_id,
      driving_category: (p as any).appointments?.type ?? null,
    })),
    verdict: (completedPayments?.length ?? 0) > 0
      ? '✅ Has completed payments'
      : '❌ No completed payments yet → reward cannot fire',
  }

  // Step 5: Check already-rewarded transactions per appointment
  const rewardedRefs = completedPayments?.length
    ? await supabase
        .from('credit_transactions')
        .select('reference_id, amount_rappen, created_at')
        .eq('user_id', referral.affiliate_user_id)
        .eq('tenant_id', tenant_id)
        .eq('transaction_type', 'affiliate_reward')
        .in('reference_id', completedPayments.map(p => p.id))
    : null

  steps['5_already_rewarded'] = {
    rewarded_payment_ids: rewardedRefs?.data?.map(r => r.reference_id) ?? [],
    transactions: rewardedRefs?.data ?? [],
    verdict: (rewardedRefs?.data?.length ?? 0) > 0
      ? `⚠️ ${rewardedRefs!.data!.length} payment(s) already rewarded`
      : '✅ No duplicate rewards',
  }

  // Step 6: Check reward configuration for each category
  const categories = [...new Set(
    completedPayments
      ?.map(p => (p as any).appointments?.type)
      .filter(Boolean) ?? []
  )]

  const rewardChecks: any[] = []
  for (const cat of categories) {
    // Direct category reward
    const { data: catReward } = await supabase
      .from('affiliate_category_rewards')
      .select('reward_rappen, driving_category, is_active')
      .eq('tenant_id', tenant_id)
      .eq('driving_category', cat)
      .eq('is_active', true)
      .is('course_id', null)
      .maybeSingle()

    // Parent category fallback
    let parentReward = null
    let parentCode = null
    if (!catReward) {
      const { data: catRow } = await supabase
        .from('categories')
        .select('parent_category_id')
        .eq('code', cat)
        .eq('tenant_id', tenant_id)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle()

      if (catRow?.parent_category_id) {
        const { data: parentCat } = await supabase
          .from('categories')
          .select('code')
          .eq('id', catRow.parent_category_id)
          .maybeSingle()

        parentCode = parentCat?.code ?? null
        if (parentCode) {
          const { data: pr } = await supabase
            .from('affiliate_category_rewards')
            .select('reward_rappen, driving_category, is_active')
            .eq('tenant_id', tenant_id)
            .eq('driving_category', parentCode)
            .eq('is_active', true)
            .is('course_id', null)
            .maybeSingle()
          parentReward = pr
        }
      }
    }

    rewardChecks.push({
      driving_category: cat,
      direct_reward: catReward ? `✅ CHF ${(catReward.reward_rappen / 100).toFixed(2)}` : '❌ none',
      parent_category: parentCode,
      parent_reward: parentReward ? `✅ CHF ${(parentReward.reward_rappen / 100).toFixed(2)}` : (parentCode ? '❌ none' : 'n/a'),
      effective_reward_chf: catReward
        ? (catReward.reward_rappen / 100).toFixed(2)
        : parentReward
          ? (parentReward.reward_rappen / 100).toFixed(2)
          : '0.00',
    })
  }

  // Global fallback
  const { data: globalReward } = await supabase
    .from('tenant_settings')
    .select('setting_value')
    .eq('tenant_id', tenant_id)
    .eq('category', 'affiliate')
    .eq('setting_key', 'reward_rappen')
    .maybeSingle()

  steps['6_reward_config'] = {
    categories_from_completed_payments: categories,
    per_category: rewardChecks,
    global_tenant_fallback_chf: globalReward?.setting_value
      ? (parseInt(globalReward.setting_value) / 100).toFixed(2)
      : '❌ none configured',
    verdict: rewardChecks.some(r => parseFloat(r.effective_reward_chf) > 0) || globalReward?.setting_value
      ? '✅ Reward amount found'
      : '❌ No reward configured for any category → reward will NOT fire (reward_is_zero)',
  }

  // Final conclusion
  const hasCompletedPayments = (completedPayments?.length ?? 0) > 0
  const allAlreadyRewarded = hasCompletedPayments &&
    completedPayments!.every(p => rewardedRefs?.data?.some(r => r.reference_id === p.id))
  const hasReward = rewardChecks.some(r => parseFloat(r.effective_reward_chf) > 0) || !!globalReward?.setting_value

  let conclusion = ''
  if (!hasCompletedPayments) conclusion = '❌ No completed payments yet – confirm a payment first'
  else if (allAlreadyRewarded) conclusion = '✅ All payments already rewarded'
  else if (!hasReward) conclusion = '❌ No reward configured – add entry in affiliate_category_rewards or tenant_settings'
  else conclusion = '✅ Should fire correctly on next payment confirmation'

  return { user_id, tenant_id, steps, conclusion }
})
