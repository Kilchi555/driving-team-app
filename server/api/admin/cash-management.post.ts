import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { getClientIP } from '~/server/utils/ip-utils'
import { logAudit } from '~/server/utils/audit'
import { logger } from '~/utils/logger'

type CashAction =
  | 'dispute_transaction'
  | 'confirm_transaction'
  | 'edit_transaction_notes'
  | 'create_cash_transaction'
  | 'create_office_register'
  | 'assign_staff_to_register'

export default defineEventHandler(async (event) => {
  try {
    // 1. Authentication
    const authUser = await getAuthenticatedUser(event)
    if (!authUser?.id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

    // 2. Rate limiting
    const clientIP = getClientIP(event)
    const rateLimitResult = await checkRateLimit(clientIP, 'cash_management', 30)
    if (!rateLimitResult.allowed) {
      throw createError({
        statusCode: 429,
        statusMessage: `Too many requests. Try again in ${rateLimitResult.retryAfter} seconds`
      })
    }

    const supabase = getSupabaseAdmin()

    // 3. Load caller profile
    const { data: callerUser } = await supabase
      .from('users')
      .select('id, role, tenant_id')
      .eq('auth_user_id', authUser.id)
      .single()

    if (!callerUser) throw createError({ statusCode: 403, statusMessage: 'Access denied' })
    if (!['admin', 'staff', 'super_admin'].includes(callerUser.role)) {
      throw createError({ statusCode: 403, statusMessage: 'Staff or admin role required' })
    }

    const body = await readBody<{
      action: CashAction
      transaction_id?: string
      confirmation_amount?: number
      confirmation_notes?: string
      notes?: string
      // create_cash_transaction
      student_id?: string
      appointment_id?: string
      amount_rappen?: number
      // create_office_register
      name?: string
      description?: string
      location?: string
      register_type?: string
      // assign_staff_to_register
      register_id?: string
      staff_id?: string
      access_level?: string
      time_restrictions?: any
    }>(event)

    const { action } = body

    // ─── Helper: verify transaction belongs to caller's tenant ───────────────
    const verifyTransaction = async (transactionId: string) => {
      const { data, error } = await supabase
        .from('cash_transactions')
        .select('id, tenant_id, status')
        .eq('id', transactionId)
        .single()

      if (error || !data || data.tenant_id !== callerUser.tenant_id) {
        throw createError({ statusCode: 404, statusMessage: 'Transaction not found' })
      }
      return data
    }

    // ─── dispute_transaction ─────────────────────────────────────────────────
    if (action === 'dispute_transaction') {
      const { transaction_id } = body
      if (!transaction_id) throw createError({ statusCode: 400, statusMessage: 'Missing transaction_id' })

      const txn = await verifyTransaction(transaction_id)
      if (txn.status === 'disputed') {
        throw createError({ statusCode: 409, statusMessage: 'Transaction already disputed' })
      }

      const { error } = await supabase
        .from('cash_transactions')
        .update({ status: 'disputed' })
        .eq('id', transaction_id)

      if (error) throw error

      await logAudit({ user_id: authUser.id, action: 'dispute_cash_transaction', resource_type: 'cash_transaction', resource_id: transaction_id, status: 'success', ip_address: clientIP })
      return { success: true }
    }

    // ─── confirm_transaction ────────────────────────────────────────────────
    if (action === 'confirm_transaction') {
      if (callerUser.role !== 'admin' && callerUser.role !== 'super_admin') {
        throw createError({ statusCode: 403, statusMessage: 'Admin role required to confirm' })
      }

      const { transaction_id, confirmation_amount, confirmation_notes } = body
      if (!transaction_id || confirmation_amount === undefined) {
        throw createError({ statusCode: 400, statusMessage: 'Missing transaction_id or confirmation_amount' })
      }

      if (typeof confirmation_amount !== 'number' || confirmation_amount <= 0) {
        throw createError({ statusCode: 400, statusMessage: 'Invalid confirmation amount' })
      }

      await verifyTransaction(transaction_id)

      const now = new Date().toISOString()
      const { error: updateError } = await supabase
        .from('cash_transactions')
        .update({ status: 'confirmed', confirmed_by: callerUser.id, confirmed_at: now })
        .eq('id', transaction_id)

      if (updateError) throw updateError

      const { error: confirmError } = await supabase
        .from('cash_confirmations')
        .insert({
          transaction_id,
          confirmed_by: callerUser.id,
          amount_confirmed: confirmation_amount,
          notes: confirmation_notes || null
        })

      if (confirmError) throw confirmError

      await logAudit({ user_id: authUser.id, action: 'confirm_cash_transaction', resource_type: 'cash_transaction', resource_id: transaction_id, status: 'success', ip_address: clientIP })
      return { success: true }
    }

    // ─── edit_transaction_notes ──────────────────────────────────────────────
    if (action === 'edit_transaction_notes') {
      const { transaction_id, notes } = body
      if (!transaction_id) throw createError({ statusCode: 400, statusMessage: 'Missing transaction_id' })

      await verifyTransaction(transaction_id)

      const { error } = await supabase
        .from('cash_transactions')
        .update({ notes: notes || null })
        .eq('id', transaction_id)

      if (error) throw error

      await logAudit({ user_id: authUser.id, action: 'edit_cash_transaction_notes', resource_type: 'cash_transaction', resource_id: transaction_id, status: 'success', ip_address: clientIP })
      return { success: true }
    }

    // ─── create_cash_transaction ─────────────────────────────────────────────
    if (action === 'create_cash_transaction') {
      const { student_id, appointment_id, amount_rappen, notes } = body
      if (!student_id || !appointment_id || !amount_rappen) {
        throw createError({ statusCode: 400, statusMessage: 'Missing student_id, appointment_id, or amount_rappen' })
      }

      if (typeof amount_rappen !== 'number' || amount_rappen <= 0 || amount_rappen > 100000 * 100) {
        throw createError({ statusCode: 400, statusMessage: 'Invalid amount' })
      }

      // Verify student belongs to same tenant
      const { data: student } = await supabase
        .from('users')
        .select('id, tenant_id')
        .eq('id', student_id)
        .eq('tenant_id', callerUser.tenant_id)
        .single()

      if (!student) throw createError({ statusCode: 404, statusMessage: 'Student not found' })

      // Verify appointment belongs to same tenant
      const { data: appointment } = await supabase
        .from('appointments')
        .select('id, tenant_id')
        .eq('id', appointment_id)
        .eq('tenant_id', callerUser.tenant_id)
        .single()

      if (!appointment) throw createError({ statusCode: 404, statusMessage: 'Appointment not found' })

      const { data, error } = await supabase.rpc('create_cash_transaction', {
        p_instructor_id: callerUser.id,
        p_student_id: student_id,
        p_appointment_id: appointment_id,
        p_amount_rappen: amount_rappen,
        p_notes: notes || null
      })

      if (error) throw error

      await logAudit({ user_id: authUser.id, action: 'create_cash_transaction', resource_type: 'cash_transaction', resource_id: String(data), status: 'success', ip_address: clientIP, details: { amount_rappen } })
      return { success: true, data }
    }

    // ─── create_office_register ──────────────────────────────────────────────
    if (action === 'create_office_register') {
      if (!['admin', 'super_admin'].includes(callerUser.role)) {
        throw createError({ statusCode: 403, statusMessage: 'Admin role required' })
      }

      const { name, description, location, register_type } = body
      if (!name || !register_type) throw createError({ statusCode: 400, statusMessage: 'Missing name or register_type' })

      const allowedTypes = ['office', 'reception', 'exam', 'emergency']
      if (!allowedTypes.includes(register_type)) {
        throw createError({ statusCode: 400, statusMessage: 'Invalid register_type' })
      }

      const { data, error } = await supabase.rpc('create_office_cash_register', {
        p_tenant_id: callerUser.tenant_id,
        p_name: name,
        p_description: description || null,
        p_location: location || null,
        p_register_type: register_type,
        p_created_by: callerUser.id
      })

      if (error) throw error

      await logAudit({ user_id: authUser.id, action: 'create_office_cash_register', resource_type: 'office_cash_register', resource_id: String(data), status: 'success', ip_address: clientIP })
      return { success: true, data }
    }

    // ─── assign_staff_to_register ─────────────────────────────────────────────
    if (action === 'assign_staff_to_register') {
      if (!['admin', 'super_admin'].includes(callerUser.role)) {
        throw createError({ statusCode: 403, statusMessage: 'Admin role required' })
      }

      const { register_id, staff_id, access_level, time_restrictions } = body
      if (!register_id || !staff_id || !access_level) {
        throw createError({ statusCode: 400, statusMessage: 'Missing register_id, staff_id, or access_level' })
      }

      const allowedLevels = ['manager', 'operator', 'viewer']
      if (!allowedLevels.includes(access_level)) {
        throw createError({ statusCode: 400, statusMessage: 'Invalid access_level' })
      }

      // Verify register belongs to caller's tenant
      const { data: register } = await supabase
        .from('office_cash_registers')
        .select('id, tenant_id')
        .eq('id', register_id)
        .single()

      if (!register || register.tenant_id !== callerUser.tenant_id) {
        throw createError({ statusCode: 404, statusMessage: 'Register not found' })
      }

      // Verify staff belongs to caller's tenant
      const { data: staffUser } = await supabase
        .from('users')
        .select('id, tenant_id, role')
        .eq('id', staff_id)
        .eq('tenant_id', callerUser.tenant_id)
        .single()

      if (!staffUser) throw createError({ statusCode: 404, statusMessage: 'Staff not found' })

      const { error } = await supabase.rpc('assign_staff_to_office_cash', {
        p_cash_register_id: register_id,
        p_staff_id: staff_id,
        p_access_level: access_level,
        p_assigned_by: callerUser.id,
        p_time_restrictions: time_restrictions || null
      })

      if (error) throw error

      await logAudit({ user_id: authUser.id, action: 'assign_staff_to_cash_register', resource_type: 'office_cash_register', resource_id: register_id, status: 'success', ip_address: clientIP, details: { staff_id, access_level } })
      return { success: true }
    }

    throw createError({ statusCode: 400, statusMessage: `Unknown action: ${action}` })

  } catch (err: any) {
    logger.error('❌ Error in cash management:', err)
    if (err.statusCode) throw err
    throw createError({ statusCode: 500, statusMessage: 'Cash management operation failed' })
  }
})
