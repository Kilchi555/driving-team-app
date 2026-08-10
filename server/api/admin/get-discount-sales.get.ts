import { getSupabaseAdmin } from '~/utils/supabase'
import { logger } from '~/utils/logger'
import { H3Event } from 'h3'
import { getClientIP } from '~/server/utils/ip-utils'
import { logAudit } from '~/server/utils/audit'
import { getAuthenticatedUser } from '~/server/utils/auth'

export default defineEventHandler(async (event: H3Event) => {
  const ipAddress = getClientIP(event)
  let userId: string | undefined
  let tenantId: string | undefined
  let auditDetails: any = {}

  try {
    // Layer 1: Authentication — verify JWT via Supabase (never trust decoded payload alone)
    const authUser = await getAuthenticatedUser(event)
    if (!authUser) {
      await logAudit({
        action: 'get_discount_sales',
        status: 'failed',
        error_message: 'Authentication required',
        ip_address: ipAddress,
        details: { query: getQuery(event) }
      })
      throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
    }

    const supabase = getSupabaseAdmin()

    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('tenant_id, role, id')
      .eq('auth_user_id', authUser.id)
      .single()

    if (profileError || !userProfile?.tenant_id) {
      await logAudit({
        user_id: userId,
        action: 'get_discount_sales',
        status: 'failed',
        error_message: 'User profile not found or tenant_id missing',
        ip_address: ipAddress,
        details: auditDetails
      })
      throw createError({ statusCode: 403, statusMessage: 'User profile not found or tenant_id missing' })
    }
    tenantId = userProfile.tenant_id
    userId = userProfile.id
    auditDetails.tenant_id = tenantId

    if (!['admin', 'staff', 'super_admin', 'tenant_admin', 'superadmin'].includes(userProfile.role)) {
      await logAudit({
        user_id: userId,
        action: 'get_discount_sales',
        status: 'failed',
        error_message: 'Insufficient permissions',
        ip_address: ipAddress,
        details: auditDetails
      })
      throw createError({ statusCode: 403, statusMessage: 'Insufficient permissions' })
    }

    const query = getQuery(event)
    const appointmentId = query.appointment_id as string
    auditDetails.requested_appointment_id = appointmentId

    if (!appointmentId || !/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(appointmentId)) {
      await logAudit({
        user_id: userId,
        action: 'get_discount_sales',
        status: 'failed',
        error_message: 'Invalid or missing appointment_id',
        ip_address: ipAddress,
        details: auditDetails
      })
      throw createError({ statusCode: 400, statusMessage: 'Invalid or missing appointment_id' })
    }

    // Verify appointment belongs to this staff/admin's tenant
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select('id, tenant_id')
      .eq('id', appointmentId)
      .eq('tenant_id', tenantId)
      .single()

    if (appointmentError || !appointment) {
      await logAudit({
        user_id: userId,
        action: 'get_discount_sales',
        status: 'failed',
        error_message: 'Appointment not found or not in tenant',
        ip_address: ipAddress,
        details: auditDetails
      })
      throw createError({ statusCode: 404, statusMessage: 'Appointment not found or not in your tenant' })
    }

    const { data: discountSales, error: discountError } = await supabase
      .from('discount_sales')
      .select('*')
      .eq('appointment_id', appointmentId)

    if (discountError) {
      logger.error(`❌ Error fetching discount_sales for appointment ${appointmentId}:`, discountError)
      await logAudit({
        user_id: userId,
        action: 'get_discount_sales',
        status: 'failed',
        error_message: discountError.message,
        ip_address: ipAddress,
        details: auditDetails
      })
      throw createError({ statusCode: 500, statusMessage: 'Failed to load discount sales' })
    }

    await logAudit({
      user_id: userId,
      action: 'get_discount_sales',
      status: 'success',
      ip_address: ipAddress,
      details: { ...auditDetails, discount_sales_count: discountSales?.length || 0 }
    })

    return { success: true, discountSales: discountSales || [] }
  } catch (error: any) {
    logger.error('Error in get-discount-sales API:', error)

    if (error.statusCode && error.statusMessage) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Internal server error'
    })
  }
})
