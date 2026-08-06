/**
 * GET /api/admin/platform-referral
 * Returns (or creates) this tenant's Simy invite code + referral stats.
 */
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/utils/supabase'
import {
  buildPlatformReferralShareUrl,
  ensurePlatformReferralCode,
  PLATFORM_REFERRAL_REWARD_RATE,
} from '~/server/utils/platform-referral'

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const tenantId = authUser.tenant_id || authUser.profile?.tenant_id
  const role = authUser.role || authUser.profile?.role
  if (!tenantId || !['admin', 'super_admin'].includes(role)) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const supabase = getSupabaseAdmin()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('slug, name')
    .eq('id', tenantId)
    .maybeSingle()

  const codeRow = await ensurePlatformReferralCode(supabase, tenantId, tenant?.slug)

  const { data: referrals } = await supabase
    .from('platform_referrals')
    .select(`
      id,
      status,
      attributed_at,
      first_paid_at,
      qualified_at,
      rewarded_at,
      reward_rappen,
      reward_plan,
      paid_plan_invoice_count,
      referred_tenant_id
    `)
    .eq('referrer_tenant_id', tenantId)
    .order('attributed_at', { ascending: false })
    .limit(50)

  const referredIds = [...new Set((referrals || []).map((r: any) => r.referred_tenant_id).filter(Boolean))]
  let nameById: Record<string, { name: string; slug: string | null }> = {}
  if (referredIds.length > 0) {
    const { data: referredTenants } = await supabase
      .from('tenants')
      .select('id, name, slug')
      .in('id', referredIds)
    for (const t of referredTenants || []) {
      nameById[t.id] = { name: t.name, slug: t.slug }
    }
  }

  const list = (referrals || []).map((r: any) => ({
    id: r.id,
    status: r.status,
    attributed_at: r.attributed_at,
    first_paid_at: r.first_paid_at,
    qualified_at: r.qualified_at,
    rewarded_at: r.rewarded_at,
    reward_rappen: r.reward_rappen,
    reward_plan: r.reward_plan,
    paid_plan_invoice_count: r.paid_plan_invoice_count,
    referred_name: nameById[r.referred_tenant_id]?.name || 'Unbekannt',
    referred_slug: nameById[r.referred_tenant_id]?.slug || null,
  }))

  const rewarded = list.filter(r => r.status === 'rewarded')
  const totalRewardRappen = rewarded.reduce((sum, r) => sum + (r.reward_rappen || 0), 0)

  return {
    code: codeRow.code,
    share_url: buildPlatformReferralShareUrl(codeRow.code),
    reward_rate: PLATFORM_REFERRAL_REWARD_RATE,
    stats: {
      attributed: list.filter(r => r.status === 'attributed').length,
      pending_second: list.filter(r => r.status === 'pending_second').length,
      rewarded: rewarded.length,
      total_reward_rappen: totalRewardRappen,
      total: list.length,
    },
    referrals: list,
  }
})
