import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabase } from '~/utils/supabase'

export default defineEventHandler(async (event) => {
  const supabase = getSupabase()

  // Get auth token from headers
  const authHeader = getHeader(event, 'authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw createError({ statusCode: 401, message: 'Missing or invalid authorization header' })
  }

  const token = authHeader.replace('Bearer ', '')

  // Get current user
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !authUser) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  // Get user profile
  const { data: userProfile } = await supabase
    .from('users')
    .select('id, tenant_id, role')
    .eq('auth_user_id', authUser.id)
    .single()

  if (!userProfile) {
    throw createError({ statusCode: 403, message: 'User profile not found' })
  }

  // Read and validate body
  const body = await readBody(event)
  const { appointment_id, is_paid, payment_method } = body

  if (!appointment_id || typeof is_paid !== 'boolean') {
    throw createError({
      statusCode: 400,
      message: 'Missing required fields: appointment_id, is_paid'
    })
  }

  // Verify appointment belongs to user's tenant
  const { data: appointment, error: appointmentError } = await supabase
    .from('appointments')
    .select('id, tenant_id')
    .eq('id', appointment_id)
    .single()

  if (appointmentError || !appointment) {
    throw createError({
      statusCode: 404,
      message: 'Appointment not found'
    })
  }

  if (appointment.tenant_id !== userProfile.tenant_id) {
    throw createError({
      statusCode: 403,
      message: 'Access denied: Appointment belongs to different tenant'
    })
  }

  // Build update data
  const updateData: any = { is_paid }

  if (payment_method) {
    updateData.payment_method = payment_method
  }

  // Update appointment
  const { data: updatedAppointment, error: updateError } = await supabase
    .from('appointments')
    .update(updateData)
    .eq('id', appointment_id)
    .select()
    .single()

  if (updateError) {
    console.error('Error updating appointment payment status:', updateError)
    throw createError({
      statusCode: 500,
      message: 'Failed to update appointment payment status'
    })
  }

  return {
    success: true,
    data: updatedAppointment
  }
})
