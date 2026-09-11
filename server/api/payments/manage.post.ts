// server/api/payments/manage.post.ts
import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/utils/supabase'
import { logger } from '~/utils/logger'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { consumeGiftCardForPayment } from '~/server/utils/consume-gift-card'
import { isRefundedPaymentStatus } from '~/utils/payment-status'
import {
  quoteStaffAppointmentFromRow,
  resolveStaffProductLinesPrice,
  staffQuoteMetadata,
  throwIfStaffPricingError,
} from '~/server/utils/staff-appointment-price'

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
    const user = await getAuthenticatedUser(event)
    if (!user) {
      throw new Error('Unauthorized')
    }

    const { data: dbUser } = await supabaseAdmin
      .from('users')
      .select('id, tenant_id, role')
      .eq('auth_user_id', user.id)
      .single()

    if (!dbUser) {
      throw new Error('Unauthorized')
    }

    const isPrivileged = ['admin', 'staff', 'super_admin', 'tenant_admin'].includes(dbUser.role)

    // ========== CREATE PAYMENT ==========
    if (action === 'create') {
      if (!isPrivileged) throw new Error('Unauthorized: role')
      if (!body.paymentData) {
        throw new Error('Payment data required')
      }

      logger.debug('➕ Creating payment')

      const method = String(body.paymentData.payment_method || 'cash')
      const offlineCompletable = ['cash', 'twint', 'bank_transfer', 'card_terminal', 'invoice'].includes(method)
      // Never allow creating an already-completed online/Wallee payment via this API
      let paymentStatus = body.paymentData.payment_status || 'pending'
      if (paymentStatus === 'completed' && !offlineCompletable) {
        paymentStatus = 'pending'
      }
      if (['wallee', 'online'].includes(method) && paymentStatus === 'completed') {
        paymentStatus = 'pending'
      }

      if (!body.paymentData.user_id) {
        throw new Error('user_id required')
      }

      const { data: payee, error: payeeError } = await supabaseAdmin
        .from('users')
        .select('id, tenant_id')
        .eq('id', body.paymentData.user_id)
        .maybeSingle()
      if (payeeError || !payee || payee.tenant_id !== dbUser.tenant_id) {
        throw new Error('user_id does not belong to this tenant')
      }

      const insertPayload: Record<string, any> = {
        tenant_id: dbUser.tenant_id,
        user_id: body.paymentData.user_id,
        staff_id: body.paymentData.staff_id || dbUser.id,
        appointment_id: body.paymentData.appointment_id || null,
        payment_method: method,
        payment_status: paymentStatus,
        currency: body.paymentData.currency || 'CHF',
        description: typeof body.paymentData.description === 'string' ? body.paymentData.description : null,
        metadata: body.paymentData.metadata && typeof body.paymentData.metadata === 'object' ? body.paymentData.metadata : {},
        lesson_price_rappen: 0,
        admin_fee_rappen: 0,
        products_price_rappen: 0,
        discount_amount_rappen: 0,
        voucher_discount_rappen: 0,
        credit_used_rappen: 0,
        total_amount_rappen: 0,
      }

      if (insertPayload.appointment_id) {
        const { data: appointment, error: appointmentError } = await supabaseAdmin
          .from('appointments')
          .select('id, tenant_id, type, event_type_code, duration_minutes, user_id, vehicle_id, room_id')
          .eq('id', insertPayload.appointment_id)
          .maybeSingle()
        if (appointmentError || !appointment || appointment.tenant_id !== dbUser.tenant_id) {
          throw new Error('Appointment not found')
        }
        try {
          const quoted = await quoteStaffAppointmentFromRow(supabaseAdmin, appointment, {
            productLines: body.paymentData.productLines || body.paymentData.items,
            mode: 'create',
          })
          insertPayload.lesson_price_rappen = quoted.totals.lesson_price_rappen
          insertPayload.admin_fee_rappen = quoted.totals.admin_fee_rappen
          insertPayload.products_price_rappen = quoted.totals.products_price_rappen
          insertPayload.discount_amount_rappen = quoted.totals.discount_amount_rappen
          insertPayload.total_amount_rappen = quoted.totals.total_amount_rappen
          insertPayload.credit_used_rappen = quoted.totals.credit_used_rappen
          insertPayload.metadata = {
            ...insertPayload.metadata,
            ...staffQuoteMetadata(quoted.quote, quoted.totals),
          }
        } catch (err) {
          throwIfStaffPricingError(err)
          throw err
        }
      } else {
        const items = Array.isArray(body.paymentData.items) ? body.paymentData.items : []
        const productLines = items
          .filter((item: any) => item.item_type === 'product' && (item.item_id || item.product_id))
          .map((item: any) => ({
            productId: item.item_id || item.product_id,
            quantity: item.quantity || 1,
          }))
        if (productLines.length === 0) {
          throw new Error('Standalone payments require product items; monetary amounts cannot be planted')
        }
        const productsPriceRappen = await resolveStaffProductLinesPrice(
          supabaseAdmin,
          dbUser.tenant_id,
          productLines,
        )
        insertPayload.products_price_rappen = productsPriceRappen
        insertPayload.total_amount_rappen = productsPriceRappen
      }
      if (paymentStatus === 'completed' && !insertPayload.paid_at) {
        insertPayload.paid_at = new Date().toISOString()
      }

      const { data, error } = await supabaseAdmin
        .from('payments')
        .insert(insertPayload)
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
    // Staff may complete offline payments (cash/invoice). Online completions require webhooks.
    if (action === 'mark-completed') {
      if (!isPrivileged) throw new Error('Unauthorized: role')
      if (!body.paymentId) {
        throw new Error('Payment ID required')
      }

      logger.debug('✅ Marking payment as completed:', body.paymentId)

      const { data: existing, error: loadError } = await supabaseAdmin
        .from('payments')
        .select('id, tenant_id, payment_method, payment_status, user_id, metadata')
        .eq('id', body.paymentId)
        .eq('tenant_id', dbUser.tenant_id)
        .maybeSingle()

      if (loadError || !existing) {
        throw new Error('Payment not found')
      }

      if (isRefundedPaymentStatus(existing.payment_status)) {
        throw new Error('Rückvergütete Zahlungen können nicht als bezahlt markiert werden.')
      }

      const method = String(existing.payment_method || '')
      const offlineCompletable = ['cash', 'twint', 'bank_transfer', 'card_terminal', 'invoice'].includes(method)
      if (!offlineCompletable) {
        throw new Error('Online payments can only be completed by verified payment webhooks')
      }

      const { data, error } = await supabaseAdmin
        .from('payments')
        .update({
          payment_status: 'completed',
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', body.paymentId)
        .eq('tenant_id', dbUser.tenant_id)
        .select()
        .single()

      if (error) {
        throw new Error(error.message)
      }

      await consumeGiftCardForPayment({
        supabase: supabaseAdmin,
        tenantId: existing.tenant_id,
        paymentId: existing.id,
        redeemedBy: existing.user_id,
        discountCode: existing.metadata?.discount_code ?? null,
      })

      logger.debug('✅ Payment marked as completed')

      return {
        success: true,
        data
      }
    }

    // ========== DELETE PAYMENT ==========
    if (action === 'delete') {
      if (!isPrivileged) throw new Error('Unauthorized: role')
      if (!body.paymentId) {
        throw new Error('Payment ID required')
      }

      logger.debug('🗑️ Deleting payment:', body.paymentId)

      const { error } = await supabaseAdmin
        .from('payments')
        .delete()
        .eq('id', body.paymentId)
        .eq('tenant_id', dbUser.tenant_id)

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

      // Clients may only load their own payments
      if (!isPrivileged && body.userId !== dbUser.id) {
        throw new Error('Unauthorized')
      }

      logger.debug('💳 Loading payments for user:', body.userId)

      let query = supabaseAdmin
        .from('payments')
        .select('*, payment_items(*)')
        .eq('user_id', body.userId)
        .order('created_at', { ascending: false })

      if (isPrivileged) {
        query = query.eq('tenant_id', dbUser.tenant_id)
      }

      const { data, error } = await query

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
      if (!isPrivileged) throw new Error('Unauthorized: role')
      if (!body.appointmentId) {
        throw new Error('Appointment ID required')
      }

      logger.debug('💳 Loading payments for appointment:', body.appointmentId)

      const { data, error } = await supabaseAdmin
        .from('payments')
        .select('*, payment_items(*)')
        .eq('appointment_id', body.appointmentId)
        .eq('tenant_id', dbUser.tenant_id)
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
