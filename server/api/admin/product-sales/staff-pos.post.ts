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

    const baseUrl = (process.env.NUXT_PUBLIC_APP_URL || 'https://app.simy.ch').replace(/\/$/, '')

    const transactionCreate: Wallee.model.TransactionCreate = {
      lineItems,
      currency: 'CHF',
      autoConfirmationEnabled: true,
      chargeRetryEnabled: false,
      customersEmailAddress: customer_email!,
      customerId: `pos-${profile.tenant_id}-${customer_email!.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`.substring(0, 100),
      merchantReference: `pos-${sale.id} | ${toAscii(resolvedCustomerName)}`.substring(0, 100),
      successUrl: `${baseUrl}/payment/success?payment_id=${sale.id}`,
      failedUrl: `${baseUrl}/payment/failed?payment_id=${sale.id}`
    }

    let createdTransaction: any
    try {
      createdTransaction = await transactionService.create(spaceId, transactionCreate)
    } catch (walleeErr: any) {
      logger.error('❌ Wallee API error (staff POS):', { message: walleeErr?.message, body: walleeErr?.body })
      return { success: true, sale_id: sale.id, payment_url: null, warning: `Wallee-Fehler: ${walleeErr?.body?.message || walleeErr?.message || 'Unbekannt'}` }
    }

    const transactionId = createdTransaction?.body?.id ?? createdTransaction?.id
    if (transactionId) {
      try {
        const urlResponse = await paymentPageService.paymentPageUrl(spaceId, transactionId)
        paymentUrl = (urlResponse as any)?.body || (urlResponse as any) ||
          `https://app-wallee.com/payment/transaction/pay?spaceId=${spaceId}&transactionId=${transactionId}`
      } catch {
        paymentUrl = `https://app-wallee.com/payment/transaction/pay?spaceId=${spaceId}&transactionId=${transactionId}`
      }
    }
  } catch (walleeErr: any) {
    logger.error('❌ Wallee transaction failed for staff POS:', { message: walleeErr?.message, body: walleeErr?.body })
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
        .select('name, from_email, resend_domain_verified, primary_color, logo_url')
        .eq('id', profile.tenant_id)
        .single()

      const tenantName = tenant?.name || 'Ihre Fahrschule'
      const brandColor = tenant?.primary_color || '#16a34a'
      const logoUrl = tenant?.logo_url
      const productList = items.map(i =>
        `<tr>
          <td style="padding: 8px 0; color: #374151; font-size: 15px;">${i.quantity}× ${i.product_name}</td>
          <td style="padding: 8px 0; color: #374151; font-size: 15px; text-align: right;">CHF ${(i.total_price_rappen / 100).toFixed(2)}</td>
        </tr>`
      ).join('')
      const totalCHF = (total_amount_rappen / 100).toFixed(2)

      const html = `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0; padding:0; background:#f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6; padding: 40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%; background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- Header with brand color -->
        <tr>
          <td style="background:${brandColor}; padding: 32px 40px; text-align:center;">
            ${logoUrl ? `<img src="${logoUrl}" alt="${tenantName}" style="max-height:48px; max-width:200px; object-fit:contain; margin-bottom:16px; display:block; margin-left:auto; margin-right:auto;">` : ''}
            <h1 style="margin:0; color:#ffffff; font-size:22px; font-weight:700; letter-spacing:-0.3px;">${tenantName}</h1>
            <p style="margin:8px 0 0; color:rgba(255,255,255,0.85); font-size:14px;">Zahlungseinladung</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding: 36px 40px;">
            <p style="margin:0 0 8px; font-size:16px; color:#111827; font-weight:600;">Guten Tag${customer_name ? `, ${customer_name}` : ''},</p>
            <p style="margin:0 0 28px; font-size:15px; color:#6b7280; line-height:1.6;">${tenantName} hat für Sie eine Zahlung vorbereitet. Bitte klicken Sie auf den Button unten, um sicher zu bezahlen.</p>

            <!-- Product table -->
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb; border-radius:10px; overflow:hidden; margin-bottom:24px;">
              <thead>
                <tr style="background:#f9fafb;">
                  <th style="padding:12px 16px; text-align:left; font-size:12px; font-weight:600; color:#9ca3af; text-transform:uppercase; letter-spacing:0.05em;">Produkt</th>
                  <th style="padding:12px 16px; text-align:right; font-size:12px; font-weight:600; color:#9ca3af; text-transform:uppercase; letter-spacing:0.05em;">Betrag</th>
                </tr>
              </thead>
              <tbody style="border-top:1px solid #e5e7eb;">
                ${productList}
              </tbody>
              <tfoot>
                <tr style="background:#f9fafb; border-top:2px solid #e5e7eb;">
                  <td style="padding:14px 16px; font-size:16px; font-weight:700; color:#111827;">Total</td>
                  <td style="padding:14px 16px; font-size:18px; font-weight:800; color:${brandColor}; text-align:right;">CHF ${totalCHF}</td>
                </tr>
              </tfoot>
            </table>

            <!-- CTA Button -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center" style="padding:8px 0 28px;">
                  <a href="${paymentUrl}"
                     style="display:inline-block; background:${brandColor}; color:#ffffff; padding:16px 40px; border-radius:10px; text-decoration:none; font-weight:700; font-size:16px; letter-spacing:-0.2px;">
                    💳 Jetzt sicher bezahlen
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin:0; font-size:13px; color:#9ca3af; text-align:center; line-height:1.6;">
              Sichere Zahlung via Wallee · Dieser Link ist 24 Stunden gültig<br>
              Wenn Sie Fragen haben, wenden Sie sich bitte direkt an ${tenantName}.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb; padding:20px 40px; border-top:1px solid #e5e7eb; text-align:center;">
            <p style="margin:0; font-size:12px; color:#9ca3af;">${tenantName} · Powered by Simy</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`

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
