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
import { zurichWallTimeToUtc } from '~/server/utils/zurich-wall-time'

/** 07:00–19:00 Europe/Zurich as UTC ISO, DST-safe. */
function vacationBoundsUtc(day: string): { startISO: string; endISO: string; durationMinutes: number } {
  const [year, month, date] = day.split('-').map(Number)
  const start = zurichWallTimeToUtc(year, month - 1, date, 7, 0)
  const end = zurichWallTimeToUtc(year, month - 1, date, 19, 0)
  return {
    startISO: start.toISOString(),
    endISO: end.toISOString(),
    durationMinutes: Math.round((end.getTime() - start.getTime()) / 60000),
  }
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

    // Calendar block: 07:00–19:00 Europe/Zurich so early morning slots are covered.
    // Vacation hours for payroll are calculated separately (distinct days × daily_hours).

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
      const { startISO, endISO, durationMinutes } = vacationBoundsUtc(day)
      return {
        tenant_id: tenantId,
        staff_id: staffId,
        start_time: startISO,
        end_time: endISO,
        duration_minutes: durationMinutes,
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

    $fetch('/api/availability/queue-recalc', {
      method: 'POST',
      body: { staff_id: staffId, tenant_id: tenantId, trigger: 'appointment' },
    }).catch((err: any) => {
      logger.warn('⚠️ Could not queue availability recalc after vacation insert:', err?.message)
    })

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
