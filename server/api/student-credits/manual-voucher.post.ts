import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { logger } from '~/utils/logger'
import { assertStaffCanApplyManualDiscount } from '~/server/utils/staff-manual-discount'

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser?.id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const supabaseAdmin = getSupabaseAdmin()

  const { data: userProfile } = await supabaseAdmin
    .from('users')
    .select('id, tenant_id, role')
    .eq('auth_user_id', authUser.id)
    .single()

  if (!userProfile?.tenant_id) {
    throw createError({ statusCode: 403, statusMessage: 'User profile not found' })
  }

  const allowedRoles = ['staff', 'admin', 'super_admin', 'tenant_admin', 'instructor']
  if (!allowedRoles.includes(userProfile.role)) {
    throw createError({ statusCode: 403, message: 'Insufficient permissions' })
  }

  await assertStaffCanApplyManualDiscount({
    tenantId: userProfile.tenant_id,
    role: userProfile.role,
    isManualDiscount: true
  })

  const body = await readBody(event)
  const { user_id, amount_rappen, notes } = body

  if (!user_id || !amount_rappen || amount_rappen <= 0) {
    throw createError({
      statusCode: 400,
      message: 'Missing or invalid required fields: user_id, amount_rappen (must be > 0)'
    })
  }

  const { data: student } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('id', user_id)
    .eq('tenant_id', userProfile.tenant_id)
    .maybeSingle()

  if (!student) {
    throw createError({ statusCode: 404, message: 'Student not found' })
  }

  const { data: currentCredit } = await supabaseAdmin
    .from('student_credits')
    .select('balance_rappen')
    .eq('user_id', user_id)
    .eq('tenant_id', userProfile.tenant_id)
    .maybeSingle()

  const currentBalance = currentCredit?.balance_rappen || 0
  const newBalance = currentBalance + amount_rappen
  const note = (typeof notes === 'string' && notes.trim())
    ? `Gutschein erfasst: ${notes.trim()}`
    : 'Gutschein erfasst'

  try {
    const { error: creditError } = await supabaseAdmin
      .from('student_credits')
      .upsert({
        user_id,
        tenant_id: userProfile.tenant_id,
        balance_rappen: newBalance,
        notes: note,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,tenant_id' })

    if (creditError) throw creditError

    const { error: txError } = await supabaseAdmin
      .from('credit_transactions')
      .insert({
        user_id,
        tenant_id: userProfile.tenant_id,
        transaction_type: 'voucher',
        amount_rappen,
        balance_before_rappen: currentBalance,
        balance_after_rappen: newBalance,
        payment_method: 'voucher',
        reference_type: 'manual',
        created_by: userProfile.id,
        notes: note,
        created_at: new Date().toISOString()
      })

    if (txError) throw txError

    logger.info('✅ Manual voucher credit applied:', {
      userId: user_id,
      amount: amount_rappen,
      newBalance,
      createdBy: userProfile.id
    })

    return {
      success: true,
      data: {
        userId: user_id,
        amountDeposited: amount_rappen,
        previousBalance: currentBalance,
        newBalance
      }
    }
  } catch (err: any) {
    logger.error('Error during manual voucher credit:', err)
    throw createError({
      statusCode: 500,
      message: 'Failed to apply voucher credit'
    })
  }
})
