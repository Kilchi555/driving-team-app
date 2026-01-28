// server/api/staff/get-working-hours.get.ts
import { defineEventHandler, createError, getQuery } from 'h3'
import { getAuthenticatedUserWithDbId } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  try {
    // Get authenticated user with database ID
    const user = await getAuthenticatedUserWithDbId(event)
    
    if (!user || !user.id) {
      console.log(`[${new Date().toLocaleTimeString()}] ⚠️ get-working-hours: No authenticated user found - returning empty`)
      // Return empty result instead of error - better UX when not logged in
      return {
        success: true,
        workingHours: [],
        staffId: null
      }
    }
    
    const supabase = getSupabaseAdmin()
    const query = getQuery(event)
    
    // Use staffId from query or current user's id
    const staffId = query.staffId as string || user.id
    
    console.log(`[${new Date().toLocaleTimeString()}] 🔒 Loading working hours for staff:`, staffId)
    
    // Load working hours
    const { data: workingHours, error } = await supabase
      .from('staff_working_hours')
      .select('*')
      .eq('staff_id', staffId)
      .order('day_of_week')
    
    if (error) {
      console.error(`[${new Date().toLocaleTimeString()}] ❌ Error loading working hours:`, error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to load working hours'
      })
    }
    
    console.log(`[${new Date().toLocaleTimeString()}] ✅ Working hours loaded:`, workingHours?.length || 0)
    
    return {
      success: true,
      workingHours: workingHours || [],
      staffId
    }
    
  } catch (error: any) {
    console.error(`[${new Date().toLocaleTimeString()}] ❌ Error in get-working-hours API:`, error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Internal server error'
    })
  }
})
