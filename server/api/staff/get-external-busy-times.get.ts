// server/api/staff/get-external-busy-times.get.ts
import { defineEventHandler, createError } from 'h3'
import { getAuthenticatedUserWithDbId } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { SYNC_LOOKBACK_DAYS } from '~/server/utils/sync-external-calendars-job'

export default defineEventHandler(async (event) => {
  try {
    // ✅ Set cache headers: Cache for 30 seconds
    // EventModal может открываться несколько раз, но данные не меняются часто
    setHeader(event, 'Cache-Control', 'private, no-cache, max-age=0')
    
    // Get authenticated user with database ID
    const user = await getAuthenticatedUserWithDbId(event)
    
    if (!user || !user.id) {
      console.log(`[${new Date().toLocaleTimeString()}] ⚠️ get-external-busy-times: No authenticated user found - returning empty`)
      // Return empty result instead of error - better UX when not logged in
      return {
        success: true,
        busyTimes: [],
        staffId: null
      }
    }
    
    const supabase = getSupabaseAdmin()
    
    console.log(`[${new Date().toLocaleTimeString()}] 📅 Loading external busy times for staff:`, user.id)
    
    // Match sync window: last SYNC_LOOKBACK_DAYS .. now + 1 year
    // (previously only returned not-yet-ended events, so past ICS hours never showed)
    const now = new Date()
    const windowStart = new Date(now)
    windowStart.setDate(windowStart.getDate() - SYNC_LOOKBACK_DAYS)
    const oneYearFromNow = new Date(now)
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1)
    
    const { data: busyTimes, error } = await supabase
      .from('external_busy_times')
      .select('*')
      .eq('staff_id', user.id)
      .eq('tenant_id', user.tenant_id)
      .gte('end_time', windowStart.toISOString())
      .lte('start_time', oneYearFromNow.toISOString())
      .order('start_time')
    
    if (error) {
      console.error(`[${new Date().toLocaleTimeString()}] ❌ Error loading external busy times:`, error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to load external busy times'
      })
    }
    
    console.log(`[${new Date().toLocaleTimeString()}] ✅ External busy times loaded:`, busyTimes?.length || 0)
    
    return {
      success: true,
      busyTimes: busyTimes || [],
      staffId: user.id
    }
    
  } catch (error: any) {
    console.error(`[${new Date().toLocaleTimeString()}] ❌ Error in get-external-busy-times API:`, error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Internal server error'
    })
  }
})
