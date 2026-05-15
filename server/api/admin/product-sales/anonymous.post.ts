import { defineEventHandler, readBody, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const supabase = getSupabaseAdmin()
  const body = await readBody(event)

  const { customer_name, notes, payment_method } = body

  const initialStatus = payment_method === 'cash' ? 'completed' : 'pending'

  const { data, error } = await supabase
    .from('product_sales')
    .insert({
      user_id: null,
      tenant_id: profile.tenant_id,
      total_amount_rappen: 0,
      status: initialStatus,
      metadata: {
        customer_name: customer_name || 'Anonymer Kunde',
        notes: notes || null,
        sale_type: 'anonymous',
        payment_method: payment_method || 'cash',
        created_by: 'staff',
        requires_payment: payment_method !== 'cash'
      }
    })
    .select()
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return { success: true, data }
})
