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

  // Load referrals
  const { data: referrals } = affiliateCode
    ? await supabaseAdmin
        .from('affiliate_referrals')
        .select('id, status, reward_rappen, credited_at, created_at, referred_user_id, users(first_name, last_name, email)')
        .eq('affiliate_code_id', affiliateCode.id)
        .order('created_at', { ascending: false })
    : { data: [] }

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
      },
      referrals: referrals ?? [],
      payout_requests: payoutRequests ?? [],
    }
  }
})
