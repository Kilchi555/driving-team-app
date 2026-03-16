// server/api/customer/get-withdrawal-status.get.ts
// Returns the customer's withdrawal preferences (masked IBAN) and pending withdrawal amount

import { defineEventHandler, getHeader, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  const supabase = getSupabaseAdmin()

  try {
    const authHeader = getHeader(event, 'authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
    }
    const token = authHeader.substring(7)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) throw createError({ statusCode: 401, statusMessage: 'Invalid authentication' })

    const { data: userProfile } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()
    if (!userProfile) throw createError({ statusCode: 404, statusMessage: 'User not found' })

    // Load withdrawal prefs (no iban_encrypted returned!)
    const { data: prefs } = await supabase
      .from('student_withdrawal_preferences')
      .select('iban_last4, account_holder, withdrawal_unlocked_at, iban_changed_at')
      .eq('user_id', userProfile.id)
      .maybeSingle()

    // Load pending withdrawal amount
    const { data: credit } = await supabase
      .from('student_credits')
      .select('pending_withdrawal_rappen')
      .eq('user_id', userProfile.id)
      .maybeSingle()

    return {
      success: true,
      ibanLast4: prefs?.iban_last4 || null,
      accountHolder: prefs?.account_holder || null,
      withdrawalUnlockedAt: prefs?.withdrawal_unlocked_at || null,
      ibanChangedAt: prefs?.iban_changed_at || null,
      pendingWithdrawalRappen: credit?.pending_withdrawal_rappen || 0
    }

  } catch (error: any) {
    if (error.statusCode) throw error
    logger.error('❌ get-withdrawal-status error:', error)
    throw createError({ statusCode: 500, statusMessage: 'Interner Fehler' })
  }
})
