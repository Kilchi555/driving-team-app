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
      console.log(`[${new Date().toLocaleTimeString()}] ⚠️ get-working-hours: No authenticated user found - returning 401`)
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
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
    
    // Times in DB are Zurich wall-clock values (e.g. "07:00:00") — no timezone
    // conversion needed. Just normalize to HH:MM:SS format.
    const normalizeTime = (timeStr: string): string => {
      if (!timeStr) return timeStr
      const m = timeStr.match(/^(\d{1,2}):(\d{2})/)
      if (!m) return timeStr
      return `${m[1].padStart(2, '0')}:${m[2].padStart(2, '0')}:00`
    }

    const convertedHours = (workingHours || []).map((wh: any) => ({
      ...wh,
      start_time: normalizeTime(wh.start_time),
      end_time: normalizeTime(wh.end_time)
    }))

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
