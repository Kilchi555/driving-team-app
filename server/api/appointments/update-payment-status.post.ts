import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/utils/supabase'
import { getAuthenticatedUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const supabase = getSupabaseAdmin()

  // Bearer header with HTTP-only-cookie fallback + token refresh, instead of
  // a raw Bearer-only check that would 401 whenever the client's access
  // token had just expired.
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  // User profile (already resolved by getAuthenticatedUser)
  const userProfile = authUser.db_user_id
    ? { id: authUser.db_user_id, tenant_id: authUser.tenant_id, role: authUser.role }
    : null

  if (!userProfile) {
    throw createError({ statusCode: 403, message: 'User profile not found' })
  }

  // Read and validate body
  const body = await readBody(event)
  const { appointment_id, payment_method } = body

  if (!appointment_id) {
    throw createError({
      statusCode: 400,
      message: 'Missing required field: appointment_id'
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
  const updateData: any = {}

  if (payment_method) {
    updateData.payment_method = payment_method
  }
  
  // Only update if there's something to update
  if (Object.keys(updateData).length === 0) {
    throw createError({
      statusCode: 400,
      message: 'No fields to update'
    })
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
