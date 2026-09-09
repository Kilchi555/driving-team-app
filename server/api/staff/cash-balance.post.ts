import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import {
  requireTenantStaff,
  loadStaffInTenant,
  assertSelfOrTenantAdmin,
} from '~/server/utils/require-tenant-auth'

export default defineEventHandler(async (event) => {
  const actor = await requireTenantStaff(event)
  const body = await readBody(event)
  const action = body?.action
  const data = body?.data || {}

  if (!action) {
    throw createError({
      statusCode: 400,
      message: 'action is required (loadMovements, loadTransactions)',
    })
  }

  const instructorId = data.instructorId
  if (!instructorId || typeof instructorId !== 'string') {
    throw createError({
      statusCode: 400,
      message: 'instructorId is required',
    })
  }

  const supabase = getSupabaseAdmin()
  const instructor = await loadStaffInTenant(supabase, instructorId, actor.tenant_id, {
    allowInactive: true,
  })
  assertSelfOrTenantAdmin(actor, instructor.id)

  try {
    if (action === 'loadMovements') {
      const { data: movements, error } = await supabase
        .from('cash_movements')
        .select('*')
        .eq('instructor_id', instructor.id)
        .eq('tenant_id', actor.tenant_id)
        .order('created_at', { ascending: false })

      if (error) throw error

      return {
        success: true,
        data: movements || [],
      }
    }

    if (action === 'loadTransactions') {
      const { data: transactions, error } = await supabase
        .from('cash_transactions')
        .select(
          `
          *,
          student:student_id(id, first_name, last_name)
        `,
        )
        .eq('instructor_id', instructor.id)
        .eq('tenant_id', actor.tenant_id)
        .order('created_at', { ascending: false })

      if (error) throw error

      const mappedTransactions = (transactions || []).map((transaction: any) => ({
        ...transaction,
        student_name: transaction.student
          ? `${transaction.student.first_name} ${transaction.student.last_name}`
          : 'Unbekannt',
      }))

      return {
        success: true,
        data: mappedTransactions || [],
      }
    }

    throw createError({
      statusCode: 400,
      message: 'Invalid action. Use: loadMovements or loadTransactions',
    })
  } catch (err: any) {
    if (err?.statusCode) throw err
    console.error('❌ Staff cash balance API error:', err)
    throw createError({
      statusCode: 500,
      message: err.message || 'Failed to load cash data',
    })
  }
})
