import { defineEventHandler, readBody, createError, getRouterParam } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const supabase = getSupabaseAdmin()
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)

  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing product id' })

  const {
    name, description, price_rappen, category,
    track_stock, stock_quantity, image_url, display_order,
    is_active, is_voucher, allow_custom_amount,
    is_credit_product, credit_amount_rappen, show_in_shop,
    allowed_driving_category_codes
  } = body

  if (!name) throw createError({ statusCode: 400, statusMessage: 'name is required' })

  const drivingCodes: string[] | null =
    Array.isArray(allowed_driving_category_codes) && allowed_driving_category_codes.length > 0
      ? allowed_driving_category_codes.map(String)
      : null

  const productData = {
    name: String(name).trim(),
    description: description?.trim() || null,
    price_rappen: Number(price_rappen) || 0,
    category: category?.trim() || null,
    track_stock: Boolean(track_stock),
    stock_quantity: track_stock ? (Number(stock_quantity) || null) : null,
    image_url: image_url?.trim() || null,
    display_order: Number(display_order) || 0,
    is_active: is_active !== undefined ? Boolean(is_active) : true,
    is_voucher: Boolean(is_voucher),
    allow_custom_amount: Boolean(allow_custom_amount),
    is_credit_product: Boolean(is_credit_product),
    credit_amount_rappen: is_credit_product ? (Number(credit_amount_rappen) || null) : null,
    show_in_shop: Boolean(show_in_shop),
    allowed_driving_category_codes: drivingCodes,
    tenant_id: profile.tenant_id
  }

  const { error } = await supabase
    .from('products')
    .update(productData)
    .eq('id', id)
    .eq('tenant_id', profile.tenant_id)

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return { success: true }
})
