import { defineEventHandler, getHeader, createError } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

async function getAdminUser(event: any) {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const supabaseAdmin = getSupabaseAdmin()
  const { data: profile } = await supabaseAdmin
    .from('users')
    .select('id, tenant_id, role')
    .eq('auth_user_id', authUser.id)
    .single()

  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    throw createError({ statusCode: 403, message: 'Admin access required' })
  }
  return profile
}

/**
 * GET /api/affiliate/admin-overview
 * Returns aggregated statistics for the affiliate system.
 */
export default defineEventHandler(async (event) => {
  const admin = await getAdminUser(event)
  const supabase = getSupabaseAdmin()

  // Total active codes
  const { count: totalCodes } = await supabase
    .from('affiliate_codes')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', admin.tenant_id)
    .eq('is_active', true)

  // Referral stats
  const { data: referralStats } = await supabase
    .from('affiliate_referrals')
    .select('id, status, reward_rappen')
    .eq('tenant_id', admin.tenant_id)

  const totalReferrals = referralStats?.length ?? 0
  const totalCredited = referralStats?.filter(r => r.status === 'credited').length ?? 0
  const totalCreditedRappen = referralStats
    ?.filter(r => r.status === 'credited')
    .reduce((sum, r) => sum + (r.reward_rappen ?? 0), 0) ?? 0

  // Top codes with user names
  const { data: topCodes } = await supabase
    .from('affiliate_codes')
    .select('id, code, total_referrals, total_credited_rappen, user_id, users(first_name, last_name)')
    .eq('tenant_id', admin.tenant_id)
    .eq('is_active', true)
    .order('total_referrals', { ascending: false })
    .limit(10)

  const topCodesFormatted = (topCodes ?? []).map((c: any) => ({
    id: c.id,
    code: c.code,
    total_referrals: c.total_referrals,
    total_credited_rappen: c.total_credited_rappen,
    user_name: c.users ? `${c.users.first_name} ${c.users.last_name}`.trim() : 'Unbekannt',
  }))

  return {
    success: true,
    data: {
      total_codes: totalCodes ?? 0,
      total_referrals: totalReferrals,
      total_credited: totalCredited,
      total_credited_rappen: totalCreditedRappen,
      top_codes: topCodesFormatted,
    }
  }
})
