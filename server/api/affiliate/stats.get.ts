import { defineEventHandler, getHeader, createError } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

/**
 * GET /api/affiliate/stats
 */
export default defineEventHandler(async (event) => {
  const supabaseAdmin = getSupabaseAdmin()

  const authUser = await getAuthenticatedUser(event)
  if (!authUser) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const { data: userProfile, error: profileError } = await supabaseAdmin
    .from('users')
    .select('id, tenant_id, role')
    .eq('auth_user_id', authUser.id)
    .single()

  if (profileError || !userProfile) throw createError({ statusCode: 403, message: 'User not found' })

  // Load affiliate code
  const { data: affiliateCode } = await supabaseAdmin
    .from('affiliate_codes')
    .select('id, code, total_referrals, total_credited_rappen, is_active')
    .eq('user_id', userProfile.id)
    .eq('tenant_id', userProfile.tenant_id)
    .maybeSingle()

  // If user doesn't have an affiliate code yet, still allow viewing dashboard
  // Just with empty stats - they can generate a code from there
  const { data: referralsRaw, error: referralsError } = affiliateCode
    ? await supabaseAdmin
        .from('affiliate_referrals')
        .select('id, status, reward_rappen, credited_at, created_at, referred_user_id')
        .eq('affiliate_code_id', affiliateCode.id)
        .order('created_at', { ascending: false })
    : { data: [], error: null }

  if (referralsError) {
    console.error('[affiliate/stats] Failed to load referrals:', referralsError)
  }

  // Enrich with user names via separate query to avoid FK-hint issues
  let referrals: any[] = referralsRaw ?? []
  if (referrals.length > 0) {
    const userIds = referrals.map(r => r.referred_user_id).filter(Boolean)
    const { data: usersData } = await supabaseAdmin
      .from('users')
      .select('id, first_name, last_name, email')
      .in('id', userIds)
    const usersMap = Object.fromEntries((usersData ?? []).map(u => [u.id, u]))
    referrals = referrals.map(r => ({
      ...r,
      users: usersMap[r.referred_user_id] ?? null,
    }))
  }

  // Derive granular metrics from referrals
  const totalRegistrations = referrals?.length ?? 0
  const totalActive = referrals?.filter(r => r.status === 'credited').length ?? 0
  const totalPending = referrals?.filter(r => r.status === 'pending').length ?? 0
  const conversionRate = totalRegistrations > 0
    ? Math.round((totalActive / totalRegistrations) * 100)
    : 0

  // Load current credit balance
  const { data: credits } = await supabaseAdmin
    .from('student_credits')
    .select('balance_rappen')
    .eq('user_id', userProfile.id)
    .eq('tenant_id', userProfile.tenant_id)
    .maybeSingle()

  // Load payout requests
  const { data: payoutRequests } = await supabaseAdmin
    .from('affiliate_payout_requests')
    .select('id, amount_rappen, status, iban, created_at, processed_at')
    .eq('user_id', userProfile.id)
    .eq('tenant_id', userProfile.tenant_id)
    .order('created_at', { ascending: false })

  // Build share link
  let shareLink: string | null = null
  if (affiliateCode) {
    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('slug')
      .eq('id', userProfile.tenant_id)
      .single()
    const tenantSlug = tenant?.slug ?? 'driving-team'
    shareLink = `https://simy.ch/register/${tenantSlug}?ref=${affiliateCode.code}`
  }

  // Load tenant affiliate enabled setting
  const { data: enabledSetting } = await supabaseAdmin
    .from('tenant_settings')
    .select('setting_value')
    .eq('tenant_id', userProfile.tenant_id)
    .eq('category', 'affiliate')
    .eq('setting_key', 'enabled')
    .maybeSingle()

  const affiliateSystemEnabled = enabledSetting?.setting_value !== 'false'

  return {
    success: true,
    data: {
      enabled: affiliateSystemEnabled,
      affiliate_code: affiliateCode
        ? { id: affiliateCode.id, code: affiliateCode.code, is_active: affiliateCode.is_active }
        : null,
      share_link: shareLink,
      summary: {
        total_referrals: affiliateCode?.total_referrals ?? 0,
        total_credited_rappen: affiliateCode?.total_credited_rappen ?? 0,
        current_balance_rappen: credits?.balance_rappen ?? 0,
        // Granular metrics derived from live referral data
        registrations: totalRegistrations,
        active: totalActive,
        pending: totalPending,
        conversion_rate: conversionRate,
      },
      referrals: referrals ?? [],
      payout_requests: payoutRequests ?? [],
    }
  }
})
