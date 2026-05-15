import { defineEventHandler, getQuery, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'

const TIMEZONE = 'Europe/Zurich'
const MONTH_KEYS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']

/** Returns the 0-based month index of a UTC timestamp, interpreted in Europe/Zurich. */
function zurichMonthIndex(isoString: string): number {
  return parseInt(
    new Intl.DateTimeFormat('en-US', { month: '2-digit', timeZone: TIMEZONE }).format(new Date(isoString))
  ) - 1
}

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const startDate = query.startDate as string
    const endDate = query.endDate as string

    const authUser = await getAuthenticatedUser(event)
    if (!authUser) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized - No valid session' })
    }

    const supabase = getSupabaseAdmin()

    // Resolve tenant
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('auth_user_id', authUser.id)
      .single()

    if (userError || !userData?.tenant_id) {
      throw createError({ statusCode: 403, statusMessage: 'User has no tenant assigned' })
    }

    const tenantId = userData.tenant_id

    // Tenant business type
    const { data: tenantData, error: tenantError } = await supabase
      .from('tenants')
      .select('business_type')
      .eq('id', tenantId)
      .single()

    if (tenantError) {
      throw createError({ statusCode: 500, statusMessage: 'Failed to load tenant data' })
    }

    // ── 1. Driving-school licence categories (dynamic, only for driving_school) ──
    let availableCategories: { code: string; name: string }[] = []
    if (tenantData?.business_type === 'driving_school') {
      const { data: categories } = await supabase
        .from('categories')
        .select('code, name')
        .eq('is_active', true)
        .eq('tenant_id', tenantId)
        .order('code')
      availableCategories = categories || []
    }

    // ── 2. All active event types for this tenant (dynamic columns) ─────────────
    const { data: eventTypesData } = await supabase
      .from('event_types')
      .select('code, name, emoji')
      .eq('is_active', true)
      .eq('tenant_id', tenantId)
      .order('display_order', { ascending: true })

    const availableEventTypes: { code: string; name: string; emoji: string }[] = eventTypesData || []

    // ── 3. All staff for this tenant ─────────────────────────────────────────────
    const { data: staffData, error: staffError } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, role, salary_type, weekly_contracted_hours, employment_percentage, fulltime_weekly_hours_override')
      .eq('role', 'staff')
      .eq('tenant_id', tenantId)

    if (staffError) {
      throw createError({ statusCode: 500, statusMessage: 'Failed to load staff data' })
    }

    const staffIds = (staffData || []).map((s: any) => s.id)

    // ── 4. Load ALL appointments for ALL staff in ONE query ──────────────────────
    let allActive: any[] = []
    let allCancelled: any[] = []

    if (staffIds.length > 0) {
      const [activeRes, cancelledRes] = await Promise.all([
        supabase
          .from('appointments')
          .select('id, staff_id, start_time, duration_minutes, event_type_code, type, status')
          .in('staff_id', staffIds)
          .eq('tenant_id', tenantId)
          .gte('start_time', startDate)
          .lt('start_time', endDate)
          .neq('status', 'cancelled')
          .limit(10000),
        supabase
          .from('appointments')
          .select('id, staff_id, start_time, duration_minutes, event_type_code, type')
          .in('staff_id', staffIds)
          .eq('tenant_id', tenantId)
          .gte('start_time', startDate)
          .lt('start_time', endDate)
          .eq('status', 'cancelled')
          .limit(10000),
      ])
      allActive = activeRes.data || []
      allCancelled = cancelledRes.data || []
      logger.debug(`📊 Loaded ${allActive.length} active / ${allCancelled.length} cancelled appointments`)
    }

    // Pre-group by staff_id for O(n) lookups
    const activeByStaff: Record<string, any[]> = {}
    const cancelledByStaff: Record<string, any[]> = {}
    staffIds.forEach((id: string) => { activeByStaff[id] = []; cancelledByStaff[id] = [] })
    allActive.forEach((a: any) => { activeByStaff[a.staff_id]?.push(a) })
    allCancelled.forEach((a: any) => { cancelledByStaff[a.staff_id]?.push(a) })

    // ── 5. Aggregate per-staff statistics ────────────────────────────────────────
    const staffWithHours = (staffData || []).map((staff: any) => {
      const apts = activeByStaff[staff.id] || []
      const cancelled = cancelledByStaff[staff.id] || []

      const totalHours = apts.reduce((s: number, a: any) => s + (a.duration_minutes || 0), 0) / 60

      // Licence-category stats (driving_school only)
      const categoryStats: Record<string, { count: number; hours: number }> = {}
      availableCategories.forEach((cat) => { categoryStats[cat.code] = { count: 0, hours: 0 } })

      // Event-type stats — dynamic, all known types initialised to 0
      const eventTypeStats: Record<string, number> = {}
      availableEventTypes.forEach((et) => { eventTypeStats[et.code] = 0 })

      let vacationHours = 0

      apts.forEach((a: any) => {
        const hours = (a.duration_minutes || 0) / 60
        const etCode = a.event_type_code || ''
        const catCode = a.type || ''

        // Licence-category
        if (categoryStats[catCode]) {
          categoryStats[catCode].count++
          categoryStats[catCode].hours += hours
        }

        // Event-type (dynamic)
        if (etCode in eventTypeStats) {
          eventTypeStats[etCode] += hours
        } else if (etCode) {
          // Unknown code (not in tenant's event_types) → still track it
          eventTypeStats[etCode] = (eventTypeStats[etCode] || 0) + hours
        }

        // Vacation tracked separately for salary calculations
        if (etCode === 'vacation') {
          vacationHours += hours
        }
      })

      // Round all event-type values
      Object.keys(eventTypeStats).forEach((k) => {
        eventTypeStats[k] = Math.round(eventTypeStats[k] * 100) / 100
      })

      const cancelledHours = cancelled.reduce((s: number, a: any) => s + (a.duration_minutes || 0), 0) / 60
      const lastApt = apts.length > 0
        ? apts.slice().sort((a: any, b: any) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())[0]
        : null

      return {
        ...staff,
        appointment_count: apts.length,
        total_hours: Math.round(totalHours * 100) / 100,
        vacation_hours: Math.round(vacationHours * 100) / 100,
        average_hours: apts.length > 0 ? totalHours / apts.length : 0,
        last_appointment: lastApt?.start_time || null,
        cancelled_count: cancelled.length,
        cancelled_hours: Math.round(cancelledHours * 100) / 100,
        category_stats: categoryStats,
        event_type_stats: eventTypeStats,
      }
    })

    // ── 6. Monthly breakdown — read from staff_monthly_hours table ───────────────
    // Extract the year from startDate for the table lookup
    const year = new Date(startDate).getFullYear()

    const { data: monthlyRecords } = await supabase
      .from('staff_monthly_hours')
      .select('staff_id, month, actual_hours, vacation_hours')
      .in('staff_id', staffIds)
      .eq('tenant_id', tenantId)
      .eq('year', year)

    // Build lookup: staffId → monthKey → hours (actual + vacation = total)
    const staffMonthlyHours: Record<string, Record<string, number>> = {}

    staffWithHours.forEach((staff: any) => {
      const monthlyHours: Record<string, number> = {}
      MONTH_KEYS.forEach((m) => { monthlyHours[m] = 0 })
      staffMonthlyHours[staff.id] = monthlyHours
    })

    if ((monthlyRecords || []).length > 0) {
      // Data available from pre-computed table
      ;(monthlyRecords || []).forEach((r: any) => {
        const mKey = MONTH_KEYS[r.month - 1]
        if (mKey && staffMonthlyHours[r.staff_id]) {
          const total = (parseFloat(r.actual_hours) || 0) + (parseFloat(r.vacation_hours) || 0)
          staffMonthlyHours[r.staff_id][mKey] = Math.round(total * 100) / 100
        }
      })
    } else {
      // Fallback: aggregate live from appointments (used until first recalculate)
      logger.debug('⚠️ No staff_monthly_hours records found, falling back to live aggregation')
      staffWithHours.forEach((staff: any) => {
        ;(activeByStaff[staff.id] || []).forEach((apt: any) => {
          if (!apt.start_time) return
          const mIdx = zurichMonthIndex(apt.start_time)
          const mKey = MONTH_KEYS[mIdx]
          if (mKey) staffMonthlyHours[staff.id][mKey] += (apt.duration_minutes || 0) / 60
        })
        MONTH_KEYS.forEach((m) => {
          staffMonthlyHours[staff.id][m] = Math.round(staffMonthlyHours[staff.id][m] * 100) / 100
        })
      })
    }

    // Expose whether data came from the pre-computed table (so frontend can show a "refresh" hint)
    const monthlyHoursFromCache = (monthlyRecords || []).length > 0

    // ── 7. Summary ───────────────────────────────────────────────────────────────
    const activeStaff = staffWithHours.filter((s: any) => s.appointment_count > 0).length
    const totalHours = staffWithHours.reduce((s: number, st: any) => s + st.total_hours, 0)
    const totalAppointments = staffWithHours.reduce((s: number, st: any) => s + st.appointment_count, 0)

    logger.debug('✅ Staff hours loaded:', staffWithHours.length, 'staff members')

    return {
      success: true,
      staffWithHours,
      staffMonthlyHours,
      monthlyHoursFromCache,
      availableCategories,
      availableEventTypes,
      summary: {
        activeStaff,
        totalHours,
        averageHours: activeStaff > 0 ? totalHours / activeStaff : 0,
        totalAppointments,
      },
    }
  } catch (error: any) {
    logger.error('❌ Error in get-staff-hours API:', error.message)
    throw error
  }
})

async function getAuthenticatedUser(event: any) {
  try {
    const supabase = getSupabaseAdmin()
    const authHeader = event.node.req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) return null
    const token = authHeader.substring(7)
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error || !user) return null
    return user
  } catch {
    return null
  }
}
