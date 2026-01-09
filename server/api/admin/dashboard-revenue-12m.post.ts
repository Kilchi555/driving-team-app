import { defineEventHandler, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { getAuthUser } from '~/server/utils/auth'
import { toLocalTimeString } from '~/utils/dateUtils'

interface RevenueMonth {
  name: string
  revenue: number
  paymentsCount: number
  monthKey: string
}

export default defineEventHandler(async (event) => {
  try {
    // ============ LAYER 1: AUTHENTICATION ============
    const user = await getAuthUser(event)
    if (!user) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    // Check admin role
    if (!['admin', 'staff'].includes(user.role || '')) {
      throw createError({ statusCode: 403, statusMessage: 'Forbidden: Admin access required' })
    }

    // ============ LAYER 2: RATE LIMITING ============
    const rateLimitKey = `dashboard_revenue_12m:${user.id}`
    const rateLimitResult = await checkRateLimit(rateLimitKey, 10, 60 * 1000) // 10 requests per minute
    if (!rateLimitResult.allowed) {
      throw createError({ statusCode: 429, statusMessage: 'Too many requests. Please try again later.' })
    }

    const tenantId = user.tenant_id
    if (!tenantId) {
      throw createError({ statusCode: 400, statusMessage: 'User has no tenant assigned' })
    }

    const supabase = getSupabaseAdmin()
    const now = new Date()
    const months: RevenueMonth[] = []

    logger.debug('📊 Loading 12 months revenue data for tenant:', tenantId)

    // Get 12 months
    for (let i = 0; i < 12; i++) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1)
      const monthEnd = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59, 999)

      const monthStartStr = toLocalTimeString(monthStart)
      const monthEndStr = toLocalTimeString(monthEnd)

      // Load payments for this month
      const { data: payments, error } = await supabase
        .from('payments')
        .select('total_amount_rappen, payment_status, payment_method')
        .eq('tenant_id', tenantId)
        .eq('payment_status', 'completed')
        .gte('created_at', monthStartStr)
        .lte('created_at', monthEndStr)

      if (error) {
        logger.warn(`⚠️ Error loading payments for month ${i}:`, error)
        continue
      }

      const totalRevenue = payments?.reduce((sum, p) => sum + (p.total_amount_rappen || 0), 0) || 0
      const paymentsCount = payments?.length || 0

      // Format month name
      const monthNames = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
        'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']
      const monthName = `${monthNames[targetDate.getMonth()]} ${targetDate.getFullYear()}`

      months.push({
        name: monthName,
        revenue: totalRevenue,
        paymentsCount,
        monthKey: `${targetDate.getFullYear()}-${targetDate.getMonth() + 1}`
      })
    }

    logger.debug('✅ 12 months revenue data loaded successfully')

    return { success: true, data: months, error: null }
  } catch (error: any) {
    logger.error('❌ Error loading 12 months revenue data:', error)
    return {
      success: false,
      data: null,
      error: error.statusMessage || 'Failed to load revenue data'
    }
  }
})

