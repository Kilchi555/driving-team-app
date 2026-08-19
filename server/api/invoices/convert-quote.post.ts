import { defineEventHandler, readBody, createError } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { convertQuoteToInvoice } from '~/server/utils/convert-quote-to-invoice'

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser?.id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const body = await readBody(event)
  const invoiceId = body?.invoice_id || body?.invoiceId
  if (!invoiceId) throw createError({ statusCode: 400, statusMessage: 'invoice_id required' })

  const supabase = getSupabaseAdmin()
  const { data: staff } = await supabase
    .from('users')
    .select('id, tenant_id, role')
    .eq('auth_user_id', authUser.id)
    .single()

  if (!staff || !['admin', 'staff', 'tenant_admin'].includes(staff.role)) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  try {
    const { invoice } = await convertQuoteToInvoice({
      supabase,
      tenantId: staff.tenant_id,
      invoiceId,
      allowDraft: true,
    })
    return { success: true, data: invoice }
  } catch (err: any) {
    throw createError({ statusCode: 422, statusMessage: err.message || 'Umwandlung fehlgeschlagen' })
  }
})
