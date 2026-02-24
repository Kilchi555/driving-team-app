// server/api/staff/get-working-hours.get.ts
import { defineEventHandler, createError, getQuery } from 'h3'
import { getAuthenticatedUserWithDbId } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  // Working hours change rarely → cache for 2 minutes
  setHeader(event, 'Cache-Control', 'private, max-age=120')

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
    
    // Convert UTC times to local time using the timezone stored per record
    // Uses Intl.DateTimeFormat to correctly handle DST (summer/winter time)
    const convertedHours = (workingHours || []).map((wh: any) => {
      const tz = wh.timezone || 'Europe/Zurich'

      const convertTime = (utcTime: string): string => {
        if (!utcTime) return utcTime
        const [hours, minutes] = utcTime.split(':').map(Number)
        const now = new Date()
        const utcDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hours, minutes, 0))
        // Use Intl to correctly convert UTC to the record's timezone (handles DST)
        const localStr = utcDate.toLocaleString('sv-SE', { timeZone: tz })
        const timePart = localStr.split(' ')[1] // "HH:MM:SS"
        return timePart || utcTime
      }

      return {
        ...wh,
        start_time: convertTime(wh.start_time),
        end_time: convertTime(wh.end_time)
      }
    })

    return {
      success: true,
      workingHours: convertedHours,
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
