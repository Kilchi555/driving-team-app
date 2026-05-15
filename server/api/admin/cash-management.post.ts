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
  | 'staff_cash_handover'
  | 'load_staff_balances'
  | 'load_staff_movements'
  | 'load_staff_transactions'
  | 'top_up_cash'
  | 'withdraw_cash'

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
      // load_staff_balances / load_staff_movements / load_staff_transactions
      instructor_id?: string
      // top_up_cash / withdraw_cash
      movement_type?: string
      amount_rappen?: number
      performed_by?: string
      balance_before_rappen?: number
      balance_after_rappen?: number
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

    // ─── load_staff_balances ─────────────────────────────────────────────────
    if (action === 'load_staff_balances') {
      const [{ data: users, error: usersError }, { data: balancesRows, error: balancesError }, { data: movements, error: movementsError }] =
        await Promise.all([
          supabase.from('users').select('id, first_name, last_name, email, role').eq('role', 'staff').eq('tenant_id', callerUser.tenant_id).eq('is_active', true).is('deleted_at', null).order('first_name'),
          supabase.from('cash_balances').select('*').eq('tenant_id', callerUser.tenant_id),
          supabase.from('cash_movements').select('*').eq('tenant_id', callerUser.tenant_id),
        ])
      if (usersError) throw createError({ statusCode: 500, statusMessage: usersError.message })
      if (balancesError) throw createError({ statusCode: 500, statusMessage: balancesError.message })
      if (movementsError) throw createError({ statusCode: 500, statusMessage: movementsError.message })

      // Load cash_transactions per staff without tenant_id filter —
      // older rows may have no tenant_id set; we scope via instructor_id instead.
      const staffIds = (users || []).map(u => u.id)
      const { data: transactions } = staffIds.length
        ? await supabase.from('cash_transactions').select('instructor_id, amount_rappen, status').in('instructor_id', staffIds)
        : { data: [] }

      const instructorIdToBalance = new Map((balancesRows || []).map(row => [row.instructor_id, row]))
      const WITHDRAWAL_TYPES = ['withdrawal', 'cash_handover']
      const staffBalances = (users || []).map(user => {
        const persisted = instructorIdToBalance.get(user.id)
        let balance = 0
        movements?.forEach(m => {
          if (m.instructor_id !== user.id) return
          if (m.movement_type === 'deposit') balance += m.amount_rappen
          else if (WITHDRAWAL_TYPES.includes(m.movement_type)) balance -= m.amount_rappen
        })
        transactions?.forEach(t => {
          if (t.instructor_id === user.id && t.status === 'pending') balance += t.amount_rappen
        })
        return { ...user, current_balance_rappen: balance, last_updated: persisted?.last_updated || null, notes: persisted?.notes || null }
      })
      return { success: true, data: staffBalances }
    }

    // ─── load_staff_movements ─────────────────────────────────────────────────
    if (action === 'load_staff_movements') {
      const { instructor_id } = body
      if (!instructor_id) throw createError({ statusCode: 400, statusMessage: 'Missing instructor_id' })
      const { data: staffCheck } = await supabase.from('users').select('id').eq('id', instructor_id).eq('tenant_id', callerUser.tenant_id).single()
      if (!staffCheck) throw createError({ statusCode: 403, statusMessage: 'Staff not found' })
      const { data, error } = await supabase.from('cash_movements').select('*').eq('instructor_id', instructor_id).order('created_at', { ascending: false })
      if (error) throw createError({ statusCode: 500, statusMessage: error.message })
      return { success: true, data: data || [] }
    }

    // ─── load_staff_transactions ──────────────────────────────────────────────
    if (action === 'load_staff_transactions') {
      const { instructor_id } = body
      if (!instructor_id) throw createError({ statusCode: 400, statusMessage: 'Missing instructor_id' })
      const { data: staffCheck } = await supabase.from('users').select('id').eq('id', instructor_id).eq('tenant_id', callerUser.tenant_id).single()
      if (!staffCheck) throw createError({ statusCode: 403, statusMessage: 'Staff not found' })
      const { data, error } = await supabase
        .from('cash_transactions')
        .select('*, student:student_id(id, first_name, last_name)')
        .eq('instructor_id', instructor_id)
        .order('created_at', { ascending: false })
      if (error) throw createError({ statusCode: 500, statusMessage: error.message })
      const txns = (data || []).map(t => ({
        ...t,
        student_name: t.student ? `${(t.student as any).first_name} ${(t.student as any).last_name}` : 'Unbekannt'
      }))
      return { success: true, data: txns }
    }

    // ─── top_up_cash ──────────────────────────────────────────────────────────
    if (action === 'top_up_cash') {
      const { instructor_id, amount_rappen, balance_before_rappen, balance_after_rappen, notes } = body
      if (!instructor_id || amount_rappen === undefined) throw createError({ statusCode: 400, statusMessage: 'Missing instructor_id or amount_rappen' })
      const { data: staffCheck } = await supabase.from('users').select('id').eq('id', instructor_id).eq('tenant_id', callerUser.tenant_id).single()
      if (!staffCheck) throw createError({ statusCode: 403, statusMessage: 'Staff not found' })
      const { error } = await supabase.from('cash_movements').insert({
        instructor_id,
        tenant_id: callerUser.tenant_id,
        movement_type: 'deposit',
        amount_rappen,
        balance_before_rappen: balance_before_rappen || 0,
        balance_after_rappen: balance_after_rappen || 0,
        performed_by: callerUser.id,
        notes: notes || 'Kasse aufgestockt'
      })
      if (error) throw createError({ statusCode: 500, statusMessage: error.message })
      await logAudit({ user_id: authUser.id, action: 'top_up_cash', resource_type: 'cash_movement', resource_id: instructor_id, status: 'success', ip_address: clientIP })
      return { success: true }
    }

    // ─── withdraw_cash ────────────────────────────────────────────────────────
    if (action === 'withdraw_cash') {
      const { instructor_id, amount_rappen, balance_before_rappen, balance_after_rappen, notes } = body
      if (!instructor_id || amount_rappen === undefined) throw createError({ statusCode: 400, statusMessage: 'Missing instructor_id or amount_rappen' })
      const { data: staffCheck } = await supabase.from('users').select('id').eq('id', instructor_id).eq('tenant_id', callerUser.tenant_id).single()
      if (!staffCheck) throw createError({ statusCode: 403, statusMessage: 'Staff not found' })
      const { error } = await supabase.from('cash_movements').insert({
        instructor_id,
        tenant_id: callerUser.tenant_id,
        movement_type: 'withdrawal',
        amount_rappen,
        balance_before_rappen: balance_before_rappen || 0,
        balance_after_rappen: balance_after_rappen || 0,
        performed_by: callerUser.id,
        notes: notes || 'Kasse abgestockt'
      })
      if (error) throw createError({ statusCode: 500, statusMessage: error.message })
      await logAudit({ user_id: authUser.id, action: 'withdraw_cash', resource_type: 'cash_movement', resource_id: instructor_id, status: 'success', ip_address: clientIP })
      return { success: true }
    }

    // ─── staff_cash_handover ─────────────────────────────────────────────────
    if (action === 'staff_cash_handover') {
      if (!['admin', 'super_admin'].includes(callerUser.role)) {
        throw createError({ statusCode: 403, statusMessage: 'Admin role required' })
      }

      const { instructor_id, amount_rappen, notes } = body
      if (!instructor_id || amount_rappen === undefined) {
        throw createError({ statusCode: 400, statusMessage: 'Missing instructor_id or amount_rappen' })
      }
      if (typeof amount_rappen !== 'number' || amount_rappen <= 0) {
        throw createError({ statusCode: 400, statusMessage: 'Invalid amount' })
      }

      const { data: staffCheck } = await supabase
        .from('users')
        .select('id')
        .eq('id', instructor_id)
        .eq('tenant_id', callerUser.tenant_id)
        .single()
      if (!staffCheck) throw createError({ statusCode: 404, statusMessage: 'Staff not found' })

      const { error } = await supabase.from('cash_movements').insert({
        instructor_id,
        tenant_id: callerUser.tenant_id,
        movement_type: 'cash_handover',
        amount_rappen,
        balance_before_rappen: 0,
        balance_after_rappen: 0,
        performed_by: callerUser.id,
        notes: notes || null
      })
      if (error) throw createError({ statusCode: 500, statusMessage: error.message })

      await logAudit({
        user_id: authUser.id,
        action: 'staff_cash_handover',
        resource_type: 'cash_movement',
        resource_id: instructor_id,
        status: 'success',
        ip_address: clientIP,
        details: { amount_rappen }
      })
      return { success: true }
    }

    throw createError({ statusCode: 400, statusMessage: `Unknown action: ${action}` })

  } catch (err: any) {
    logger.error('❌ Error in cash management:', err)
    if (err.statusCode) throw err
    throw createError({ statusCode: 500, statusMessage: 'Cash management operation failed' })
  }
})
