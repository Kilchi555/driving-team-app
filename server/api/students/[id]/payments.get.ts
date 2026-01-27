// server/api/students/[id]/payments.get.ts
// SECURED: Load all payments for a specific student with full security checks
import { getSupabaseAdmin } from '~/utils/supabase'
import { logger } from '~/utils/logger'
import { getClientIP } from '~/server/utils/ip-utils'
import { logAudit } from '~/server/utils/audit'
import { validateUUID } from '~/server/utils/validators'

export default defineEventHandler(async (event) => {
  try {
    // ============ LAYER 1: AUTHENTICATION ============
    const authHeader = getHeader(event, 'authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      throw createError({
        statusCode: 401,
        message: 'Authentication required'
      })
    }

    const token = authHeader.slice(7)
    
    // ============ LAYER 1B: VERIFY TOKEN ============
    // Import and use getSupabase to verify the token
    const { getSupabase: getSupabaseClient } = await import('~/utils/supabase')
    const supabaseUserClient = getSupabaseClient(token)
    
    const { data: { user: authUser }, error: authError } = await supabaseUserClient.auth.getUser(token)
    if (authError || !authUser?.id) {
      throw createError({
        statusCode: 401,
        message: 'Invalid or expired token'
      })
    }

    // ============ LAYER 2: GET USER PROFILE + TENANT ============
    const supabaseAdmin = getSupabaseAdmin()
    const { data: userProfile, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, tenant_id, role')
      .eq('auth_user_id', authUser.id)
      .single()

    if (userError || !userProfile) {
      throw createError({
        statusCode: 401,
        message: 'User not found'
      })
    }

    const tenantId = userProfile.tenant_id
    const requestedStudentId = event.context.params.id
    const ipAddress = getClientIP(event)

    // ============ LAYER 3: VALIDATE STUDENT ID ============
    if (!validateUUID(requestedStudentId)) {
      throw createError({
        statusCode: 400,
        message: 'Invalid student ID format'
      })
    }

    // ============ LAYER 4: AUTHORIZATION CHECK ============
    // Only staff/admin can view other students' payments
    // Students can only view their own
    const isStaff = ['staff', 'admin', 'tenant_admin'].includes(userProfile.role)
    const isOwnRecord = userProfile.id === requestedStudentId

    if (!isOwnRecord && !isStaff) {
      await logAudit({
        user_id: userProfile.id,
        auth_user_id: authUser.id,
        action: 'view_student_payments',
        resource_type: 'payment',
        resource_id: requestedStudentId,
        status: 'failed',
        error_message: `Unauthorized: User cannot view other students' payments`,
        ip_address: ipAddress,
        tenant_id: tenantId
      })

      throw createError({
        statusCode: 403,
        message: 'You cannot view other students\' payments'
      })
    }

    logger.debug('📊 Loading payments for student:', {
      requestedStudentId,
      requestedBy: userProfile.id,
      isOwnRecord,
      isStaff
    })

    // ============ LAYER 5: FETCH STUDENT CREDIT ============
    const { data: creditData, error: creditError } = await supabaseAdmin
      .from('student_credits')
      .select('id, balance_rappen, user_id, tenant_id')
      .eq('user_id', requestedStudentId)
      .eq('tenant_id', tenantId)
      .single()

    if (creditError && creditError.code !== 'PGRST116') {
      logger.warn('⚠️ Error loading student credit:', creditError)
    }

    // ============ LAYER 6: FETCH PAYMENTS WITH FULL DETAILS ============
    // Load payments directly from payments table (includes lesson_price, admin_fee, discount from payment record)
    const { data: paymentsData, error: paymentsError } = await supabaseAdmin
      .from('payments')
      .select(`
        id,
        user_id,
        appointment_id,
        payment_status,
        payment_method,
        lesson_price_rappen,
        admin_fee_rappen,
        products_price_rappen,
        discount_amount_rappen,
        total_amount_rappen,
        credit_used_rappen,
        paid_at,
        refunded_at,
        created_at,
        notes,
        wallee_transaction_id,
        appointments!inner(
          id,
          title,
          user_id,
          staff_id,
          start_time,
          end_time,
          duration_minutes,
          status,
          type,
          event_type_code,
          deleted_at,
          deletion_reason,
          cancellation_charge_percentage,
          event_types(name)
        )
      `)
      .eq('user_id', requestedStudentId)
      .eq('appointments.tenant_id', tenantId)
      .order('created_at', { ascending: false })

    if (paymentsError) {
      logger.error('❌ Error loading payments:', paymentsError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to load payments'
      })
    }

    // ============ LAYER 7: LOAD DISCOUNT SALES (WITH VALIDATION) ============
    const appointmentIds = (paymentsData || [])
      .map(p => p.appointment_id)
      .filter(Boolean) as string[]

    let discountSalesMap: Record<string, any> = {}
    let productSalesMap: Record<string, any[]> = {}

    if (appointmentIds.length > 0) {
      // Load discount sales for these appointments (with tenant validation)
      const { data: discountSalesData, error: discountSalesError } = await supabaseAdmin
        .from('discount_sales')
        .select(`
          id,
          appointment_id,
          discount_reason,
          discount_amount_rappen,
          discount_type,
          tenant_id
        `)
        .in('appointment_id', appointmentIds)
        .eq('tenant_id', tenantId)

      if (discountSalesError) {
        logger.warn('⚠️ Error loading discount sales:', discountSalesError)
      } else if (discountSalesData) {
        logger.debug('✅ Loaded discount sales:', {
          count: discountSalesData.length,
          appointments: appointmentIds.length,
          sample: discountSalesData[0]
        })
        
        for (const ds of discountSalesData) {
          discountSalesMap[ds.appointment_id] = ds

          // Load product sales for this discount
          const { data: productsData, error: productsError } = await supabaseAdmin
            .from('product_sales')
            .select(`
              id,
              product_sale_id,
              product_id,
              quantity,
              unit_price_rappen,
              total_price_rappen,
              products(id, name, price_rappen)
            `)
            .eq('product_sale_id', ds.id)

          if (productsError) {
            logger.warn('⚠️ Error loading product sales:', productsError)
          } else if (productsData) {
            productSalesMap[ds.appointment_id] = productsData
          }
        }
      }
    }

    // ============ LAYER 8: LOAD STAFF DETAILS (WITH TENANT VALIDATION) ============
    const staffIds = [
      ...new Set(
        (paymentsData || [])
          .map(p => {
            const apt = Array.isArray(p.appointments) ? p.appointments[0] : p.appointments
            return apt?.staff_id
          })
          .filter(Boolean)
      )
    ]

    let staffMap: Record<string, any> = {}

    if (staffIds.length > 0) {
      const { data: staffData, error: staffError } = await supabaseAdmin
        .from('users')
        .select('id, first_name, last_name, email, tenant_id')
        .in('id', staffIds)
        .eq('tenant_id', tenantId)

      if (staffError) {
        logger.warn('⚠️ Error loading staff:', staffError)
      } else if (staffData) {
        staffData.forEach(staff => {
          staffMap[staff.id] = {
            id: staff.id,
            first_name: staff.first_name,
            last_name: staff.last_name,
            email: staff.email
          }
        })
      }
    }

    // ============ LAYER 9: MERGE ALL DATA ============
    // Übersetzungs-Map für event_type_code
    const eventTypeTranslations: Record<string, string> = {
      lesson: 'Fahrstunde',
      exam: 'Prüfung',
      theory: 'Theorieunterricht',
      vku: 'VKU',
      haltbar: 'Haltbarkeitsprüfung'
    }
    
    const translateEventType = (code: string | null | undefined): string => {
      if (!code) return 'Termin'
      return eventTypeTranslations[code.toLowerCase()] || code
    }
    
    const enrichedPayments = (paymentsData || []).map(payment => {
      const apt = Array.isArray(payment.appointments)
        ? payment.appointments[0]
        : payment.appointments

      return {
        id: payment.id,
        user_id: payment.user_id,
        payment_status: payment.payment_status,
        payment_method: payment.payment_method,
        lesson_price_rappen: payment.lesson_price_rappen,
        admin_fee_rappen: payment.admin_fee_rappen,
        products_price_rappen: payment.products_price_rappen,
        discount_amount_rappen: payment.discount_amount_rappen,
        total_amount_rappen: payment.total_amount_rappen,
        credit_used_rappen: payment.credit_used_rappen,
        paid_at: payment.paid_at,
        refunded_at: payment.refunded_at,
        created_at: payment.created_at,
        notes: payment.notes,
        wallee_transaction_id: payment.wallee_transaction_id,
        appointment: apt
          ? {
              id: apt.id,
              title: apt.title,
              start_time: apt.start_time,
              end_time: apt.end_time,
              duration_minutes: apt.duration_minutes,
              status: apt.status,
              type: apt.type,
              event_type_code: apt.event_type_code,
              event_type_label: translateEventType(apt.event_type_code),
              deleted_at: apt.deleted_at,
              deletion_reason: apt.deletion_reason,
              cancellation_charge_percentage: apt.cancellation_charge_percentage,
              event_type: apt.event_types?.name,
              staff: apt.staff_id ? staffMap[apt.staff_id] : null
            }
          : null,
        discount_sale: payment.appointment_id
          ? discountSalesMap[payment.appointment_id]
          : null,
        product_sales: payment.appointment_id
          ? (productSalesMap[payment.appointment_id] || [])
          : []
      }
    })

    // ============ LAYER 10: AUDIT LOGGING ============
    await logAudit({
      user_id: userProfile.id,
      auth_user_id: authUser.id,
      action: 'view_student_payments',
      resource_type: 'payment',
      resource_id: requestedStudentId,
      status: 'success',
      ip_address: ipAddress,
      tenant_id: tenantId,
      details: {
        payments_count: enrichedPayments.length,
        is_own_record: isOwnRecord
      }
    })

    logger.debug('✅ Loaded', enrichedPayments.length, 'payments for student')

    return {
      success: true,
      data: {
        student_balance: creditData?.balance_rappen || 0,
        payments: enrichedPayments
      }
    }
  } catch (error: any) {
    logger.error('❌ Error loading student payments:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'Failed to load payments'
    })
  }
})

