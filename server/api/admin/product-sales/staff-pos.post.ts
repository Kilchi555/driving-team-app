// server/api/admin/product-sales/staff-pos.post.ts
// Staff Point-of-Sale: create a product sale with cash, invoice, or Wallee online payment

import { defineEventHandler, readBody, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { sendTenantEmail } from '~/server/utils/email'
import { getWalleeConfigForTenant, getWalleeSDKConfig } from '~/server/utils/wallee-config'
import { Wallee } from 'wallee'
import { logger } from '~/utils/logger'

interface POSItem {
  product_id: string
  quantity: number
  unit_price_rappen: number
  total_price_rappen: number
  product_name: string
}

interface POSBody {
  user_id?: string | null
  customer_name?: string
  customer_email?: string
  items: POSItem[]
  total_amount_rappen: number
  payment_method: 'cash' | 'invoice' | 'online'
  notes?: string
}

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const supabase = getSupabaseAdmin()
  const body = await readBody<POSBody>(event)

  const { user_id, customer_name, customer_email, items, total_amount_rappen, payment_method, notes } = body

  if (!items || items.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Keine Produkte ausgewählt' })
  }

  if (payment_method === 'online' && !customer_email) {
    throw createError({ statusCode: 400, statusMessage: 'E-Mail-Adresse erforderlich für Online-Zahlung' })
  }

  const initialStatus = payment_method === 'cash' ? 'completed' : 'pending'

  // 1. Create product_sale record
  const notesText = [
    customer_name ? `Kunde: ${customer_name}` : null,
    notes || null
  ].filter(Boolean).join(' | ') || null

  const { data: sale, error: saleError } = await supabase
    .from('product_sales')
    .insert({
      user_id: user_id || null,
      staff_id: profile.id,
      tenant_id: profile.tenant_id,
      total_amount_rappen,
      status: initialStatus,
      payment_method,
      notes: notesText
    })
    .select()
    .single()

  if (saleError || !sale) {
    logger.error('❌ Error creating product_sale:', saleError)
    throw createError({ statusCode: 500, statusMessage: 'Verkauf konnte nicht erstellt werden' })
  }

  // 2. Insert product_sale_items
  const saleItems = items.map(item => ({
    product_sale_id: sale.id,
    product_id: item.product_id,
    quantity: item.quantity,
    unit_price_rappen: item.unit_price_rappen,
    total_price_rappen: item.total_price_rappen
  }))

  const { error: itemsError } = await supabase
    .from('product_sale_items')
    .insert(saleItems)

  if (itemsError) {
    logger.error('❌ Error inserting product_sale_items:', itemsError)
    // Clean up the sale record
    await supabase.from('product_sales').delete().eq('id', sale.id)
    throw createError({ statusCode: 500, statusMessage: 'Produkte konnten nicht gespeichert werden' })
  }

  // 3. For cash/invoice: we're done
  if (payment_method !== 'online') {
    logger.info(`✅ Staff POS sale created (${payment_method}): sale=${sale.id}, total=${total_amount_rappen} Rappen`)
    return { success: true, sale_id: sale.id, status: initialStatus }
  }

  // 4. Online: Create Wallee transaction
  let paymentUrl: string | null = null

  try {
    const walleeConfig = await getWalleeConfigForTenant(profile.tenant_id)
    const spaceId = walleeConfig.spaceId
    const sdkConfig = getWalleeSDKConfig(spaceId, walleeConfig.userId, walleeConfig.apiSecret)
    const transactionService = new Wallee.api.TransactionService(sdkConfig)
    const paymentPageService = new Wallee.api.TransactionPaymentPageService(sdkConfig)

    const amountCHF = total_amount_rappen / 100
    const resolvedCustomerName = customer_name || 'Kunde'
    const toAscii = (s: string) => s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x20-\x7E]/g, '').trim()

    const lineItems = items.map((item, idx) => ({
      name: toAscii(item.product_name).substring(0, 100),
      quantity: item.quantity,
      amountIncludingTax: item.total_price_rappen / 100,
      type: Wallee.model.LineItemType.PRODUCT,
      uniqueId: `item-${idx + 1}`,
      taxRate: 0
    }))

    const transactionCreate: Wallee.model.TransactionCreate = {
      lineItems,
      currency: 'CHF',
      autoConfirmationEnabled: true,
      chargeRetryEnabled: false,
      customersEmailAddress: customer_email!,
      customerId: `pos-${profile.tenant_id}-${customer_email!.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`.substring(0, 100),
      merchantReference: `pos-${sale.id} | ${toAscii(resolvedCustomerName)}`.substring(0, 100),
      successUrl: `${process.env.NUXT_PUBLIC_APP_URL ? `https://${process.env.NUXT_PUBLIC_APP_URL}` : 'https://app.simy.ch'}/payment/success?transaction_id=${sale.id}`,
      failedUrl: `${process.env.NUXT_PUBLIC_APP_URL ? `https://${process.env.NUXT_PUBLIC_APP_URL}` : 'https://app.simy.ch'}/payment/failed?transaction_id=${sale.id}`
    }

    const createdTransaction = await transactionService.create(spaceId, transactionCreate)
    const transactionId = createdTransaction?.body?.id ?? (createdTransaction as any)?.id

    if (transactionId) {
      const urlResponse = await paymentPageService.paymentPageUrl(spaceId, transactionId)
      paymentUrl = (urlResponse as any)?.body || urlResponse as any
    }
  } catch (walleeErr: any) {
    logger.error('❌ Wallee transaction failed for staff POS:', walleeErr?.message)
    // Don't throw — sale is created, staff can handle payment another way
    return {
      success: true,
      sale_id: sale.id,
      payment_url: null,
      warning: 'Wallee-Transaktion konnte nicht erstellt werden. Zahlung manuell abwickeln.'
    }
  }

  // 5. Send payment email
  if (paymentUrl && customer_email) {
    try {
      // Load tenant branding for the email
      const { data: tenant } = await supabase
        .from('tenants')
        .select('name, from_email, resend_domain_verified')
        .eq('id', profile.tenant_id)
        .single()

      const tenantName = tenant?.name || 'Ihre Fahrschule'
      const productList = items.map(i => `${i.quantity}× ${i.product_name} – CHF ${(i.total_price_rappen / 100).toFixed(2)}`).join('<br>')
      const totalCHF = (total_amount_rappen / 100).toFixed(2)

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1a1a1a;">Ihre Zahlungseinladung</h2>
          <p>Guten Tag${customer_name ? ` ${customer_name}` : ''},</p>
          <p>${tenantName} hat eine Zahlung für folgende Produkte für Sie vorbereitet:</p>
          <div style="background: #f9f9f9; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <p style="margin: 0;">${productList}</p>
            <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 12px 0;">
            <p style="font-weight: bold; font-size: 18px; margin: 0;">Total: CHF ${totalCHF}</p>
          </div>
          <a href="${paymentUrl}"
             style="display: inline-block; background: #16a34a; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; margin: 10px 0;">
            💳 Jetzt bezahlen
          </a>
          <p style="color: #666; font-size: 13px; margin-top: 20px;">
            Sichere Zahlung über Wallee. Dieser Link ist 24 Stunden gültig.
          </p>
        </div>
      `

      await sendTenantEmail(profile.tenant_id, {
        to: customer_email,
        subject: `Zahlungseinladung von ${tenantName} – CHF ${totalCHF}`,
        html,
        fromName: tenantName,
        fromEmail: tenant?.from_email,
        domainVerified: tenant?.resend_domain_verified
      })

      logger.info(`✅ Staff POS payment email sent: sale=${sale.id}, email=${customer_email}`)
    } catch (emailErr: any) {
      logger.warn('⚠️ Payment email failed (sale still created):', emailErr?.message)
      return {
        success: true,
        sale_id: sale.id,
        payment_url: paymentUrl,
        warning: 'Verkauf erstellt, aber E-Mail konnte nicht gesendet werden. Bitte Link manuell teilen.'
      }
    }
  }

  logger.info(`✅ Staff POS online sale complete: sale=${sale.id}, email sent to ${customer_email}`)
  return { success: true, sale_id: sale.id, payment_url: paymentUrl }
})
