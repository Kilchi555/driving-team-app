// server/api/admin/complete-withdrawal.post.ts
// Mark one or all pending withdrawals as completed after bank transfer is done

import { defineEventHandler, readBody, getHeader, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  const supabase = getSupabaseAdmin()

  try {
    // ── Auth + Admin check ────────────────────────────────
    const authHeader = getHeader(event, 'authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
    }
    const token = authHeader.substring(7)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) throw createError({ statusCode: 401, statusMessage: 'Invalid authentication' })

    const { data: adminUser } = await supabase
      .from('users')
      .select('id, role, tenant_id')
      .eq('auth_user_id', user.id)
      .single()

    if (!adminUser || !['admin', 'staff'].includes(adminUser.role)) {
      throw createError({ statusCode: 403, statusMessage: 'Nur Admins können Auszahlungen bestätigen' })
    }

    const body = await readBody(event)
    // userId: single withdrawal, or 'all' for all pending
    const { userId, all } = body

    if (!userId && !all) {
      throw createError({ statusCode: 400, statusMessage: 'userId oder all=true erforderlich' })
    }

    const now = new Date().toISOString()

    // ── Fetch target credits ──────────────────────────────
    let query = supabase
      .from('student_credits')
      .select(`
        id,
        user_id,
        balance_rappen,
        pending_withdrawal_rappen,
        completed_withdrawal_rappen,
        users!inner ( id, first_name, last_name, email, tenant_id )
      `)
      .gt('pending_withdrawal_rappen', 0)
      .eq('users.tenant_id', adminUser.tenant_id)

    if (!all) query = query.eq('user_id', userId)

    const { data: credits, error: fetchError } = await query
    if (fetchError) throw fetchError
    if (!credits || credits.length === 0) {
      throw createError({ statusCode: 404, statusMessage: 'Keine ausstehenden Auszahlungen gefunden' })
    }

    const results = []

    for (const credit of credits) {
      const amount = credit.pending_withdrawal_rappen
      const newBalance = Math.max(0, credit.balance_rappen - amount)
      const newCompleted = (credit.completed_withdrawal_rappen || 0) + amount

      // Update student_credits
      await supabase
        .from('student_credits')
        .update({
          balance_rappen: newBalance,
          pending_withdrawal_rappen: 0,
          completed_withdrawal_rappen: newCompleted,
          last_withdrawal_status: 'completed',
          updated_at: now
        })
        .eq('id', credit.id)

      // Update credit_transaction to completed (or insert if none exists)
      const { data: existingTx } = await supabase
        .from('credit_transactions')
        .select('id')
        .eq('user_id', credit.user_id)
        .eq('status', 'withdrawal_pending')
        .maybeSingle()

      if (existingTx) {
        await supabase
          .from('credit_transactions')
          .update({ status: 'withdrawal_completed', updated_at: now })
          .eq('id', existingTx.id)
      } else {
        await supabase.from('credit_transactions').insert({
          user_id: credit.user_id,
          tenant_id: (credit as any).users?.tenant_id || adminUser.tenant_id,
          transaction_type: 'withdrawal',
          amount_rappen: -amount,
          balance_before_rappen: credit.balance_rappen,
          balance_after_rappen: newBalance,
          payment_method: 'bank_transfer',
          reference_type: 'manual',
          created_by: adminUser.id,
          status: 'withdrawal_completed',
          notes: `Auszahlung per Banküberweisung (CHF ${(amount / 100).toFixed(2)})`
        })
      }

      // Notify customer
      const u = (credit as any).users
      try {
        await $fetch('/api/email/send-withdrawal-notification', {
          method: 'POST',
          body: {
            type: 'withdrawal_completed',
            email: u.email,
            studentName: `${u.first_name} ${u.last_name}`.trim(),
            amountChf: (amount / 100).toFixed(2)
          }
        })
      } catch (e) {
        logger.warn('⚠️ Could not send completion email to:', u.email)
      }

      results.push({ userId: credit.user_id, amountChf: (amount / 100).toFixed(2) })
      logger.debug('✅ Withdrawal completed:', { userId: credit.user_id, amount })
    }

    return { success: true, processed: results.length, results }

  } catch (error: any) {
    if (error.statusCode) throw error
    logger.error('❌ complete-withdrawal error:', error)
    throw createError({ statusCode: 500, statusMessage: 'Interner Fehler' })
  }
})
