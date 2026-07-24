import { defineEventHandler, getQuery, createError } from 'h3'
import { getSupabaseAdmin } from '~/utils/supabase'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { mapSupabaseError } from '~/server/utils/supabase-error'
import {
  expandProductsAsSeparateLines,
  groupProductSalesByAppointment,
} from '~/server/utils/invoice-product-lines'

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

  const query = getQuery(event)
  const { invoice_id } = query

  if (!invoice_id) {
    throw createError({ statusCode: 400, message: 'Missing invoice_id' })
  }

  try {
    const { data: items, error } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', invoice_id)
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

    const productsByApt = groupProductSalesByAppointment((productSales || []) as any[])
    const expanded = expandProductsAsSeparateLines(baseItems as any[], productsByApt)

    return { success: true, data: expanded }
  } catch (err: any) {
    console.error('Error fetching invoice items:', err)
    throw createError({ statusCode: 500, message: err.message })
  }
})
