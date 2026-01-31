import { defineEventHandler, getQuery, createError, getHeader } from 'h3'
import { getSupabase } from '~/utils/supabase'

export default defineEventHandler(async (event) => {
  const supabase = getSupabase()

  const authHeader = getHeader(event, 'authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const token = authHeader.replace('Bearer ', '')
  const { data: { user: authUser } } = await supabase.auth.getUser(token)
  if (!authUser) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const { data: userProfile } = await supabase
    .from('users')
    .select('id, tenant_id')
    .eq('auth_user_id', authUser.id)
    .single()

  if (!userProfile) throw createError({ statusCode: 403, message: 'User profile not found' })

  try {
    const { data: invoices, error } = await supabase
      .from('invoices')
      .select('status, payment_status, total_amount_rappen, due_date')
      .eq('tenant_id', userProfile.tenant_id)

    if (error) throw error

    const summary = {
      total_invoices: invoices?.length || 0,
      total_amount: 0,
      paid_amount: 0,
      pending_amount: 0,
      overdue_amount: 0,
      draft_amount: 0
    }

    const now = new Date()

    invoices?.forEach((invoice: any) => {
      summary.total_amount += invoice.total_amount_rappen || 0

      if (invoice.status === 'draft') {
        summary.draft_amount += invoice.total_amount_rappen || 0
      }

      if (invoice.payment_status === 'paid') {
        summary.paid_amount += invoice.total_amount_rappen || 0
      } else if (invoice.payment_status === 'pending') {
        if (invoice.due_date && new Date(invoice.due_date) < now) {
          summary.overdue_amount += invoice.total_amount_rappen || 0
        } else {
          summary.pending_amount += invoice.total_amount_rappen || 0
        }
      }
    })

    return { success: true, data: summary }
  } catch (err: any) {
    console.error('Error fetching invoice summary:', err)
    throw createError({ statusCode: 500, message: err.message })
  }
})
