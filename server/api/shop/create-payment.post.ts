// server/api/shop/create-payment.post.ts
// Public endpoint to create a payment record for standalone shop purchases
// No authentication required — supports guest checkout
// tenantId must be provided in body (validated against DB)

import { defineEventHandler, readBody, createError, getHeader } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { sanitizeString, validateUUID } from '~/server/utils/validators'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  // Follow same public-payment pattern as /api/payments/process-public:
  // public endpoint + strict server-side validation/rate-limiting with admin client.
  const supabase = getSupabaseAdmin()

  try {
    const ipAddress = getHeader(event, 'x-forwarded-for')?.split(',')[0].trim() ||
      getHeader(event, 'x-real-ip') ||
      event.node.req.socket.remoteAddress ||
      'unknown'

    const body = await readBody(event)
    if (!body || typeof body !== 'object') {
      throw createError({ statusCode: 400, message: 'Ungültiger Request-Body' })
    }

    const {
      user_id,
      staff_id,
      tenant_id,
      total_amount_rappen,
      products_price_rappen,
      discount_amount_rappen,
      admin_fee_rappen = 0,
      payment_method = 'wallee',
      currency = 'CHF',
      description = 'Produktkauf',
      metadata
    } = body

    const MAX_TOTAL_AMOUNT_RAPPEN = 5000000 // CHF 50'000 hard cap for public checkout
    const MAX_METADATA_CHARS = 20000
    const tenantId = sanitizeString(tenant_id, 64)
    const userId = user_id ? sanitizeString(user_id, 64) : null
    const staffId = staff_id ? sanitizeString(staff_id, 64) : null
    const paymentMethod = sanitizeString(payment_method, 32) || 'wallee'
    const paymentCurrency = sanitizeString(currency, 8) || 'CHF'
    const paymentDescription = sanitizeString(description, 255) || 'Produktkauf'

    const rateLimit = await checkRateLimit(
      ipAddress,
      'shop_create_payment',
      20,
      5 * 60 * 1000,
      typeof metadata?.customer_email === 'string' ? metadata.customer_email : undefined,
      tenantId || undefined
    )
    if (!rateLimit.allowed) {
      throw createError({
        statusCode: 429,
        message: 'Zu viele Zahlungsanfragen. Bitte versuchen Sie es in wenigen Minuten erneut.'
      })
    }

    // Validate required fields
    if (!tenantId) {
      throw createError({ statusCode: 400, message: 'tenant_id ist erforderlich' })
    }
    if (!validateUUID(tenantId).valid) {
      throw createError({ statusCode: 400, message: 'tenant_id ist ungültig' })
    }
    if (userId && !validateUUID(userId).valid) {
      throw createError({ statusCode: 400, message: 'user_id ist ungültig' })
    }
    if (staffId && !validateUUID(staffId).valid) {
      throw createError({ statusCode: 400, message: 'staff_id ist ungültig' })
    }

    const isIntegerAmount = (value: any) => Number.isInteger(value) && value >= 0
    if (!isIntegerAmount(total_amount_rappen) || total_amount_rappen <= 0) {
      throw createError({ statusCode: 400, message: 'total_amount_rappen muss eine positive Zahl sein' })
    }
    if (!isIntegerAmount(products_price_rappen ?? 0)) {
      throw createError({ statusCode: 400, message: 'products_price_rappen muss eine gültige Zahl sein' })
    }
    if (!isIntegerAmount(discount_amount_rappen ?? 0)) {
      throw createError({ statusCode: 400, message: 'discount_amount_rappen muss eine gültige Zahl sein' })
    }
    if (!isIntegerAmount(admin_fee_rappen ?? 0)) {
      throw createError({ statusCode: 400, message: 'admin_fee_rappen muss eine gültige Zahl sein' })
    }
    if (paymentCurrency !== 'CHF') {
      throw createError({ statusCode: 400, message: 'Nur CHF wird unterstützt' })
    }
    if (total_amount_rappen > MAX_TOTAL_AMOUNT_RAPPEN) {
      throw createError({ statusCode: 400, message: 'Betrag überschreitet das erlaubte Maximum' })
    }
    if (paymentMethod !== 'wallee') {
      throw createError({ statusCode: 400, message: 'Nur wallee wird unterstützt' })
    }

    // Client amount fields are non-authoritative; totals are recomputed from DB products below.
    if (discount_amount_rappen != null && (!Number.isInteger(discount_amount_rappen) || discount_amount_rappen < 0)) {
      throw createError({ statusCode: 400, message: 'discount_amount_rappen muss eine gültige Zahl sein' })
    }
    if (admin_fee_rappen != null && (!Number.isInteger(admin_fee_rappen) || admin_fee_rappen < 0)) {
      throw createError({ statusCode: 400, message: 'admin_fee_rappen muss eine gültige Zahl sein' })
    }

    if (metadata !== undefined && metadata !== null) {
      if (typeof metadata !== 'object') {
        throw createError({ statusCode: 400, message: 'metadata muss ein Objekt sein' })
      }
      const metadataSize = JSON.stringify(metadata).length
      if (metadataSize > MAX_METADATA_CHARS) {
        throw createError({ statusCode: 400, message: 'metadata ist zu groß' })
      }
    }

    // Server-side tenant validation to prevent cross-tenant abuse.
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, is_active')
      .eq('id', tenantId)
      .maybeSingle()
    if (tenantError || !tenant || tenant.is_active === false) {
      throw createError({ statusCode: 400, message: 'Ungültiger oder inaktiver Tenant' })
    }

    // Recompute line items from DB product prices — never trust client price_rappen for vouchers/products
    const rawProducts = Array.isArray(metadata?.products) ? metadata.products : []
    if (rawProducts.length === 0) {
      throw createError({ statusCode: 400, message: 'metadata.products ist erforderlich' })
    }

    const productIds = [...new Set(
      rawProducts
        .map((p: any) => p?.id || p?.product_id)
        .filter((id: any) => typeof id === 'string' && id.length > 0)
    )] as string[]
    if (productIds.length === 0) {
      throw createError({ statusCode: 400, message: 'Produkt-IDs fehlen in metadata.products' })
    }

    const { data: dbProducts, error: productsError } = await supabase
      .from('products')
      .select('id, name, price_rappen, is_voucher, allow_custom_amount, min_amount_rappen, max_amount_rappen, is_active, show_in_shop, tenant_id')
      .in('id', productIds)
      .eq('tenant_id', tenantId)

    if (productsError) {
      throw createError({ statusCode: 500, message: 'Produkte konnten nicht geladen werden' })
    }

    const productById = new Map((dbProducts || []).map((p: any) => [p.id, p]))
    const sanitizedProducts: any[] = []
    let serverProductsPrice = 0

    for (const item of rawProducts) {
      const productId = item?.id || item?.product_id
      const qty = Math.max(1, Math.min(100, Number(item?.quantity) || 1))
      const dbProduct = productById.get(productId)
      if (!dbProduct || dbProduct.is_active === false || dbProduct.show_in_shop === false) {
        throw createError({ statusCode: 400, message: `Ungültiges Produkt: ${productId}` })
      }

      let unitPrice = Number(dbProduct.price_rappen || 0)
      // Custom-amount vouchers: allow client amount only within configured bounds
      if (dbProduct.is_voucher && dbProduct.allow_custom_amount) {
        const custom = Number(item?.unit_price_rappen ?? item?.price_rappen ?? unitPrice)
        const minA = Number(dbProduct.min_amount_rappen ?? 0)
        const maxA = Number(dbProduct.max_amount_rappen ?? MAX_TOTAL_AMOUNT_RAPPEN)
        if (!Number.isInteger(custom) || custom < minA || custom > maxA) {
          throw createError({ statusCode: 400, message: 'Ungültiger Gutscheinbetrag' })
        }
        unitPrice = custom
      }

      const lineTotal = unitPrice * qty
      serverProductsPrice += lineTotal
      sanitizedProducts.push({
        id: dbProduct.id,
        product_id: dbProduct.id,
        name: dbProduct.name,
        quantity: qty,
        price_rappen: unitPrice,
        unit_price_rappen: unitPrice,
        is_voucher: !!dbProduct.is_voucher
      })
    }

    // Recompute discounts from DB records referenced in metadata — never trust client discount totals
    let safeDiscount = 0
    const rawDiscounts = Array.isArray(metadata?.discounts) ? metadata.discounts : []
    if (rawDiscounts.length > 0) {
      const discountIds = [...new Set(
        rawDiscounts.map((d: any) => d?.id).filter((id: any) => typeof id === 'string' && id.length > 0)
      )] as string[]

      if (discountIds.length > 0) {
        const [{ data: dbDiscounts }, { data: dbVoucherCodes }] = await Promise.all([
          supabase
            .from('discounts')
            .select('id, discount_type, discount_value, max_discount_rappen, is_active, valid_until, tenant_id')
            .in('id', discountIds)
            .eq('tenant_id', tenantId)
            .eq('is_active', true),
          supabase
            .from('voucher_codes')
            .select('id, discount_type, discount_value, max_discount_rappen, is_active, valid_until, tenant_id, type')
            .in('id', discountIds)
            .eq('tenant_id', tenantId)
            .eq('is_active', true)
        ])

        const byId = new Map<string, any>()
        for (const row of dbDiscounts || []) byId.set(row.id, row)
        for (const row of dbVoucherCodes || []) byId.set(row.id, row)

        const now = new Date()
        for (const id of discountIds) {
          const row = byId.get(id)
          if (!row) continue
          if (row.valid_until && new Date(row.valid_until) < now) continue
          // Credit-type vouchers are wallet top-ups, not checkout discounts
          if (row.type === 'credit') continue

          let amount = 0
          if (row.discount_type === 'percentage') {
            amount = Math.round(serverProductsPrice * (Number(row.discount_value || 0) / 100))
            if (row.max_discount_rappen != null) {
              amount = Math.min(amount, Number(row.max_discount_rappen))
            }
          } else {
            amount = Number(row.discount_value || 0)
          }
          safeDiscount += Math.max(0, amount)
        }
      }
    }
    safeDiscount = Math.max(0, Math.min(safeDiscount, serverProductsPrice))

    const safeAdminFee = Math.max(0, Number(admin_fee_rappen) || 0)
    const serverTotal = serverProductsPrice - safeDiscount + safeAdminFee
    if (serverTotal <= 0 || serverTotal > MAX_TOTAL_AMOUNT_RAPPEN) {
      throw createError({ statusCode: 400, message: 'Berechneter Betrag ungültig' })
    }

    if (Math.abs(serverTotal - Number(total_amount_rappen || 0)) > 0) {
      logger.warn('🚫 shop/create-payment: client total mismatch, using server total', {
        clientTotal: total_amount_rappen,
        serverTotal,
        clientDiscount: discount_amount_rappen,
        serverDiscount: safeDiscount,
        tenantId
      })
    }

    const safeMetadata = {
      ...(typeof metadata === 'object' && metadata ? metadata : {}),
      products: sanitizedProducts,
      price_breakdown: {
        lesson_price_rappen: 0,
        products_price_rappen: serverProductsPrice,
        discount_amount_rappen: safeDiscount,
        subtotal_rappen: serverProductsPrice,
        total_amount_rappen: serverTotal
      }
    }

    // If user_id is provided, enforce tenant ownership and expected checkout role.
    if (userId) {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, tenant_id, role, is_active')
        .eq('id', userId)
        .maybeSingle()

      if (userError || !userData) {
        throw createError({ statusCode: 400, message: 'Ungültiger user_id' })
      }
      if (userData.tenant_id !== tenantId) {
        throw createError({ statusCode: 403, message: 'user_id gehört nicht zum tenant_id' })
      }
      if (!['client', 'staff', 'admin', 'tenant_admin'].includes(userData.role)) {
        throw createError({ statusCode: 400, message: 'user_id hat keine gültige Rolle' })
      }
      if (userData.is_active === false) {
        throw createError({ statusCode: 400, message: 'user_id ist inaktiv' })
      }
    }

    // staff_id is optional; if provided, verify same tenant + allowed role.
    if (staffId) {
      const { data: staffData, error: staffError } = await supabase
        .from('users')
        .select('id, tenant_id, role, is_active')
        .eq('id', staffId)
        .maybeSingle()

      if (staffError || !staffData) {
        throw createError({ statusCode: 400, message: 'Ungültiger staff_id' })
      }
      if (staffData.tenant_id !== tenantId) {
        throw createError({ statusCode: 403, message: 'staff_id gehört nicht zum tenant_id' })
      }
      if (!['staff', 'admin', 'tenant_admin'].includes(staffData.role)) {
        throw createError({ statusCode: 400, message: 'staff_id hat keine gültige Rolle' })
      }
      if (staffData.is_active === false) {
        throw createError({ statusCode: 400, message: 'staff_id ist inaktiv' })
      }
    }

    // Create payment record — only columns that exist in the DB
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        user_id: userId,
        staff_id: staffId,
        tenant_id: tenantId,
        appointment_id: null,
        lesson_price_rappen: 0,
        products_price_rappen: serverProductsPrice,
        discount_amount_rappen: safeDiscount,
        voucher_discount_rappen: 0,
        admin_fee_rappen: safeAdminFee,
        total_amount_rappen: serverTotal,
        payment_method: paymentMethod,
        payment_status: 'pending',
        currency: paymentCurrency,
        description: paymentDescription,
        metadata: safeMetadata
      })
      .select('id, total_amount_rappen, payment_status, tenant_id, payment_method')
      .single()

    if (paymentError || !payment) {
      logger.error('❌ shop/create-payment: DB error:', paymentError)
      throw createError({ statusCode: 500, message: 'Fehler beim Erstellen der Zahlung' })
    }

    logger.debug('✅ shop/create-payment: Payment created:', { id: payment.id, total_amount_rappen: serverTotal })

    return { data: payment }

  } catch (error: any) {
    if (error.statusCode) throw error
    logger.error('❌ shop/create-payment error:', error)
    throw createError({ statusCode: 500, message: 'Interner Fehler' })
  }
})
