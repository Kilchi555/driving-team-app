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

  const query = getQuery(event)
  const { invoice_id } = query

  if (!invoice_id) {
    throw createError({ statusCode: 400, message: 'Missing invoice_id' })
  }

  try {
    const { data: invoice, error } = await supabase
      .from('invoices_with_details')
      .select('*')
      .eq('id', invoice_id)
      .eq('tenant_id', userProfile.tenant_id)
      .single()

    if (error) throw error
    if (!invoice) throw new Error('Invoice not found')

    return { success: true, data: invoice }
  } catch (err: any) {
    console.error('Error fetching invoice:', err)
    throw createError({ statusCode: 500, message: err.message })
  }
})
