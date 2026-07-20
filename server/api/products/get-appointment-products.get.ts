import { defineEventHandler, getQuery, createError } from 'h3'
import { getSupabaseAdmin } from '~/utils/supabase'
import { getAuthenticatedUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const supabase = getSupabaseAdmin()

  // Get authenticated user — Bearer header with HTTP-only-cookie fallback +
  // token refresh, instead of a raw Bearer-only check that would 401 whenever
  // the client's access token had just expired.
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  // User profile already resolved by getAuthenticatedUser
  const userProfile = authUser.db_user_id
    ? { id: authUser.db_user_id, tenant_id: authUser.tenant_id }
    : null

  if (!userProfile) {
    throw createError({ statusCode: 403, message: 'User profile not found' })
  }

  // Get query parameters
  const query = getQuery(event)
  const { appointment_id } = query

  if (!appointment_id) {
    throw createError({
      statusCode: 400,
      message: 'Missing required parameter: appointment_id'
    })
  }

  // Fetch products for appointment via product_sales
  const { data: productSales, error } = await supabase
    .from('product_sales')
    .select(`
      id,
      product_sale_items (
        id,
        quantity,
        unit_price_rappen,
        total_price_rappen,
        products (
          id,
          name,
          price_rappen,
          description,
          category,
          image_url
        )
      )
    `)
    .eq('appointment_id', appointment_id)
    .eq('tenant_id', userProfile.tenant_id)

  if (error) {
    console.error('Error fetching appointment products:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch appointment products'
    })
  }

  // Collect all products from product_sales entries
  const allProducts: any[] = []
  productSales?.forEach(sale => {
    if (sale.product_sale_items && sale.product_sale_items.length > 0) {
      sale.product_sale_items.forEach((item: any) => {
        allProducts.push({
          product: item.products,
          quantity: item.quantity,
          total_rappen: item.total_price_rappen
        })
      })
    }
  })

  return {
    success: true,
    data: allProducts
  }
})
