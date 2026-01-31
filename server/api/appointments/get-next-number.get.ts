// server/api/appointments/get-next-number.get.ts
import { getSupabaseAdmin } from '~/utils/supabase'
import { logger } from '~/utils/logger'
import { getHeader } from 'h3'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const { user_id } = query
    
    if (!user_id) {
      throw new Error('user_id is required')
    }
    
    logger.debug('📊 Getting next appointment number for user:', user_id)
    
    const supabaseAdmin = getSupabaseAdmin()
    const authorization = getHeader(event, 'authorization')
    const token = authorization?.replace('Bearer ', '')
    
    if (!token) {
      throw new Error('No authorization token')
    }
    
    // Get current user
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !user) {
      throw new Error('Unauthorized')
    }
    
    // Count completed/confirmed appointments for this user
    const { count, error } = await supabaseAdmin
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user_id)
      .in('status', ['completed', 'confirmed'])
    
    if (error) {
      logger.error('❌ Error counting appointments:', error)
      throw new Error(error.message)
    }
    
    const nextNumber = (count || 0) + 1
    
    logger.debug('✅ Next appointment number:', nextNumber)
    
    return {
      success: true,
      data: { number: nextNumber }
    }
    
  } catch (error: any) {
    logger.error('❌ Error in get-next-number:', error)
    throw createError({
      statusCode: 400,
      statusMessage: error.message || 'Failed to get next appointment number'
    })
  }
})
