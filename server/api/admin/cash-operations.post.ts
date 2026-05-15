import { defineEventHandler, readBody, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event, ['admin', 'superadmin'])
  const supabase = getSupabaseAdmin()

  const body = await readBody<{
    action: 'deposit' | 'withdraw'
    register_id: string
    amount_rappen: number
    notes?: string
  }>(event)

  const { action, register_id, amount_rappen, notes } = body

  if (!action || !register_id || !amount_rappen) {
    throw createError({ statusCode: 400, statusMessage: 'Missing required fields: action, register_id, amount_rappen' })
  }

  // Verify the register belongs to the caller's tenant
  const { data: register } = await supabase
    .from('office_cash_registers')
    .select('id, tenant_id')
    .eq('id', register_id)
    .single()

  if (!register || register.tenant_id !== profile.tenant_id) {
    throw createError({ statusCode: 404, statusMessage: 'Register not found' })
  }

  logger.debug(`💰 Processing cash ${action} operation`, { register_id, amount_rappen, action })

  let result
  if (action === 'deposit') {
    result = await supabase.rpc('office_cash_deposit', {
      p_register_id: register_id,
      p_amount_rappen: amount_rappen,
      p_notes: notes || null
    })
  } else if (action === 'withdraw') {
    result = await supabase.rpc('office_cash_withdrawal', {
      p_register_id: register_id,
      p_amount_rappen: amount_rappen,
      p_notes: notes || null
    })
  } else {
    throw createError({ statusCode: 400, statusMessage: `Invalid action: ${action}` })
  }

  if (result.error) throw createError({ statusCode: 500, statusMessage: result.error.message })

  logger.debug(`✅ Cash ${action} operation successful`)
  return { success: true, message: `Cash ${action} completed successfully`, data: result.data }
})
