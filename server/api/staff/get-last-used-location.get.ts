import { defineEventHandler, getQuery, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const userId = query.user_id as string
    const staffId = query.staff_id as string

    // Get authenticated user
    const authUser = await getAuthenticatedUser(event)
    if (!authUser) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized - No valid session'
      })
    }

    // Validate parameters
    if (!userId || !staffId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required parameters: user_id, staff_id'
      })
    }

    const supabase = getSupabaseAdmin()

    // Get the user's tenant_id from auth user id
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('auth_user_id', authUser.id)
      .single()

    if (userError || !userData?.tenant_id) {
      logger.debug('⚠️ Could not find tenant for auth user:', authUser.id)
      return { data: null }
    }

    // Load last used location for this student-staff pair
    const { data, error } = await supabase
      .from('appointments')
      .select('location_id, custom_location_name, custom_location_address')
      .eq('user_id', userId)
      .eq('staff_id', staffId)
      .eq('tenant_id', userData.tenant_id)
      .eq('status', 'completed')
      .order('start_time', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      logger.debug('❌ Error loading appointments:', error)
      return { data: null }
    }

    // ✅ Debug: Log exactly what we found
    if (data) {
      logger.debug('📊 Last completed appointment for student-staff pair:', {
        hasLocationId: !!data.location_id,
        locationIdValue: data.location_id || 'null',
        hasCustomLocationName: !!data.custom_location_name,
        hasCustomLocationAddress: !!data.custom_location_address,
        customLocationName: data.custom_location_name || 'null',
        customLocationAddress: data.custom_location_address || 'null'
      })
    }

    // ✅ Only return location_id if it exists (don't use custom locations for auto-selection)
    // Custom locations should be manually re-entered by the user
    if (data?.location_id) {
      logger.debug('✅ Last used location loaded (from location_id):', data.location_id)
      return { data: { location_id: data.location_id } }
    } else if (data?.custom_location_name || data?.custom_location_address) {
      logger.debug('⚠️ Last appointment used custom location (not auto-selecting):', {
        name: data.custom_location_name,
        address: data.custom_location_address
      })
      return { data: null }
    }
    
    logger.debug('ℹ️ No completed appointments with location found')
    return { data: null }

  } catch (error: any) {
    logger.error('❌ Error in get-last-used-location API:', error.message)
    throw error
  }
})

// Helper function to get authenticated user
async function getAuthenticatedUser(event: any) {
  try {
    const supabase = getSupabaseAdmin()
    const authHeader = event.node.req.headers.authorization
    
    if (!authHeader?.startsWith('Bearer ')) {
      return null
    }

    const token = authHeader.substring(7)
    const { data: { user }, error } = await supabase.auth.getUser(token)
    
    if (error || !user) {
      return null
    }

    return user
  } catch {
    return null
  }
}
