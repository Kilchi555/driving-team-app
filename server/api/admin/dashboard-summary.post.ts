import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { toLocalTimeString } from '~/utils/dateUtils'

interface DashboardSummary {
  // Revenue (4 months)
  revenueMonths: Array<{
    name: string
    revenue: number
    paymentsCount: number
    pendingCount: number
    monthKey: string
  }>
  
  // Pending students
  pendingStudents: Array<{
    id: string
    first_name: string
    last_name: string
    email: string
    pending_payments_count: number
    total_pending_amount: number
  }>
  
  // Recent invoices
  recentInvoices: Array<{
    id: string
    customer_name: string
    total_amount_rappen: number
    created_at: string
    status: string
  }>
  
  // Recent activities
  recentActivities: Array<{
    id: number
    type: string
    icon: string
    title: string
    description: string
    amount: string
    time: string
  }>
  
  // Courses stats
  coursesStats: {
    active: number
    participants: number
    thisMonth: number
  }
  
  // Credits stats
  creditsStats: {
    studentsWithCredit: number
    totalCredit: number
  }
  
  // Cancellations stats
  cancellationsStats: {
    thisWeek: number
    thisMonth: number
    lastMonth: number
  }
  
  // Hours stats
  hoursStats: {
    today: number
    thisWeek: number
    thisMonth: number
  }
}

export default defineEventHandler(async (event) => {
  try {
    // ============ LAYER 1: AUTHENTICATION ============
    const user = await getAuthenticatedUser(event)
    if (!user) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }
    
    // Check admin role
    if (!['admin', 'staff'].includes(user.role || '')) {
      throw createError({ statusCode: 403, statusMessage: 'Forbidden: Admin access required' })
    }

    // ============ LAYER 2: RATE LIMITING ============
    const rateLimitKey = `dashboard_summary:${user.id}`
    const rateLimitResult = await checkRateLimit(rateLimitKey, 20, 60 * 1000) // 20 requests per minute
    if (!rateLimitResult.allowed) {
      throw createError({ statusCode: 429, statusMessage: 'Too many requests. Please try again later.' })
    }

    const tenantId = user.tenant_id
    if (!tenantId) {
      throw createError({ statusCode: 400, statusMessage: 'User has no tenant assigned' })
    }

    const supabase = getSupabaseAdmin()
    const now = new Date()

    logger.debug('📊 Loading dashboard summary for tenant:', tenantId)

    // ============ PARALLEL LOAD: All stats at once ============
    const [
      revenueMonthsData,
      pendingStudentsData,
      recentInvoicesData,
      recentActivitiesData,
      coursesStatsData,
      creditsStatsData,
      cancellationsStatsData,
      hoursStatsData
    ] = await Promise.all([
      loadRevenueMonths(supabase, tenantId, now),
      loadPendingStudents(supabase, tenantId),
      loadRecentInvoices(supabase, tenantId),
      loadRecentActivities(supabase, tenantId),
      loadCoursesStats(supabase, tenantId),
      loadCreditsStats(supabase, tenantId),
      loadCancellationsStats(supabase, tenantId, now),
      loadHoursStats(supabase, tenantId, now)
    ])

    const summary: DashboardSummary = {
      revenueMonths: revenueMonthsData,
      pendingStudents: pendingStudentsData,
      recentInvoices: recentInvoicesData,
      recentActivities: recentActivitiesData,
      coursesStats: coursesStatsData,
      creditsStats: creditsStatsData,
      cancellationsStats: cancellationsStatsData,
      hoursStats: hoursStatsData
    }

    logger.debug('✅ Dashboard summary loaded successfully')

    return { success: true, data: summary, error: null }
  } catch (error: any) {
    logger.error('❌ Error loading dashboard summary:', error)
    return {
      success: false,
      data: null,
      error: error.statusMessage || 'Failed to load dashboard summary'
    }
  }
})

// ============ HELPER FUNCTIONS ============

async function loadRevenueMonths(
  supabase: any,
  tenantId: string,
  now: Date
) {
  try {
    const months = []

    // Get current month and 3 previous months
    for (let i = 0; i < 4; i++) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1)
      const monthEnd = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59, 999)

      const monthStartStr = toLocalTimeString(monthStart)
      const monthEndStr = toLocalTimeString(monthEnd)

      // Load completed/paid payments
      const { data: completedPayments } = await supabase
        .from('payments')
        .select('total_amount_rappen, payment_status')
        .eq('tenant_id', tenantId)
        .in('payment_status', ['completed', 'paid', 'cash'])
        .gte('created_at', monthStartStr)
        .lte('created_at', monthEndStr)

      // Load pending payments
      const { data: pendingPayments } = await supabase
        .from('payments')
        .select('total_amount_rappen, payment_status')
        .eq('tenant_id', tenantId)
        .eq('payment_status', 'pending')
        .gte('created_at', monthStartStr)
        .lte('created_at', monthEndStr)

      const totalRevenue = completedPayments?.reduce((sum, p) => sum + (p.total_amount_rappen || 0), 0) || 0
      const paymentsCount = completedPayments?.length || 0
      const pendingCount = pendingPayments?.length || 0

      // Format month name
      const monthNames = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
        'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']
      const monthName = i === 0 ? 'Aktuell' : monthNames[targetDate.getMonth()]

      months.push({
        name: monthName,
        revenue: totalRevenue,
        paymentsCount,
        pendingCount,
        monthKey: `${targetDate.getFullYear()}-${targetDate.getMonth() + 1}`
      })
    }

    return months
  } catch (error) {
    logger.error('Error loading revenue months:', error)
    return []
  }
}

async function loadPendingStudents(supabase: any, tenantId: string) {
  try {
    // Get all pending payments - FILTERED BY TENANT
    const { data: pendingPayments, error: paymentsError } = await supabase
      .from('payments')
      .select('id, user_id, total_amount_rappen, payment_status, payment_method, created_at')
      .eq('payment_status', 'pending')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    if (paymentsError) {
      logger.warn('⚠️ Error loading pending payments:', paymentsError)
      return []
    }

    if (!pendingPayments || pendingPayments.length === 0) {
      return []
    }

    // Get user names for the pending payments
    const userIds = [...new Set(pendingPayments.map(p => p.user_id).filter(Boolean))]
    let userNames: Record<string, { first_name: string; last_name: string; email: string }> = {}

    if (userIds.length > 0) {
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, first_name, last_name, email')
        .in('id', userIds)

      if (!usersError && users) {
        userNames = users.reduce((acc, user) => {
          acc[user.id] = {
            first_name: user.first_name || '',
            last_name: user.last_name || '',
            email: user.email || ''
          }
          return acc
        }, {} as Record<string, { first_name: string; last_name: string; email: string }>)
      }
    }

    // Group by student and calculate totals
    const studentMap = new Map<string, any>()

    pendingPayments.forEach(payment => {
      const userId = payment.user_id
      const existing = studentMap.get(userId)
      const userInfo = userNames[userId] || { first_name: '', last_name: '', email: '' }

      if (existing) {
        existing.pending_payments_count += 1
        existing.total_pending_amount += payment.total_amount_rappen || 0
      } else {
        studentMap.set(userId, {
          id: userId,
          first_name: userInfo.first_name,
          last_name: userInfo.last_name,
          email: userInfo.email,
          pending_payments_count: 1,
          total_pending_amount: payment.total_amount_rappen || 0
        })
      }
    })

    // Convert to array and sort by pending amount (highest first)
    return Array.from(studentMap.values())
      .sort((a, b) => b.total_pending_amount - a.total_pending_amount)
      .slice(0, 10) // Show top 10
  } catch (error) {
    logger.error('Error loading pending students:', error)
    return []
  }
}

async function loadRecentInvoices(supabase: any, tenantId: string) {
  try {
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
    const twoWeeksAgoStr = toLocalTimeString(twoWeeksAgo)

    const { data: invoices, error } = await supabase
      .from('payments')
      .select('id, total_amount_rappen, created_at, payment_status, user_id')
      .eq('payment_method', 'invoice')
      .eq('tenant_id', tenantId)
      .gte('created_at', twoWeeksAgoStr)
      .order('created_at', { ascending: false })

    if (error) {
      logger.warn('⚠️ Error loading invoices:', error)
      return []
    }

    // Get user names for the invoices
    const userIds = [...new Set((invoices || []).map(invoice => invoice.user_id).filter(Boolean))]
    let userNames: Record<string, string> = {}

    if (userIds.length > 0) {
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, first_name, last_name')
        .in('id', userIds)
        .eq('tenant_id', tenantId)

      if (!usersError && users) {
        userNames = users.reduce((acc, user) => {
          acc[user.id] = `${user.first_name || ''} ${user.last_name || ''}`.trim()
          return acc
        }, {} as Record<string, string>)
      }
    }

    // Transform the data
    return (invoices || []).map(invoice => ({
      id: invoice.id,
      customer_name: userNames[invoice.user_id] || 'Unbekannter Kunde',
      total_amount_rappen: invoice.total_amount_rappen || 0,
      created_at: invoice.created_at,
      status: invoice.payment_status
    }))
  } catch (error) {
    logger.error('Error loading recent invoices:', error)
    return []
  }
}

async function loadRecentActivities(supabase: any, tenantId: string) {
  try {
    const { data: pendingPayments, error: pendingError } = await supabase
      .from('payments')
      .select('id, total_amount_rappen, payment_method, created_at, user_id')
      .eq('payment_status', 'pending')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(5)

    if (pendingError) {
      logger.warn('⚠️ Error loading pending payments for activities:', pendingError)
      return []
    }

    // Get user names for pending payments
    const userIds = [...new Set((pendingPayments || []).map(p => p.user_id).filter(Boolean))]
    let userNames: Record<string, string> = {}

    if (userIds.length > 0) {
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, first_name, last_name')
        .in('id', userIds)
        .eq('tenant_id', tenantId)

      if (!usersError && users) {
        userNames = users.reduce((acc, user) => {
          acc[user.id] = `${user.first_name || ''} ${user.last_name || ''}`.trim()
          return acc
        }, {} as Record<string, string>)
      }
    }

    // Transform pending payments to activities
    const activities = (pendingPayments || []).map((payment, index) => ({
      id: index + 1,
      type: 'pending_payment',
      icon: '⏳',
      title: 'Ausstehende Zahlung',
      description: `${userNames[payment.user_id] || 'Unbekannter Benutzer'} - ${payment.payment_method}`,
      amount: `CHF ${(payment.total_amount_rappen / 100).toFixed(2)}`,
      time: new Date(payment.created_at).toLocaleDateString('de-CH')
    }))

    return activities
  } catch (error) {
    logger.error('Error loading recent activities:', error)
    return []
  }
}

async function loadCoursesStats(supabase: any, tenantId: string) {
  try {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthStartStr = toLocalTimeString(monthStart)

    const [
      { data: activeCourses },
      { data: registrations },
      { data: thisMonthCourses }
    ] = await Promise.all([
      supabase
        .from('course_sessions')
        .select('id, course_id')
        .eq('tenant_id', tenantId)
        .eq('status', 'active'),

      supabase
        .from('course_registrations')
        .select('id')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null),

      supabase
        .from('course_sessions')
        .select('id')
        .eq('tenant_id', tenantId)
        .gte('start_date', monthStartStr)
    ])

    return {
      active: activeCourses?.length || 0,
      participants: registrations?.length || 0,
      thisMonth: thisMonthCourses?.length || 0
    }
  } catch (error) {
    logger.error('Error loading courses stats:', error)
    return { active: 0, participants: 0, thisMonth: 0 }
  }
}

async function loadCreditsStats(supabase: any, tenantId: string) {
  try {
    const { data: credits } = await supabase
      .from('student_credits')
      .select('user_id, balance_rappen')
      .eq('tenant_id', tenantId)
      .gt('balance_rappen', 0)

    const totalCredit = credits?.reduce((sum, c) => sum + (c.balance_rappen || 0), 0) || 0

    return {
      studentsWithCredit: credits?.length || 0,
      totalCredit
    }
  } catch (error) {
    logger.error('Error loading credits stats:', error)
    return { studentsWithCredit: 0, totalCredit: 0 }
  }
}

async function loadCancellationsStats(supabase: any, tenantId: string, now: Date) {
  try {
    // This week
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - now.getDay())
    weekStart.setHours(0, 0, 0, 0)
    const weekStartStr = toLocalTimeString(weekStart)

    // This month
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthStartStr = toLocalTimeString(monthStart)

    // Last month
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
    const lastMonthStartStr = toLocalTimeString(lastMonthStart)
    const lastMonthEndStr = toLocalTimeString(lastMonthEnd)

    const [
      { data: thisWeekCancellations },
      { data: thisMonthCancellations },
      { data: lastMonthCancellations }
    ] = await Promise.all([
      supabase
        .from('appointments')
        .select('id')
        .eq('tenant_id', tenantId)
        .not('deleted_at', 'is', null)
        .gte('deleted_at', weekStartStr),

      supabase
        .from('appointments')
        .select('id')
        .eq('tenant_id', tenantId)
        .not('deleted_at', 'is', null)
        .gte('deleted_at', monthStartStr),

      supabase
        .from('appointments')
        .select('id')
        .eq('tenant_id', tenantId)
        .not('deleted_at', 'is', null)
        .gte('deleted_at', lastMonthStartStr)
        .lte('deleted_at', lastMonthEndStr)
    ])

    return {
      thisWeek: thisWeekCancellations?.length || 0,
      thisMonth: thisMonthCancellations?.length || 0,
      lastMonth: lastMonthCancellations?.length || 0
    }
  } catch (error) {
    logger.error('Error loading cancellations stats:', error)
    return { thisWeek: 0, thisMonth: 0, lastMonth: 0 }
  }
}

async function loadHoursStats(supabase: any, tenantId: string, now: Date) {
  try {
    // Today
    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date(now)
    todayEnd.setHours(23, 59, 59, 999)
    const todayStartStr = toLocalTimeString(todayStart)
    const todayEndStr = toLocalTimeString(todayEnd)

    // This week
    const weekStart = new Date()
    weekStart.setDate(now.getDate() - now.getDay())
    weekStart.setHours(0, 0, 0, 0)
    const weekStartStr = toLocalTimeString(weekStart)

    // This month
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthStartStr = toLocalTimeString(monthStart)

    const [
      { data: todayAppts },
      { data: weekAppts },
      { data: monthAppts }
    ] = await Promise.all([
      supabase
        .from('appointments')
        .select('duration_minutes')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .gte('start_time', todayStartStr)
        .lte('start_time', todayEndStr),

      supabase
        .from('appointments')
        .select('duration_minutes')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .gte('start_time', weekStartStr),

      supabase
        .from('appointments')
        .select('duration_minutes')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .gte('start_time', monthStartStr)
    ])

    const todayMinutes = todayAppts?.reduce((sum, a) => sum + (a.duration_minutes || 0), 0) || 0
    const weekMinutes = weekAppts?.reduce((sum, a) => sum + (a.duration_minutes || 0), 0) || 0
    const monthMinutes = monthAppts?.reduce((sum, a) => sum + (a.duration_minutes || 0), 0) || 0

    return {
      today: Math.round((todayMinutes / 60) * 20) / 20,
      thisWeek: Math.round((weekMinutes / 60) * 20) / 20,
      thisMonth: Math.round((monthMinutes / 60) * 20) / 20
    }
  } catch (error) {
    logger.error('Error loading hours stats:', error)
    return { today: 0, thisWeek: 0, thisMonth: 0 }
  }
}

