import { defineEventHandler, getQuery, createError } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { requireFeature } from '~/server/utils/require-feature'

/**
 * GET /api/affiliate/admin-referrals?code_id=…
 * Lists all referrals for one affiliate code (admin overview drill-down).
 */
export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const supabase = getSupabaseAdmin()
  const { data: admin } = await supabase
    .from('users')
    .select('id, tenant_id, role')
    .eq('auth_user_id', authUser.id)
    .single()

  if (!admin || !['admin', 'super_admin'].includes(admin.role)) {
    throw createError({ statusCode: 403, message: 'Admin access required' })
  }

  await requireFeature(admin.tenant_id, 'affiliate_enabled')

  const query = getQuery(event)
  const codeId = typeof query.code_id === 'string' ? query.code_id : null
  if (!codeId) {
    throw createError({ statusCode: 400, message: 'code_id is required' })
  }

  const { data: code, error: codeError } = await supabase
    .from('affiliate_codes')
    .select('id, code, user_id, total_referrals, total_credited_rappen, users(first_name, last_name)')
    .eq('id', codeId)
    .eq('tenant_id', admin.tenant_id)
    .maybeSingle()

  if (codeError || !code) {
    throw createError({ statusCode: 404, message: 'Affiliate-Code nicht gefunden' })
  }

  const { data: referralsRaw, error: referralsError } = await supabase
    .from('affiliate_referrals')
    .select('id, status, reward_rappen, credited_at, created_at, referred_user_id, first_appointment_id')
    .eq('affiliate_code_id', codeId)
    .eq('tenant_id', admin.tenant_id)
    .order('created_at', { ascending: false })

  if (referralsError) {
    throw createError({ statusCode: 500, message: referralsError.message })
  }

  const referrals = referralsRaw ?? []
  const userIds = [...new Set(referrals.map(r => r.referred_user_id).filter(Boolean))]

  const usersMap: Record<string, { first_name: string | null; last_name: string | null; email: string | null }> = {}
  if (userIds.length) {
    const { data: usersData } = await supabase
      .from('users')
      .select('id, first_name, last_name, email')
      .in('id', userIds)
    for (const u of usersData ?? []) {
      usersMap[u.id] = u
    }
  }

  // Reward transactions for this partner (may be multiple per referred user)
  const { data: rewardTxs } = await supabase
    .from('credit_transactions')
    .select('id, amount_rappen, reference_id, reference_type, created_at, notes')
    .eq('user_id', code.user_id)
    .eq('tenant_id', admin.tenant_id)
    .eq('transaction_type', 'affiliate_reward')
    .order('created_at', { ascending: false })
    .limit(100)

  const txsByReferredUser: Record<string, number> = {}
  if (rewardTxs?.length) {
    const appointmentIds = rewardTxs.filter(t => t.reference_type === 'appointment').map(t => t.reference_id)
    const courseRegIds = rewardTxs.filter(t => t.reference_type === 'course_registration').map(t => t.reference_id)

    const [appointmentsRes, courseRegsRes] = await Promise.all([
      appointmentIds.length
        ? supabase.from('appointments').select('id, user_id').in('id', appointmentIds)
        : Promise.resolve({ data: [] as { id: string; user_id: string }[] }),
      courseRegIds.length
        ? supabase.from('course_registrations').select('id, user_id').in('id', courseRegIds)
        : Promise.resolve({ data: [] as { id: string; user_id: string | null }[] }),
    ])

    const apptMap = Object.fromEntries((appointmentsRes.data ?? []).map(a => [a.id, a.user_id]))
    const regMap = Object.fromEntries((courseRegsRes.data ?? []).map(r => [r.id, r.user_id]))

    for (const tx of rewardTxs) {
      let referredId: string | null = null
      if (tx.reference_type === 'appointment') referredId = apptMap[tx.reference_id] ?? null
      else if (tx.reference_type === 'course_registration') referredId = regMap[tx.reference_id] ?? null
      if (!referredId) continue
      txsByReferredUser[referredId] = (txsByReferredUser[referredId] ?? 0) + (tx.amount_rappen ?? 0)
    }
  }

  const partner = (code as any).users
  const partnerName = partner
    ? `${partner.first_name ?? ''} ${partner.last_name ?? ''}`.trim() || 'Unbekannt'
    : 'Unbekannt'

  return {
    success: true,
    data: {
      code: {
        id: code.id,
        code: code.code,
        user_name: partnerName,
        total_referrals: code.total_referrals,
        total_credited_rappen: code.total_credited_rappen,
      },
      referrals: referrals.map(r => {
        const u = usersMap[r.referred_user_id]
        const name = u
          ? `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() || 'Unbekannt'
          : 'Unbekannt'
        return {
          id: r.id,
          status: r.status,
          reward_rappen: r.reward_rappen ?? 0,
          credited_at: r.credited_at,
          created_at: r.created_at,
          referred_user_id: r.referred_user_id,
          referred_name: name,
          referred_email: u?.email ?? null,
          rewards_total_rappen: txsByReferredUser[r.referred_user_id] ?? (r.status === 'credited' ? (r.reward_rappen ?? 0) : 0),
        }
      }),
    },
  }
})
