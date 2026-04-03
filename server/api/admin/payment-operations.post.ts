import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { getClientIP } from '~/server/utils/ip-utils'
import { logAudit } from '~/server/utils/audit'
import { logger } from '~/utils/logger'

type PaymentAction =
  | 'mark_paid'
  | 'mark_unpaid'
  | 'update_payment_method'
  | 'switch_to_cash'
  | 'soft_delete_appointment'
  | 'restore_appointment'
  | 'hard_delete_appointment'
  | 'hard_delete_appointments_bulk'
  | 'restore_appointments_bulk'
  | 'mark_paid_bulk'
  | 'update_user_payment_method'

const VALID_PAYMENT_METHODS = ['cash', 'invoice', 'twint', 'stripe_card', 'debit_card', 'wallee', 'credit']
const VALID_PAYMENT_STATUSES = ['pending', 'completed', 'failed', 'processing', 'cancelled']

export default defineEventHandler(async (event) => {
  try {
    // 1. Authentication
    const authUser = await getAuthenticatedUser(event)
    if (!authUser?.id) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    // 2. Rate limiting
    const clientIP = getClientIP(event)
    const rateLimitResult = await checkRateLimit(clientIP, 'admin_payment_operations', 60)
    if (!rateLimitResult.allowed) {
      throw createError({
        statusCode: 429,
        statusMessage: `Too many requests. Try again in ${rateLimitResult.retryAfter} seconds`
      })
    }

    const supabase = getSupabaseAdmin()

    // 3. Load caller profile + check role
    const { data: callerUser, error: callerError } = await supabase
      .from('users')
      .select('id, role, tenant_id')
      .eq('auth_user_id', authUser.id)
      .single()

    if (callerError || !callerUser) {
      throw createError({ statusCode: 403, statusMessage: 'Access denied' })
    }

    if (!['admin', 'staff', 'super_admin'].includes(callerUser.role)) {
      throw createError({ statusCode: 403, statusMessage: 'Staff or admin role required' })
    }

    const body = await readBody<{
      action: PaymentAction
      appointment_id?: string
      appointment_ids?: string[]
      payment_method?: string
      user_id?: string
      amount_rappen?: number
    }>(event)

    const { action } = body

    // ─── Helper: verify appointment belongs to caller's tenant ──────────────
    const verifyAppointment = async (appointmentId: string) => {
      const { data, error } = await supabase
        .from('appointments')
        .select('id, tenant_id, user_id, title, deleted_at')
        .eq('id', appointmentId)
        .single()

      if (error || !data || data.tenant_id !== callerUser.tenant_id) {
        throw createError({ statusCode: 404, statusMessage: 'Appointment not found' })
      }
      return data
    }

    const verifyUser = async (userId: string) => {
      const { data, error } = await supabase
        .from('users')
        .select('id, tenant_id')
        .eq('id', userId)
        .single()

      if (error || !data || data.tenant_id !== callerUser.tenant_id) {
        throw createError({ statusCode: 404, statusMessage: 'User not found' })
      }
      return data
    }

    const getOrCreatePayment = async (appointmentId: string, userId: string, amountRappen: number) => {
      const { data: existing } = await supabase
        .from('payments')
        .select('id, payment_status, payment_method')
        .eq('appointment_id', appointmentId)
        .single()

      if (existing) return existing

      const { data: newPayment, error } = await supabase
        .from('payments')
        .insert({
          appointment_id: appointmentId,
          user_id: userId,
          payment_status: 'pending',
          payment_method: 'cash',
          total_amount_rappen: amountRappen || 0,
          tenant_id: callerUser.tenant_id
        })
        .select('id, payment_status, payment_method')
        .single()

      if (error) throw error
      return newPayment
    }

    // ─── mark_paid ──────────────────────────────────────────────────────────
    if (action === 'mark_paid') {
      const { appointment_id, amount_rappen, user_id } = body
      if (!appointment_id) throw createError({ statusCode: 400, statusMessage: 'Missing appointment_id' })

      const appt = await verifyAppointment(appointment_id)
      const payment = await getOrCreatePayment(appointment_id, user_id || appt.user_id, amount_rappen || 0)

      const { error } = await supabase
        .from('payments')
        .update({ payment_status: 'completed', paid_at: new Date().toISOString() })
        .eq('id', payment.id)

      if (error) throw error

      await logAudit({ user_id: authUser.id, action: 'mark_payment_paid', resource_type: 'payment', resource_id: payment.id, status: 'success', ip_address: clientIP })
      return { success: true }
    }

    // ─── mark_unpaid ────────────────────────────────────────────────────────
    if (action === 'mark_unpaid') {
      const { appointment_id } = body
      if (!appointment_id) throw createError({ statusCode: 400, statusMessage: 'Missing appointment_id' })

      await verifyAppointment(appointment_id)

      const { data: payment } = await supabase.from('payments').select('id').eq('appointment_id', appointment_id).single()
      if (payment) {
        const { error } = await supabase.from('payments').update({ payment_status: 'pending' }).eq('id', payment.id)
        if (error) throw error
      }

      await logAudit({ user_id: authUser.id, action: 'mark_payment_unpaid', resource_type: 'payment', resource_id: payment?.id || appointment_id, status: 'success', ip_address: clientIP })
      return { success: true }
    }

    // ─── update_payment_method ──────────────────────────────────────────────
    if (action === 'update_payment_method') {
      const { appointment_id, payment_method, amount_rappen, user_id } = body
      if (!appointment_id || !payment_method) throw createError({ statusCode: 400, statusMessage: 'Missing appointment_id or payment_method' })
      if (!VALID_PAYMENT_METHODS.includes(payment_method)) throw createError({ statusCode: 400, statusMessage: 'Invalid payment method' })

      const appt = await verifyAppointment(appointment_id)
      const payment = await getOrCreatePayment(appointment_id, user_id || appt.user_id, amount_rappen || 0)

      const { error } = await supabase.from('payments').update({ payment_method }).eq('id', payment.id)
      if (error) throw error

      await logAudit({ user_id: authUser.id, action: 'update_payment_method', resource_type: 'payment', resource_id: payment.id, status: 'success', ip_address: clientIP, details: { payment_method } })
      return { success: true }
    }

    // ─── switch_to_cash ─────────────────────────────────────────────────────
    if (action === 'switch_to_cash') {
      const { appointment_id } = body
      if (!appointment_id) throw createError({ statusCode: 400, statusMessage: 'Missing appointment_id' })

      await verifyAppointment(appointment_id)

      const { error } = await supabase
        .from('payments')
        .update({ payment_method: 'cash', payment_status: 'completed', paid_at: new Date().toISOString() })
        .eq('appointment_id', appointment_id)

      if (error) throw error

      await logAudit({ user_id: authUser.id, action: 'switch_payment_to_cash', resource_type: 'payment', resource_id: appointment_id, status: 'success', ip_address: clientIP })
      return { success: true }
    }

    // ─── soft_delete_appointment ────────────────────────────────────────────
    if (action === 'soft_delete_appointment') {
      const { appointment_id } = body
      if (!appointment_id) throw createError({ statusCode: 400, statusMessage: 'Missing appointment_id' })

      const appt = await verifyAppointment(appointment_id)

      const now = new Date().toISOString()
      await supabase.from('payments').update({ deleted_at: now, deleted_by: callerUser.id, deletion_reason: 'Appointment deleted from admin panel' }).eq('appointment_id', appointment_id)
      const { error } = await supabase.from('appointments').update({ deleted_at: now, deleted_by: callerUser.id, deletion_reason: 'Manual deletion from admin panel' }).eq('id', appointment_id)
      if (error) throw error

      await logAudit({ user_id: authUser.id, action: 'soft_delete_appointment', resource_type: 'appointment', resource_id: appointment_id, status: 'success', ip_address: clientIP })
      return { success: true }
    }

    // ─── restore_appointment ────────────────────────────────────────────────
    if (action === 'restore_appointment') {
      const { appointment_id } = body
      if (!appointment_id) throw createError({ statusCode: 400, statusMessage: 'Missing appointment_id' })

      await verifyAppointment(appointment_id)
      const { error } = await supabase.from('appointments').update({ deleted_at: null }).eq('id', appointment_id)
      if (error) throw error

      await logAudit({ user_id: authUser.id, action: 'restore_appointment', resource_type: 'appointment', resource_id: appointment_id, status: 'success', ip_address: clientIP })
      return { success: true }
    }

    // ─── hard_delete_appointment ────────────────────────────────────────────
    if (action === 'hard_delete_appointment') {
      if (callerUser.role !== 'admin' && callerUser.role !== 'super_admin') {
        throw createError({ statusCode: 403, statusMessage: 'Admin role required for hard delete' })
      }

      const { appointment_id } = body
      if (!appointment_id) throw createError({ statusCode: 400, statusMessage: 'Missing appointment_id' })

      await verifyAppointment(appointment_id)

      const now = new Date().toISOString()
      await supabase.from('payments').update({ deleted_at: now, deleted_by: callerUser.id, deletion_reason: 'Permanent deletion from admin panel' }).eq('appointment_id', appointment_id)
      const { error } = await supabase.from('appointments').update({ deleted_at: now, deleted_by: callerUser.id, deletion_reason: 'Permanent deletion from admin panel' }).eq('id', appointment_id)
      if (error) throw error

      await logAudit({ user_id: authUser.id, action: 'hard_delete_appointment', resource_type: 'appointment', resource_id: appointment_id, status: 'success', ip_address: clientIP })
      return { success: true }
    }

    // ─── hard_delete_appointments_bulk ──────────────────────────────────────
    if (action === 'hard_delete_appointments_bulk') {
      if (callerUser.role !== 'admin' && callerUser.role !== 'super_admin') {
        throw createError({ statusCode: 403, statusMessage: 'Admin role required' })
      }

      const { appointment_ids } = body
      if (!appointment_ids?.length) throw createError({ statusCode: 400, statusMessage: 'Missing appointment_ids' })
      if (appointment_ids.length > 100) throw createError({ statusCode: 400, statusMessage: 'Too many appointments (max 100)' })

      for (const aptId of appointment_ids) {
        await verifyAppointment(aptId)
      }

      const now = new Date().toISOString()
      await supabase.from('payments').update({ deleted_at: now, deleted_by: callerUser.id, deletion_reason: 'Bulk deletion from admin panel' }).in('appointment_id', appointment_ids)
      const { error } = await supabase.from('appointments').update({ deleted_at: now, deleted_by: callerUser.id, deletion_reason: 'Bulk deletion from admin panel' }).in('id', appointment_ids)
      if (error) throw error

      await logAudit({ user_id: authUser.id, action: 'bulk_hard_delete_appointments', resource_type: 'appointment', resource_id: appointment_ids.join(','), status: 'success', ip_address: clientIP, details: { count: appointment_ids.length } })
      return { success: true, deleted_count: appointment_ids.length }
    }

    // ─── restore_appointments_bulk ──────────────────────────────────────────
    if (action === 'restore_appointments_bulk') {
      const { appointment_ids } = body
      if (!appointment_ids?.length) throw createError({ statusCode: 400, statusMessage: 'Missing appointment_ids' })
      if (appointment_ids.length > 100) throw createError({ statusCode: 400, statusMessage: 'Too many appointments (max 100)' })

      for (const aptId of appointment_ids) {
        await verifyAppointment(aptId)
      }

      const { error } = await supabase.from('appointments').update({ deleted_at: null }).in('id', appointment_ids)
      if (error) throw error

      await logAudit({ user_id: authUser.id, action: 'bulk_restore_appointments', resource_type: 'appointment', resource_id: appointment_ids.join(','), status: 'success', ip_address: clientIP, details: { count: appointment_ids.length } })
      return { success: true, restored_count: appointment_ids.length }
    }

    // ─── mark_paid_bulk ─────────────────────────────────────────────────────
    if (action === 'mark_paid_bulk') {
      const { appointment_ids } = body
      if (!appointment_ids?.length) throw createError({ statusCode: 400, statusMessage: 'Missing appointment_ids' })
      if (appointment_ids.length > 100) throw createError({ statusCode: 400, statusMessage: 'Too many appointments (max 100)' })

      const now = new Date().toISOString()
      for (const aptId of appointment_ids) {
        const appt = await verifyAppointment(aptId)
        const payment = await getOrCreatePayment(aptId, appt.user_id, 0)
        await supabase.from('payments').update({ payment_status: 'completed', paid_at: now }).eq('id', payment.id)
      }

      await logAudit({ user_id: authUser.id, action: 'bulk_mark_paid', resource_type: 'payment', resource_id: appointment_ids.join(','), status: 'success', ip_address: clientIP, details: { count: appointment_ids.length } })
      return { success: true, paid_count: appointment_ids.length }
    }

    // ─── update_user_payment_method ──────────────────────────────────────────
    if (action === 'update_user_payment_method') {
      const { user_id, payment_method } = body
      if (!user_id || !payment_method) throw createError({ statusCode: 400, statusMessage: 'Missing user_id or payment_method' })
      if (!VALID_PAYMENT_METHODS.includes(payment_method)) throw createError({ statusCode: 400, statusMessage: 'Invalid payment method' })

      await verifyUser(user_id)

      const { error } = await supabase.from('users').update({ preferred_payment_method: payment_method }).eq('id', user_id)
      if (error) throw error

      await logAudit({ user_id: authUser.id, action: 'update_user_payment_method', resource_type: 'user', resource_id: user_id, status: 'success', ip_address: clientIP, details: { payment_method } })
      return { success: true }
    }

    throw createError({ statusCode: 400, statusMessage: `Unknown action: ${action}` })

  } catch (err: any) {
    logger.error('❌ Error in payment-operations:', err)
    if (err.statusCode) throw err
    throw createError({ statusCode: 500, statusMessage: 'Payment operation failed' })
  }
})
