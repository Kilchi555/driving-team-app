import { defineEventHandler, getQuery } from 'h3'
import { getSupabaseServiceClient } from '~/utils/supabase-service'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const startDate = query.startDate as string
    const endDate = query.endDate as string

    // Get authenticated user
    const authUser = await getAuthenticatedUser(event)
    if (!authUser) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized - No valid session'
      })
    }

    const supabase = getSupabaseServiceClient()

    // Get user's tenant_id
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('auth_user_id', authUser.id)
      .single()

    if (userError || !userData?.tenant_id) {
      logger.debug('⚠️ Could not find tenant for auth user:', authUser.id)
      throw createError({
        statusCode: 403,
        statusMessage: 'User has no tenant assigned'
      })
    }

    const tenantId = userData.tenant_id

    // Get tenant business_type
    const { data: tenantData, error: tenantError } = await supabase
      .from('tenants')
      .select('business_type')
      .eq('id', tenantId)
      .single()

    if (tenantError) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to load tenant data'
      })
    }

    // Only load categories if business_type is driving_school
    let availableCategories = []
    if (tenantData?.business_type === 'driving_school') {
      const { data: categories, error: categoriesError } = await supabase
        .from('categories')
        .select('code, name')
        .eq('is_active', true)
        .eq('tenant_id', tenantId)
        .order('code')

      if (!categoriesError) {
        availableCategories = categories || []
      }
    }

    // Load all staff for this tenant
    const { data: staffData, error: staffError } = await supabase
      .from('users')
      .select(`
        id,
        first_name,
        last_name,
        email,
        role
      `)
      .eq('role', 'staff')
      .eq('tenant_id', tenantId)

    if (staffError) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to load staff data'
      })
    }

    // For each staff member, calculate hours statistics
    const staffWithHours = await Promise.all(
      (staffData || []).map(async (staff) => {
        // Load active appointments
        const { data: appointments, error: appointmentsError } = await supabase
          .from('appointments')
          .select(`
            id,
            start_time,
            duration_minutes,
            event_type_code,
            type,
            status
          `)
          .eq('staff_id', staff.id)
          .eq('tenant_id', tenantId)
          .gte('start_time', startDate)
          .lt('start_time', endDate)
          .neq('status', 'cancelled')

        // Load cancelled appointments
        const { data: cancelledAppointments, error: cancelledError } = await supabase
          .from('appointments')
          .select(`
            id,
            start_time,
            duration_minutes,
            event_type_code,
            type,
            status
          `)
          .eq('staff_id', staff.id)
          .eq('tenant_id', tenantId)
          .gte('start_time', startDate)
          .lt('start_time', endDate)
          .eq('status', 'cancelled')

        if (appointmentsError || cancelledError) {
          logger.debug(`⚠️ Error loading appointments for staff ${staff.id}`)
          return {
            ...staff,
            appointment_count: 0,
            total_hours: 0,
            average_hours: 0,
            last_appointment: null,
            cancelled_count: 0,
            cancelled_hours: 0,
            category_stats: {},
            vku_hours: 0,
            nhk_hours: 0,
            pgs_hours: 0,
            fl_wb_hours: 0,
            rest_hours: 0
          }
        }

        const totalMinutes = (appointments || []).reduce((sum, apt) => sum + (apt.duration_minutes || 0), 0)
        const totalHours = totalMinutes / 60

        // Calculate hours per category
        const categoryStats: Record<string, { count: number; hours: number }> = {}
        availableCategories.forEach((cat: any) => {
          categoryStats[cat.code] = { count: 0, hours: 0 }
        })

        // Initialize event-type statistics
        let vkuHours = 0
        let nhkHours = 0
        let pgsHours = 0
        let flWbHours = 0
        let restHours = 0

        // Count appointments per category and event-type
        (appointments || []).forEach((apt) => {
          const category = apt.type || 'unknown'
          const eventType = apt.event_type_code || 'unknown'
          const hours = (apt.duration_minutes || 0) / 60

          if (categoryStats[category]) {
            categoryStats[category].count++
            categoryStats[category].hours += hours
          }

          switch (eventType) {
            case 'vku':
              vkuHours += hours
              break
            case 'nhk':
              nhkHours += hours
              break
            case 'pgs':
              pgsHours += hours
              break
            case 'fl-wb':
              flWbHours += hours
              break
            default:
              if (!['lesson', 'exam', 'theory'].includes(eventType)) {
                restHours += hours
              }
              break
          }
        })

        // Calculate cancelled appointments
        const cancelledCount = (cancelledAppointments || []).length
        const cancelledHours = (cancelledAppointments || []).reduce((sum, apt) => sum + (apt.duration_minutes || 0), 0) / 60 || 0

        // Last appointment
        const lastAppointment = (appointments || []).length > 0
          ? (appointments || []).sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())[0]
          : null

        return {
          ...staff,
          appointment_count: (appointments || []).length,
          total_hours: totalHours,
          average_hours: (appointments || []).length > 0 ? totalHours / (appointments || []).length : 0,
          last_appointment: lastAppointment?.start_time,
          cancelled_count: cancelledCount,
          cancelled_hours: cancelledHours,
          category_stats: categoryStats,
          vku_hours: vkuHours,
          nhk_hours: nhkHours,
          pgs_hours: pgsHours,
          fl_wb_hours: flWbHours,
          rest_hours: restHours
        }
      })
    )

    // Calculate summary
    const activeStaff = staffWithHours.filter(s => s.appointment_count > 0).length
    const totalHours = staffWithHours.reduce((sum, s) => sum + s.total_hours, 0)
    const totalAppointments = staffWithHours.reduce((sum, s) => sum + s.appointment_count, 0)

    // Calculate monthly hours for each staff
    const months = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
    const staffMonthlyHours: Record<string, Record<string, number>> = {}

    staffWithHours.forEach((staff) => {
      const monthlyHours: Record<string, number> = {}
      months.forEach((_, index) => {
        monthlyHours[months[index]] = 0
      })

      const staffAppointments = staffData.find(s => s.id === staff.id) ? (
        staffData.find(s => s.id === staff.id)?.appointments || []
      ) : []

      staffMonthlyHours[staff.id] = monthlyHours
    })

    logger.debug('✅ Staff hours loaded:', staffWithHours.length, 'staff members')

    return {
      success: true,
      staffWithHours,
      staffMonthlyHours,
      availableCategories,
      summary: {
        activeStaff,
        totalHours,
        averageHours: activeStaff > 0 ? totalHours / activeStaff : 0,
        totalAppointments
      }
    }

  } catch (error: any) {
    logger.error('❌ Error in get-staff-hours API:', error.message)
    throw error
  }
})

// Helper function to get authenticated user
async function getAuthenticatedUser(event: any) {
  try {
    const supabase = getSupabaseServiceClient()
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
