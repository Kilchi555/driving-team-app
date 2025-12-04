// server/api/reminders/test-payment-confirmation.post.ts
// DEBUG: Simplified endpoint to test what's failing

import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const results = {
    step1_body: 'pending',
    step2_supabase: 'pending',
    step3_user: 'pending',
    step4_payment: 'pending',
    step5_staff: 'pending',
    step6_tenant: 'pending',
    error: null as any
  }

  try {
    // Step 1: Read body
    const body = await readBody(event)
    results.step1_body = 'success'
    console.log('✅ Step 1: Body read', body)

    const { paymentId, userId, tenantId } = body

    // Step 2: Get Supabase
    const supabase = getSupabaseAdmin()
    results.step2_supabase = 'success'
    console.log('✅ Step 2: Supabase client created')

    // Step 3: Get user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('first_name, last_name, email')
      .eq('id', userId)
      .single()
    
    if (userError) throw new Error(`User query failed: ${userError.message}`)
    results.step3_user = user ? 'success' : 'no_data'
    console.log('✅ Step 3: User loaded', user?.email)

    // Step 4: Get payment
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select(`
        id,
        total_amount_rappen,
        appointments (
          id,
          start_time,
          staff_id
        )
      `)
      .eq('id', paymentId)
      .single()
    
    if (paymentError) throw new Error(`Payment query failed: ${paymentError.message}`)
    results.step4_payment = payment ? 'success' : 'no_data'
    console.log('✅ Step 4: Payment loaded')

    const appointment = Array.isArray(payment.appointments)
      ? payment.appointments[0]
      : payment.appointments

    // Step 5: Get staff
    const { data: staff, error: staffError } = await supabase
      .from('users')
      .select('first_name, last_name')
      .eq('id', appointment?.staff_id)
      .single()
    
    results.step5_staff = staff ? 'success' : 'no_data'
    console.log('✅ Step 5: Staff loaded')

    // Step 6: Get tenant
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('name, slug')
      .eq('id', tenantId)
      .single()
    
    if (tenantError) throw new Error(`Tenant query failed: ${tenantError.message}`)
    results.step6_tenant = tenant ? 'success' : 'no_data'
    console.log('✅ Step 6: Tenant loaded')

    return {
      success: true,
      results,
      message: 'All steps completed successfully'
    }

  } catch (error: any) {
    console.error('❌ Test failed at:', results)
    results.error = {
      message: error.message,
      stack: error.stack
    }
    
    return {
      success: false,
      results,
      error: error.message
    }
  }
})

