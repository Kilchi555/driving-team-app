import { defineEventHandler, getQuery, createError } from 'h3'
import { getSupabaseAdmin } from '~/utils/supabase'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { mapSupabaseError } from '~/server/utils/supabase-error'

export default defineEventHandler(async (event) => {
  const supabase = getSupabaseAdmin()

  // Bearer header with HTTP-only-cookie fallback + token refresh, instead of
  // a raw Bearer-only check that would 401 whenever the client's access
  // token had just expired.
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const userProfile = authUser.db_user_id
    ? { id: authUser.db_user_id, tenant_id: authUser.tenant_id }
    : null

  if (!userProfile) throw createError({ statusCode: 403, message: 'User profile not found' })

  try {
    const { data: invoices, error } = await supabase
      .from('invoices')
      .select('status, payment_status, total_amount_rappen, due_date')
      .eq('tenant_id', userProfile.tenant_id)

    if (error) throw mapSupabaseError(error)

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
