import { defineEventHandler, getHeader, createError, readBody } from 'h3'
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
 * GET  /api/affiliate/admin-payouts       → list all payout requests
 * PATCH /api/affiliate/admin-payouts/:id  → update status
 */
export default defineEventHandler(async (event) => {
  const admin = await getAdminUser(event)
  const supabase = getSupabaseAdmin()

  const url = event.path ?? event.node.req.url ?? ''
  const idMatch = url.match(/admin-payouts\/([a-f0-9-]+)/)
  const payoutId = idMatch?.[1]

  if (event.method === 'PATCH' && payoutId) {
    const body = await readBody(event)
    const { status } = body
    const allowedStatuses = ['approved', 'paid', 'rejected']
    if (!allowedStatuses.includes(status)) {
      throw createError({ statusCode: 400, message: `Status must be one of: ${allowedStatuses.join(', ')}` })
    }

    // Verify payout belongs to tenant & get current status + amount
    const { data: existing } = await supabase
      .from('affiliate_payout_requests')
      .select('id, tenant_id, user_id, amount_rappen, status')
      .eq('id', payoutId)
      .maybeSingle()

    if (!existing || existing.tenant_id !== admin.tenant_id) {
      throw createError({ statusCode: 404, message: 'Payout request not found' })
    }

    // If rejecting a previously pending payout, restore the balance
    if (status === 'rejected' && existing.status === 'pending') {
      // Get current balance
      const { data: credits } = await supabase
        .from('student_credits')
        .select('balance_rappen')
        .eq('user_id', existing.user_id)
        .eq('tenant_id', admin.tenant_id)
        .maybeSingle()

      const currentBalance = credits?.balance_rappen ?? 0
      const restoredBalance = currentBalance + existing.amount_rappen

      // Restore balance
      await supabase
        .from('student_credits')
        .upsert({
          user_id: existing.user_id,
          tenant_id: admin.tenant_id,
          balance_rappen: restoredBalance,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,tenant_id' })

      // Log reversal transaction
      await supabase.from('credit_transactions').insert({
        user_id: existing.user_id,
        tenant_id: admin.tenant_id,
        transaction_type: 'withdrawal_reversed',
        amount_rappen: existing.amount_rappen,
        balance_before_rappen: currentBalance,
        balance_after_rappen: restoredBalance,
        payment_method: 'bank_transfer',
        reference_type: 'payout_request',
        reference_id: payoutId,
        notes: `Affiliate-Auszahlung abgelehnt – Guthaben wiederhergestellt (Antrag: ${payoutId})`,
        created_at: new Date().toISOString(),
      })
    }

    await supabase
      .from('affiliate_payout_requests')
      .update({
        status,
        processed_by: admin.id,
        processed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', payoutId)

    return { success: true, reversed: status === 'rejected' && existing.status === 'pending' }
  }

  // GET – list all requests
  const { data: requests } = await supabase
    .from('affiliate_payout_requests')
    .select('id, amount_rappen, iban, account_holder, status, notes, created_at, processed_at, user_id, users(first_name, last_name, email)')
    .eq('tenant_id', admin.tenant_id)
    .order('created_at', { ascending: false })

  const formatted = (requests ?? []).map((r: any) => ({
    id: r.id,
    amount_rappen: r.amount_rappen,
    iban: r.iban,
    account_holder: r.account_holder,
    status: r.status,
    notes: r.notes,
    created_at: r.created_at,
    processed_at: r.processed_at,
    user_name: r.users ? `${r.users.first_name} ${r.users.last_name}`.trim() : 'Unbekannt',
    user_email: r.users?.email ?? '',
  }))

  return { success: true, data: formatted }
})
