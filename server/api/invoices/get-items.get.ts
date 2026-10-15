import { defineEventHandler, getQuery, createError } from 'h3'
import { getSupabaseAdmin } from '~/utils/supabase'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { mapSupabaseError } from '~/server/utils/supabase-error'
import {
  expandProductsAsSeparateLines,
  groupProductSalesByAppointment,
} from '~/server/utils/invoice-product-lines'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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

  if (!userProfile?.tenant_id || !UUID_RE.test(String(userProfile.tenant_id))) {
    throw createError({ statusCode: 403, message: 'User profile not found' })
  }

  const query = getQuery(event)
  const invoiceId = typeof query.invoice_id === 'string' ? query.invoice_id : ''

  if (!UUID_RE.test(invoiceId)) {
    throw createError({ statusCode: 400, message: 'Missing invoice_id' })
  }

  try {
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('id')
      .eq('id', invoiceId)
      .eq('tenant_id', userProfile.tenant_id)
      .maybeSingle()

    if (invoiceError) throw mapSupabaseError(invoiceError)
    if (!invoice) throw createError({ statusCode: 404, message: 'Invoice not found' })

    const { data: items, error } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', invoiceId)
      .order('sort_order')

    if (error) throw mapSupabaseError(error)

    const baseItems = items || []

    // Produkte aus product_sales für Termine dieser Rechnung nachladen und
    // als eigene Positionen ausweisen (Lektionszeile ohne Produktanteil).
    const appointmentIds = baseItems
      .map((i: any) => i.appointment_id)
      .filter(Boolean)

    if (appointmentIds.length === 0) {
      return { success: true, data: baseItems }
    }

    const { data: productSales } = await supabase
      .from('product_sales')
      .select('appointment_id, product_id, quantity, total_price_rappen, products(id, name)')
      .in('appointment_id', appointmentIds)
      .or(`tenant_id.eq.${userProfile.tenant_id},tenant_id.is.null`)

    const productsByApt = groupProductSalesByAppointment((productSales || []) as any[])
    const expanded = expandProductsAsSeparateLines(baseItems as any[], productsByApt)

    return { success: true, data: expanded }
  } catch (err: any) {
    if (err?.statusCode) throw err
    console.error('Error fetching invoice items:', err)
    throw createError({ statusCode: 500, message: 'Error fetching invoice items' })
  }
})
