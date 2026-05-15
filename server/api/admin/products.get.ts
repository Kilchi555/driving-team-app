import { defineEventHandler, createError, getQuery } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const supabase = getSupabaseAdmin()
  const query = getQuery(event)
  const includeTopSelling = query.top_selling === 'true'

  const { data: products, error } = await supabase
    .from('products')
    .select('*')
    .eq('tenant_id', profile.tenant_id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  if (!includeTopSelling) {
    return { success: true, data: products || [] }
  }

  // Calculate top-selling product from product_sales
  const { data: salesData, error: salesError } = await supabase
    .from('product_sales')
    .select('product_id, quantity, products(name)')
    .eq('tenant_id', profile.tenant_id)
    .not('product_id', 'is', null)

  if (salesError) throw createError({ statusCode: 500, statusMessage: salesError.message })

  const productSalesMap = new Map<string, { name: string; quantity: number }>()
  for (const item of salesData || []) {
    const productId = item.product_id as string
    const productName = (item.products as any)?.name || 'Unbekannt'
    const qty = (item.quantity as number) || 0
    if (productSalesMap.has(productId)) {
      productSalesMap.get(productId)!.quantity += qty
    } else {
      productSalesMap.set(productId, { name: productName, quantity: qty })
    }
  }

  let topSellingProduct = { name: '', quantity: 0 }
  for (const product of productSalesMap.values()) {
    if (product.quantity > topSellingProduct.quantity) {
      topSellingProduct = product
    }
  }

  return { success: true, data: products || [], topSellingProduct }
})
