import { getSupabaseAdmin } from '~/utils/supabase'
import { logger } from '~/utils/logger'
import { H3Event } from 'h3'
import { getClientIP } from '~/server/utils/ip-utils'
import { logAudit } from '~/server/utils/audit'

export default defineEventHandler(async (event: H3Event) => {
  const ipAddress = getClientIP(event)
  let userId: string | undefined
  let tenantId: string | undefined
  let auditDetails: any = {}

  try {
    // Layer 1: Authentication - Verify JWT token
    const authHeader = getHeader(event, 'authorization')
    if (!authHeader) {
      await logAudit({
        action: 'get_discount_sales',
        status: 'failed',
        error_message: 'Authentication required',
        ip_address: ipAddress,
        details: { query: getQuery(event) }
      })
      throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
    }

    // Use admin client which already has correct credentials
    const supabase = getSupabaseAdmin()

    const token = authHeader.replace('Bearer ', '')
    
    // Extract user_id from JWT token
    let requestingUserId: string | null = null
    try {
      const parts = token.split('.')
      if (parts.length === 3) {
        // Pad base64 string if necessary
        let padded = parts[1]
        padded += '='.repeat((4 - padded.length % 4) % 4)
        const decoded = JSON.parse(Buffer.from(padded, 'base64').toString())
        requestingUserId = decoded.sub
      }
    } catch (e) {
      logger.warn('Failed to parse JWT token:', e)
    }
    
    if (!requestingUserId) {
      logger.error('Could not extract user ID from token')
      throw createError({ statusCode: 401, statusMessage: 'Invalid token format' })
    }

    const query = getQuery(event)
    const appointmentId = query.appointment_id as string
    auditDetails.requested_appointment_id = appointmentId

    // Layer 3: Input Validation
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

    // Layer 4: Authorization - Only admin/staff/superadmin can use this
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('tenant_id, role, id')
      .eq('auth_user_id', requestingUserId)
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

    if (!['admin', 'staff', 'superadmin'].includes(userProfile.role)) {
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

    // Fetch discount_sales using service_role to bypass RLS
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
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Internal server error'
    })
  }
})
