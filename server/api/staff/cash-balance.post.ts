import { defineEventHandler, readBody, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event, [
    'admin',
    'staff',
    'super_admin',
    'tenant_admin'
  ])

  const body = await readBody(event)
  const { action, data } = body

  if (!action) {
    throw createError({
      statusCode: 400,
      message: 'action is required (loadMovements, loadTransactions)'
    })
  }

  const instructorId = data?.instructorId
  if (!instructorId || typeof instructorId !== 'string') {
    throw createError({
      statusCode: 400,
      message: 'instructorId is required'
    })
  }

  // Non-admin staff may only read their own cash ledger
  if (
    profile.role === 'staff' &&
    profile.id !== instructorId
  ) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden – can only view own cash balance'
    })
  }

  const supabase = getSupabaseAdmin()

  // Ensure the instructor belongs to the caller's tenant (super_admin may cross tenants)
  if (profile.role !== 'super_admin') {
    const { data: instructor, error: instructorError } = await supabase
      .from('users')
      .select('id, tenant_id')
      .eq('id', instructorId)
      .eq('tenant_id', profile.tenant_id)
      .maybeSingle()

    if (instructorError || !instructor) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Forbidden – instructor not in tenant'
      })
    }
  }

  try {
    if (action === 'loadMovements') {
      const { data: movements, error } = await supabase
        .from('cash_movements')
        .select('*')
        .eq('instructor_id', instructorId)
        .order('created_at', { ascending: false })

      if (error) throw error

      return {
        success: true,
        data: movements || []
      }
    } else if (action === 'loadTransactions') {
      const { data: transactions, error } = await supabase
        .from('cash_transactions')
        .select(
          `
          *,
          student:student_id(id, first_name, last_name)
        `
        )
        .eq('instructor_id', instructorId)
        .order('created_at', { ascending: false })

      if (error) throw error

      const mappedTransactions = (transactions || []).map((transaction: any) => ({
        ...transaction,
        student_name: transaction.student
          ? `${transaction.student.first_name} ${transaction.student.last_name}`
          : 'Unbekannt'
      }))

      return {
        success: true,
        data: mappedTransactions || []
      }
    } else {
      throw createError({
        statusCode: 400,
        message: 'Invalid action. Use: loadMovements or loadTransactions'
      })
    }
  } catch (err: any) {
    console.error('❌ Staff cash balance API error:', err)
    throw createError({
      statusCode: err.statusCode || 500,
      message: err.message || 'Failed to load cash data'
    })
  }
})
