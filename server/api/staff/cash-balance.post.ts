import { defineEventHandler, readBody, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { action, data } = body

  if (!action) {
    throw createError({
      statusCode: 400,
      message: 'action is required (loadMovements, loadTransactions)'
    })
  }

  const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  )

  try {
    if (action === 'loadMovements') {
      const { instructorId } = data

      if (!instructorId) {
        throw createError({
          statusCode: 400,
          message: 'instructorId is required'
        })
      }

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
      const { instructorId } = data

      if (!instructorId) {
        throw createError({
          statusCode: 400,
          message: 'instructorId is required'
        })
      }

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
