import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  // ✅ Auth check
  const authHeader = getHeader(event, 'authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }
  const token = authHeader.substring(7)

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw createError({ statusCode: 500, message: 'Server configuration error' })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  // ✅ Verify user token and get user
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) {
    throw createError({ statusCode: 401, message: 'Invalid token' })
  }

  // ✅ Check if user is admin/staff
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('role, tenant_id')
    .eq('id', user.id)
    .single()

  if (userError || !userData) {
    throw createError({ statusCode: 403, message: 'User not found' })
  }

  if (!['admin', 'staff', 'superadmin'].includes(userData.role)) {
    throw createError({ statusCode: 403, message: 'Admin access required' })
  }

  // ✅ Get query params
  const query = getQuery(event)
  const invoiceNumber = query.invoice_number as string
  const userId = query.user_id as string

  if (!invoiceNumber && !userId) {
    throw createError({ statusCode: 400, message: 'invoice_number or user_id required' })
  }

  try {
    const result: any = {
      payments: [],
      customerData: null,
      appointmentDetails: null,
      eventTypeName: null,
      totalExcludingCancelled: 0
    }

    // ✅ Load all payments for this invoice (including deleted)
    if (invoiceNumber) {
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .eq('invoice_number', invoiceNumber)
        .eq('tenant_id', userData.tenant_id)
        .order('created_at', { ascending: true })

      if (!paymentsError && payments) {
        result.payments = payments
        result.totalExcludingCancelled = payments
          .filter((p: any) => !p.deleted_at)
          .reduce((sum: number, p: any) => sum + (p.total_amount_rappen || 0), 0)
      }
    }

    // ✅ Load latest payment by user_id for detailed data
    if (userId) {
      const { data: latestPayment, error: paymentError } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', userId)
        .eq('tenant_id', userData.tenant_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!paymentError && latestPayment) {
        result.latestPayment = latestPayment

        // Load appointment details if available
        if (latestPayment.appointment_id) {
          const { data: appointment, error: aptError } = await supabase
            .from('appointments')
            .select('start_time, event_type_code, type')
            .eq('id', latestPayment.appointment_id)
            .single()

          if (!aptError && appointment) {
            result.appointmentDetails = appointment

            // Load event type name
            if (appointment.event_type_code) {
              const { data: eventType } = await supabase
                .from('event_types')
                .select('name')
                .eq('code', appointment.event_type_code)
                .eq('tenant_id', userData.tenant_id)
                .maybeSingle()

              if (eventType) {
                result.eventTypeName = eventType.name
              }
            }
          }
        }

        // Load customer data
        const { data: customer, error: customerError } = await supabase
          .from('users')
          .select('first_name, last_name, email, phone, street, street_nr, zip, city')
          .eq('id', userId)
          .single()

        if (!customerError && customer) {
          result.customerData = customer
        }
      }
    }

    return result
  } catch (error: any) {
    console.error('Error loading invoice details:', error)
    throw createError({ statusCode: 500, message: 'Failed to load invoice details' })
  }
})

