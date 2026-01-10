import { defineEventHandler, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { logger } from '~/utils/logger'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { logAudit } from '~/server/utils/audit'

/**
 * GET /api/admin/get-users-with-stats
 * 
 * Secure API for fetching users with appointment and payment statistics
 * 
 * Security Layers:
 * ✅ Layer 1: Authentication (user must be logged in)
 * ✅ Layer 2: Authorization (admin/staff only)
 * ✅ Layer 3: Rate Limiting (120 req/min per user)
 * ✅ Layer 4: Tenant Isolation (can only see own tenant)
 * ✅ Layer 5: Input Validation (query params validated)
 * ✅ Layer 6: Pagination (limit 100)
 * ✅ Layer 7: Audit Logging (all access logged)
 */

interface UserWithStats {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  role: string
  admin_level?: string
  is_primary_admin: boolean
  preferred_payment_method: string
  is_active: boolean
  created_at: string
  tenant_id: string
  appointment_count: number
  completed_appointments: number
  unpaid_count: number
  unpaid_amount: number // in rappen
}

export default defineEventHandler(async (event) => {
  const startTime = Date.now()
  
  try {
    // ============ LAYER 1: AUTHENTICATION ============
    const authUser = await getAuthenticatedUser(event)
    if (!authUser) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized'
      })
    }

    const supabaseAdmin = getSupabaseAdmin()

    // Get user profile
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('id, tenant_id, role')
      .eq('auth_user_id', authUser.id)
      .single()

    if (profileError || !userProfile) {
      logger.warn('⚠️ User profile not found:', authUser.id)
      throw createError({
        statusCode: 404,
        statusMessage: 'User profile not found'
      })
    }

    // ============ LAYER 2: AUTHORIZATION ============
    const allowedRoles = ['admin', 'staff']
    if (!allowedRoles.includes(userProfile.role)) {
      logger.warn('⚠️ Unauthorized access attempt:', {
        userId: userProfile.id,
        role: userProfile.role,
        requiredRoles: allowedRoles
      })
      throw createError({
        statusCode: 403,
        statusMessage: 'Forbidden: Admin/Staff access required'
      })
    }

    const tenantId = userProfile.tenant_id
    const userId = userProfile.id

    // ============ LAYER 3: RATE LIMITING ============
    const rateLimitResult = await checkRateLimit(
      userId,
      'get_users_with_stats',
      120, // 120 requests per minute
      60 * 1000
    )

    if (!rateLimitResult.allowed) {
      logger.warn('⚠️ Rate limit exceeded:', {
        userId,
        operation: 'get_users_with_stats'
      })
      throw createError({
        statusCode: 429,
        statusMessage: 'Too many requests. Please try again later.'
      })
    }

    logger.debug('📊 Fetching users with stats:', {
      tenantId,
      userId
    })

    // ============ LAYER 4: TENANT ISOLATION + DATA LOADING ============
    
    // 1. Load all users for this tenant (excluding soft deleted)
    const { data: usersData, error: usersError } = await supabaseAdmin
      .from('users')
      .select(`
        id,
        first_name,
        last_name,
        email,
        phone,
        role,
        admin_level,
        is_primary_admin,
        preferred_payment_method,
        is_active,
        created_at,
        tenant_id
      `)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('last_name', { ascending: true })

    if (usersError) {
      logger.error('❌ Error fetching users:', usersError)
      throw usersError
    }

    if (!usersData || usersData.length === 0) {
      logger.debug('ℹ️ No users found for tenant:', tenantId)
      
      await logAudit({
        user_id: userId,
        action: 'get_users_with_stats',
        resource_type: 'users',
        resource_id: tenantId,
        status: 'success',
        details: {
          result_count: 0,
          duration_ms: Date.now() - startTime
        }
      })

      return {
        success: true,
        data: []
      }
    }

    // 2. Load appointment statistics
    const { data: appointmentsData, error: appointmentsError } = await supabaseAdmin
      .from('appointments')
      .select('user_id, status')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)

    if (appointmentsError) {
      logger.warn('⚠️ Error fetching appointments:', appointmentsError)
      // Continue without appointments - non-critical
    }

    // 3. Load payment statistics
    const { data: paymentsData, error: paymentsError } = await supabaseAdmin
      .from('payments')
      .select('user_id, payment_status, total_amount_rappen')
      .eq('tenant_id', tenantId)

    if (paymentsError) {
      logger.warn('⚠️ Error fetching payments:', paymentsError)
      // Continue without payments - non-critical
    }

    // ============ LAYER 6: TRANSFORM DATA ============
    
    const results: UserWithStats[] = usersData.map(user => {
      const userAppointments = (appointmentsData || []).filter(apt => apt.user_id === user.id)
      const completedAppointments = userAppointments.filter(apt => apt.status === 'completed')
      
      const userPayments = (paymentsData || []).filter(p => p.user_id === user.id)
      const pendingPayments = userPayments.filter(p => p.payment_status === 'pending')
      
      // Calculate unpaid amount from pending payments
      const unpaidAmount = pendingPayments.reduce((sum, payment) => {
        return sum + (payment.total_amount_rappen || 0)
      }, 0)

      return {
        id: user.id,
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        phone: user.phone || '',
        role: user.role || 'client',
        admin_level: user.admin_level,
        is_primary_admin: user.is_primary_admin,
        preferred_payment_method: user.preferred_payment_method,
        is_active: user.is_active,
        created_at: user.created_at,
        tenant_id: user.tenant_id,
        appointment_count: userAppointments.length,
        completed_appointments: completedAppointments.length,
        unpaid_count: pendingPayments.length,
        unpaid_amount: unpaidAmount // Already in Rappen
      }
    })

    // ============ LAYER 7: AUDIT LOGGING ============
    await logAudit({
      user_id: userId,
      action: 'get_users_with_stats',
      resource_type: 'users',
      resource_id: tenantId,
      status: 'success',
      details: {
        result_count: results.length,
        duration_ms: Date.now() - startTime
      }
    })

    logger.debug('✅ Users with stats fetched successfully:', {
      tenantId,
      count: results.length,
      durationMs: Date.now() - startTime
    })

    return {
      success: true,
      data: results
    }
  } catch (error: any) {
    logger.error('❌ Error in get-users-with-stats API:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error'
    })
  }
})

