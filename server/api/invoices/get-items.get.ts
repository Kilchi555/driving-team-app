import { defineEventHandler, getQuery, createError, getHeader } from 'h3'
import { getSupabaseAdmin } from '~/utils/supabase'
import { mapSupabaseError } from '~/server/utils/supabase-error'

export default defineEventHandler(async (event) => {
  const supabase = getSupabaseAdmin()

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
    const { data: items, error } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', invoice_id)
      .order('sort_order')

    if (error) throw mapSupabaseError(error)

    const baseItems = items || []

    // Produkte aus product_sales für die Termine dieser Rechnung nachladen
    // (Für Rechnungen bei denen Produkte nicht als invoice_items gespeichert wurden)
    const appointmentIds = baseItems
      .map((i: any) => i.appointment_id)
      .filter(Boolean)

    let productItems: any[] = []
    if (appointmentIds.length > 0) {
      // Direkt product_sales für alle Termine dieser Rechnung laden
      const { data: productSales } = await supabase
        .from('product_sales')
        .select('appointment_id, total_price_rappen, products(id, name)')
        .in('appointment_id', appointmentIds)

      if (productSales) {
        for (const ps of productSales as any[]) {
          const prod = ps.products as any
          if (!prod) continue
          // Nur einbauen wenn noch kein invoice_item mit diesem product_id für diesen Termin existiert
          const alreadyListed = baseItems.some(
            (i: any) => i.appointment_id === ps.appointment_id && i.product_id === prod.id
          )
          if (!alreadyListed) {
            productItems.push({
              id: `product-${ps.appointment_id}-${prod.id}`,
              invoice_id: invoice_id,
              appointment_id: ps.appointment_id,
              product_id: prod.id,
              product_name: prod.name,
              product_description: null,
              quantity: 1,
              unit_price_rappen: ps.total_price_rappen || 0,
              total_price_rappen: ps.total_price_rappen || 0,
              vat_rate: 0,
              vat_amount_rappen: 0,
              sort_order: 999,
              _is_product_sale: true,
            })
          }
        }
      }
    }

    return { success: true, data: [...baseItems, ...productItems] }
  } catch (err: any) {
    console.error('Error fetching invoice items:', err)
    throw createError({ statusCode: 500, message: err.message })
  }
})
