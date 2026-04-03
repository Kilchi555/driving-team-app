import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { getClientIP } from '~/server/utils/ip-utils'
import { logger } from '~/utils/logger'

interface CartItem {
  product_id: string
  quantity: number
}

export default defineEventHandler(async (event) => {
  try {
    const clientIP = getClientIP(event)

    // Rate limiting: anonymous endpoint — strict limit
    const rateLimitResult = await checkRateLimit(clientIP, 'anonymous_sale_checkout', 10)
    if (!rateLimitResult.allowed) {
      throw createError({
        statusCode: 429,
        statusMessage: `Too many requests. Try again in ${rateLimitResult.retryAfter} seconds`
      })
    }

    const body = await readBody<{ sale_id: string; items: CartItem[] }>(event)
    const { sale_id, items } = body

    if (!sale_id || !items || !Array.isArray(items) || items.length === 0) {
      throw createError({ statusCode: 400, statusMessage: 'Missing sale_id or items' })
    }

    if (items.length > 50) {
      throw createError({ statusCode: 400, statusMessage: 'Too many items' })
    }

    const supabase = getSupabaseAdmin()

    // 1. Load and validate the sale (must be anonymous: user_id IS NULL)
    const { data: sale, error: saleError } = await supabase
      .from('product_sales')
      .select('id, user_id, tenant_id, metadata, status')
      .eq('id', sale_id)
      .single()

    if (saleError || !sale) {
      throw createError({ statusCode: 404, statusMessage: 'Sale not found' })
    }

    if (sale.user_id !== null) {
      throw createError({ statusCode: 403, statusMessage: 'This sale is not anonymous' })
    }

    if (sale.status && sale.status !== 'pending') {
      throw createError({ statusCode: 409, statusMessage: 'Sale already processed' })
    }

    // 2. Validate all product_ids and load prices SERVER-SIDE
    const productIds = items.map(i => i.product_id)
    const uniqueProductIds = [...new Set(productIds)]

    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, price_rappen, is_active, tenant_id')
      .in('id', uniqueProductIds)
      .eq('is_active', true)
      .eq('tenant_id', sale.tenant_id)

    if (productsError) throw productsError

    if (!products || products.length !== uniqueProductIds.length) {
      throw createError({
        statusCode: 400,
        statusMessage: 'One or more products not found or inactive'
      })
    }

    const productMap = new Map(products.map(p => [p.id, p]))

    // 3. Validate quantities and calculate total SERVER-SIDE
    const validatedItems = items.map(item => {
      const product = productMap.get(item.product_id)
      if (!product) {
        throw createError({ statusCode: 400, statusMessage: `Product ${item.product_id} not found` })
      }

      const qty = parseInt(String(item.quantity), 10)
      if (!Number.isInteger(qty) || qty < 1 || qty > 100) {
        throw createError({ statusCode: 400, statusMessage: `Invalid quantity for product ${item.product_id}` })
      }

      return {
        product_sale_id: sale_id,
        product_id: item.product_id,
        quantity: qty,
        price_rappen: product.price_rappen  // price from DB, not from client
      }
    })

    const totalAmountRappen = validatedItems.reduce(
      (sum, item) => sum + item.price_rappen * item.quantity, 0
    )

    // 4. Delete any existing items (idempotent re-checkout)
    await supabase.from('product_sale_items').delete().eq('product_sale_id', sale_id)

    // 5. Insert validated items with server-side prices
    const { error: itemsError } = await supabase
      .from('product_sale_items')
      .insert(validatedItems)

    if (itemsError) throw itemsError

    // 6. Update sale total (server-calculated)
    const { error: updateError } = await supabase
      .from('product_sales')
      .update({
        total_amount_rappen: totalAmountRappen,
        metadata: {
          ...sale.metadata,
          cart_items: validatedItems.map(i => ({
            product_id: i.product_id,
            quantity: i.quantity,
            price_rappen: i.price_rappen,
            product_name: productMap.get(i.product_id)?.name
          })),
          updated_at: new Date().toISOString()
        }
      })
      .eq('id', sale_id)

    if (updateError) throw updateError

    // 7. Create Wallee transaction via internal API call
    const walleeResponse = await $fetch('/api/wallee/create-anonymous-transaction', {
      method: 'POST',
      body: {
        amount: totalAmountRappen,
        currency: 'CHF',
        customer_name: sale.metadata?.customer_name || 'Anonymer Kunde',
        customer_email: sale.metadata?.customer_email || null,
        sale_id: sale_id,
        items: validatedItems.map(i => ({
          name: productMap.get(i.product_id)?.name || 'Produkt',
          quantity: i.quantity,
          price_rappen: i.price_rappen
        }))
      }
    }) as any

    if (!walleeResponse?.success || !walleeResponse?.payment_url) {
      throw createError({
        statusCode: 502,
        statusMessage: walleeResponse?.error || 'Payment gateway error'
      })
    }

    logger.info(`✅ Anonymous sale checkout: sale=${sale_id}, total=${totalAmountRappen} Rappen, items=${validatedItems.length}`)

    return {
      success: true,
      payment_url: walleeResponse.payment_url,
      total_amount_rappen: totalAmountRappen
    }

  } catch (err: any) {
    logger.error('❌ Error in anonymous-sale checkout:', err)
    if (err.statusCode) throw err
    throw createError({ statusCode: 500, statusMessage: 'Checkout failed' })
  }
})
