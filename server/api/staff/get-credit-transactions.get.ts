import { defineEventHandler, getQuery, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const supabase = getSupabaseAdmin()

  const authUser = await getAuthenticatedUser(event)
  if (!authUser) throw createError({ statusCode: 401, statusMessage: 'Authentication required' })

  const { user_id } = getQuery(event) as { user_id?: string }
  if (!user_id) throw createError({ statusCode: 400, statusMessage: 'user_id is required' })

  // Verify the requesting staff belongs to the same tenant as the target user
  const { data: targetUser } = await supabase
    .from('users')
    .select('id, tenant_id')
    .eq('id', user_id)
    .single()

  if (!targetUser) throw createError({ statusCode: 404, statusMessage: 'Student not found' })
  if (targetUser.tenant_id !== authUser.tenant_id) {
    throw createError({ statusCode: 403, statusMessage: 'Access denied' })
  }

  const { data, error } = await supabase
    .from('credit_transactions')
    .select('id, transaction_type, amount_rappen, balance_before_rappen, balance_after_rappen, payment_method, notes, created_at, reference_id, reference_type')
    .eq('user_id', user_id)
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) throw createError({ statusCode: 500, statusMessage: 'Fehler beim Laden der Transaktionen' })

  const transactions = data || []

  // Enrich affiliate_reward transactions with referred user name and driving category
  const affiliateTxs = transactions.filter(tx => tx.transaction_type === 'affiliate_reward' && tx.reference_id)

  if (affiliateTxs.length > 0) {
    const appointmentIds = affiliateTxs.filter(tx => tx.reference_type === 'appointment').map(tx => tx.reference_id)
    const courseRegIds = affiliateTxs.filter(tx => tx.reference_type === 'course_registration').map(tx => tx.reference_id)

    // Load referred user names directly from appointments/course_registrations (user_id = referred person)
    const referredUserIds: Record<string, string> = {} // reference_id -> referred user_id
    const aptCategoryMap: Record<string, string> = {}

    if (appointmentIds.length > 0) {
      const { data: apts } = await supabase
        .from('appointments')
        .select('id, type, user_id')
        .in('id', appointmentIds)
      apts?.forEach((a: any) => {
        if (a.type) aptCategoryMap[a.id] = a.type
        if (a.user_id) referredUserIds[a.id] = a.user_id
      })
    }

    // Load course registration categories
    const courseRegCategoryMap: Record<string, string> = {}
    if (courseRegIds.length > 0) {
      const { data: regs } = await supabase
        .from('course_registrations')
        .select('id, user_id, courses!inner(category)')
        .in('id', courseRegIds)
      regs?.forEach((r: any) => {
        if (r.courses?.category) courseRegCategoryMap[r.id] = r.courses.category
        if (r.user_id) referredUserIds[r.id] = r.user_id
      })
    }

    // Bulk-load referred user names
    const referralMap: Record<string, string> = {}
    const uniqueUserIds = [...new Set(Object.values(referredUserIds))]
    if (uniqueUserIds.length > 0) {
      const { data: usersData } = await supabase
        .from('users')
        .select('id, first_name, last_name')
        .in('id', uniqueUserIds)
      const usersMap: Record<string, any> = Object.fromEntries((usersData ?? []).map((u: any) => [u.id, u]))
      Object.entries(referredUserIds).forEach(([refId, userId]) => {
        const u = usersMap[userId]
        if (u) {
          const name = `${u.first_name || ''} ${u.last_name || ''}`.trim()
          if (name) referralMap[refId] = name
        }
      })
    }

    return transactions.map(tx => {
      if (tx.transaction_type === 'affiliate_reward' && tx.reference_id) {
        const category = tx.reference_type === 'appointment'
          ? aptCategoryMap[tx.reference_id]
          : courseRegCategoryMap[tx.reference_id]
        return {
          ...tx,
          affiliate_referred_name: referralMap[tx.reference_id] || null,
          affiliate_category: category || null
        }
      }
      return tx
    })
  }

  return transactions
})
