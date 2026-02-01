import { defineEventHandler, readBody } from 'h3'
import { getServerSession } from '#auth'
import { useSupabaseAdmin } from '~/composables/useSupabaseAdmin'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    // Authenticate user
    const session = await getServerSession(event)
    if (!session?.user) {
      throw new Error('Unauthorized')
    }

    // Get Supabase admin
    const supabase = useSupabaseAdmin()

    // Parse request body
    const body = await readBody<{
      action: 'deposit' | 'withdraw'
      register_id: string
      amount_rappen: number
      notes?: string
    }>(event)

    const { action, register_id, amount_rappen, notes } = body

    if (!action || !register_id || !amount_rappen) {
      throw new Error('Missing required fields: action, register_id, amount_rappen')
    }

    logger.debug(`💰 Processing cash ${action} operation`, {
      register_id,
      amount_rappen,
      action
    })

    // Call the appropriate RPC function
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
      throw new Error(`Invalid action: ${action}`)
    }

    if (result.error) {
      throw result.error
    }

    logger.debug(`✅ Cash ${action} operation successful`)

    return {
      success: true,
      message: `Cash ${action} completed successfully`,
      data: result.data
    }
  } catch (err: any) {
    logger.error('❌ Error in cash operations endpoint:', err)
    throw createError({
      statusCode: err.statusCode || 400,
      statusMessage: err.message || `Failed to process cash operation`
    })
  }
})
