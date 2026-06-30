/**
 * POST /api/appointments/create-vacation-range
 * Creates vacation appointments for each working day (Mon–Fri) between startDate and endDate.
 * Each appointment spans the full contracted work day (daily_hours based on weekly_contracted_hours/5).
 * Body: { startDate: 'YYYY-MM-DD', endDate: 'YYYY-MM-DD', staffId: string, startTime?: 'HH:MM', locationId?: string }
 */
import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { logger } from '~/utils/logger'
import { mapSupabaseError } from '~/server/utils/supabase-error'

const TIMEZONE = 'Europe/Zurich'

function localDateParts(dateStr: string, timeStr: string) {
  // Build an ISO string in Zurich time and convert to UTC for DB storage
  const local = new Date(`${dateStr}T${timeStr}:00`)
  // Force interpretation as Zurich local time via Intl
  const zurichFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false
  })
  // We just pass the date string directly – Supabase stores with TZ, so we build a proper ISO
  return `${dateStr}T${timeStr}:00`
}

function isWeekend(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00') // noon to avoid DST edge cases
  return d.getDay() === 0 // nur Sonntag ausschliessen; Samstag ist Arbeitstag
}

function addDays(dateStr: string, n: number) {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

function getWorkingDaysBetween(start: string, end: string): string[] {
  const days: string[] = []
  let current = start
  while (current <= end) {
    if (!isWeekend(current)) days.push(current)
    current = addDays(current, 1)
  }
  return days
}

export default defineEventHandler(async (event) => {
  try {
    const authUser = await getAuthenticatedUser(event)
    if (!authUser?.tenant_id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

    const body = await readBody(event)
    const { startDate, endDate, staffId, locationId = null } = body

    if (!startDate || !endDate || !staffId) {
      throw createError({ statusCode: 400, statusMessage: 'startDate, endDate and staffId are required' })
    }

    if (startDate > endDate) {
      throw createError({ statusCode: 400, statusMessage: 'startDate must be before or equal to endDate' })
    }

    const tenantId = authUser.tenant_id

    // Load staff's weekly_contracted_hours to derive daily hours
    const { data: staffUser } = await getSupabaseAdmin()
      .from('users')
      .select('id, weekly_contracted_hours')
      .eq('id', staffId)
      .eq('tenant_id', tenantId)
      .single()

    if (!staffUser) throw createError({ statusCode: 404, statusMessage: 'Staff not found' })

    // Calendar block: always 07:00–19:00 (720 min) to prevent customer bookings.
    // The actual vacation hours are calculated separately by the calculator (distinct days × daily_hours).
    const VACATION_START = '07:00'
    const VACATION_DURATION_MINUTES = 720 // 07:00–19:00

    // Get vacation event type (system or tenant-level)
    const supabase = getSupabaseAdmin()
    const { data: vacationType } = await supabase
      .from('event_types')
      .select('id, name')
      .eq('code', 'vacation')
      .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
      .order('display_order', { ascending: true })
      .limit(1)
      .maybeSingle()

    const workingDays = getWorkingDaysBetween(startDate, endDate)

    if (workingDays.length === 0) {
      return { success: true, created: 0, message: 'No working days in the selected range' }
    }

    // Build appointment rows (no user_id – vacation has no student)
    const appointments = workingDays.map((day) => {
      const startISO = `${day}T${VACATION_START}:00`
      const endDate = new Date(new Date(startISO).getTime() + VACATION_DURATION_MINUTES * 60 * 1000)
      const endISO = endDate.toISOString()
      return {
        tenant_id: tenantId,
        staff_id: staffId,
        start_time: startISO,
        end_time: endISO,
        duration_minutes: VACATION_DURATION_MINUTES,
        event_type_code: 'vacation',
        title: 'Ferien',
        description: '',
        status: 'confirmed',
        location_id: locationId,
        type: null,
        user_id: null,
      }
    })

    const { data: inserted, error: insertError } = await supabase
      .from('appointments')
      .insert(appointments)
      .select('id')

    if (insertError) {
      logger.error('❌ Error creating vacation appointments:', insertError.message)
      throw createError({ statusCode: 500, statusMessage: insertError.message })
    }

    logger.debug(`✅ Created ${inserted?.length ?? 0} vacation appointments for staff ${staffId}`)

    // Trigger recalculation for all affected months (past months only – current month excluded by calculator)
    const affectedMonths = [...new Set(workingDays.map(d => parseInt(d.slice(5, 7))))]
    const affectedYears  = [...new Set(workingDays.map(d => parseInt(d.slice(0, 4))))]
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1

    for (const year of affectedYears) {
      const monthsToRecalc = affectedMonths
        .filter(m => year < currentYear || (year === currentYear && m < currentMonth))
      if (monthsToRecalc.length > 0) {
        try {
          await $fetch('/api/admin/staff-monthly-hours', {
            method: 'POST',
            body: { action: 'recalculate', staffId, year, months: monthsToRecalc }
          })
          logger.debug(`✅ Recalculated months ${monthsToRecalc} for year ${year}`)
        } catch (recalcErr: any) {
          logger.warn('⚠️ Could not auto-recalculate after vacation insert:', recalcErr.message)
        }
      }
    }

    return { success: true, created: inserted?.length ?? 0, days: workingDays }
  } catch (error: any) {
    logger.error('❌ Error in create-vacation-range:', error.message)
    throw mapSupabaseError(error)
  }
})
