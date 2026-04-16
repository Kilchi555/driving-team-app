// server/api/payments/manage.post.ts
import { getSupabaseAdmin } from '~/utils/supabase'
import { logger } from '~/utils/logger'
import { getHeader } from 'h3'

interface ManagePaymentsBody {
  action: 'create' | 'mark-completed' | 'delete' | 'load-user' | 'load-appointment' | 'switch-to-invoice'
  paymentId?: string
  appointmentId?: string
  userId?: string
  paymentData?: any
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody<ManagePaymentsBody>(event)
    const { action } = body

    logger.debug('💳 Payments action:', action)

    const supabaseAdmin = getSupabaseAdmin()
    const authorization = getHeader(event, 'authorization')
    const token = authorization?.replace('Bearer ', '')

    if (!token) {
      throw new Error('No authorization token')
    }

    // Get current user
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    // ========== CREATE PAYMENT ==========
    if (action === 'create') {
      if (!body.paymentData) {
        throw new Error('Payment data required')
      }

      logger.debug('➕ Creating payment')

      const { data, error } = await supabaseAdmin
        .from('payments')
        .insert(body.paymentData)
        .select()
        .single()

      if (error) {
        throw new Error(error.message)
      }

      logger.debug('✅ Payment created:', data.id)

      return {
        success: true,
        data
      }
    }

    // ========== MARK AS COMPLETED ==========
    if (action === 'mark-completed') {
      if (!body.paymentId) {
        throw new Error('Payment ID required')
      }

      logger.debug('✅ Marking payment as completed:', body.paymentId)

      const { data, error } = await supabaseAdmin
        .from('payments')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', body.paymentId)
        .select()
        .single()

      if (error) {
        throw new Error(error.message)
      }

      logger.debug('✅ Payment marked as completed')

      return {
        success: true,
        data
      }
    }

    // ========== DELETE PAYMENT ==========
    if (action === 'delete') {
      if (!body.paymentId) {
        throw new Error('Payment ID required')
      }

      logger.debug('🗑️ Deleting payment:', body.paymentId)

      const { error } = await supabaseAdmin
        .from('payments')
        .delete()
        .eq('id', body.paymentId)

      if (error) {
        throw new Error(error.message)
      }

      logger.debug('✅ Payment deleted')

      return {
        success: true,
        message: 'Payment deleted'
      }
    }

    // ========== LOAD USER PAYMENTS ==========
    if (action === 'load-user') {
      if (!body.userId) {
        throw new Error('User ID required')
      }

      logger.debug('💳 Loading payments for user:', body.userId)

      const { data, error } = await supabaseAdmin
        .from('payments')
        .select('*, payment_items(*)')
        .eq('user_id', body.userId)
        .order('created_at', { ascending: false })

      if (error) {
        throw new Error(error.message)
      }

      logger.debug('✅ Payments loaded:', data?.length || 0)

      return {
        success: true,
        data: data || []
      }
    }

    // ========== LOAD APPOINTMENT PAYMENTS ==========
    if (action === 'load-appointment') {
      if (!body.appointmentId) {
        throw new Error('Appointment ID required')
      }

      logger.debug('💳 Loading payments for appointment:', body.appointmentId)

      const { data, error } = await supabaseAdmin
        .from('payments')
        .select('*, payment_items(*)')
        .eq('appointment_id', body.appointmentId)
        .order('created_at', { ascending: false })

      if (error) {
        throw new Error(error.message)
      }

      logger.debug('✅ Appointment payments loaded:', data?.length || 0)

      return {
        success: true,
        data: data || []
      }
    }

    // ========== SWITCH TO INVOICE ==========
    if (action === 'switch-to-invoice') {
      if (!body.paymentId) throw new Error('Payment ID required')

      const { data: payment } = await supabaseAdmin
        .from('payments')
        .select('id, tenant_id, payment_method, payment_status')
        .eq('id', body.paymentId)
        .single()

      if (!payment) throw new Error('Payment not found')

      const { data: dbUser } = await supabaseAdmin
        .from('users')
        .select('tenant_id, role')
        .eq('auth_user_id', user.id)
        .single()

      if (!dbUser || (payment.tenant_id && dbUser.tenant_id !== payment.tenant_id)) throw new Error('Unauthorized: tenant mismatch')
      if (!['admin', 'staff'].includes(dbUser.role)) throw new Error('Unauthorized: role')

      logger.debug('📄 Switching payment to invoice:', body.paymentId)

      const { data: updated, error: updateErr } = await supabaseAdmin
        .from('payments')
        .update({
          payment_method: 'invoice',
          payment_status: 'pending',
          updated_at: new Date().toISOString(),
        })
        .eq('id', body.paymentId)
        .select()
        .single()

      if (updateErr) throw new Error(updateErr.message)

      logger.debug('✅ Payment switched to invoice')
      return { success: true, data: updated }
    }

    throw new Error('Unknown action: ' + action)

  } catch (error: any) {
    logger.error('❌ Error managing payments:', error)
    throw createError({
      statusCode: 400,
      statusMessage: error.message || 'Failed to manage payments'
    })
  }
})
