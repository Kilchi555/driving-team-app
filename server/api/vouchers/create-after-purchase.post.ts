// server/api/vouchers/create-after-purchase.post.ts
// Automatische Gutschein-Erstellung nach erfolgreichem Kauf

import { getSupabase } from '~/utils/supabase'
import { generateVoucherCode } from '~/utils/voucherGenerator'

interface CreateVouchersRequest {
  paymentId: string
  products?: Array<{
    id: string
    name: string
    description?: string
    price_rappen: number
    is_voucher?: boolean
  }>
  customerName?: string
  customerEmail?: string
}

interface CreateVouchersResponse {
  success: boolean
  vouchersCreated?: number
  vouchers?: Array<{
    id: string
    code: string
    name: string
    amount_chf: number
  }>
  message?: string
  error?: string
}

export default defineEventHandler(async (event): Promise<CreateVouchersResponse> => {
  try {
    const { paymentId, products, customerName, customerEmail }: CreateVouchersRequest = await readBody(event)
    
    if (!paymentId) {
      throw new Error('Payment ID is required')
    }

    logger.debug('🎁 Creating vouchers after purchase for payment:', paymentId)

    const supabase = getSupabase()
    
    // Hole Payment Details
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .single()

    if (paymentError || !payment) {
      throw new Error('Payment not found')
    }

    // Verwende übergebene Produkte oder Payment-Metadata
    const productsToProcess = products || payment.metadata?.products

    if (!productsToProcess || productsToProcess.length === 0) {
      return {
        success: true,
        vouchersCreated: 0,
        message: 'No products found - no vouchers to create'
      }
    }

    const createdVouchers = []

    // Prüfe welche Produkte Gutscheine sind und erstelle sie
    for (const product of productsToProcess) {
      try {
        // Prüfe ob es ein Gutschein-Produkt ist
        let isVoucher = product.is_voucher || false
        
        // Falls nicht explizit gesetzt, prüfe in der Datenbank
        if (!isVoucher) {
          const { data: productData } = await supabase
            .from('products')
            .select('is_voucher')
            .eq('id', product.id)
            .single()
          
          if (productData?.is_voucher) {
            isVoucher = true
          }
        }

        logger.debug('🔍 Product voucher check:', { productId: product.id, productName: product.name, isVoucher })

        if (isVoucher) {
          logger.debug('🎁 Creating voucher for product:', product.name)
          
          // Generiere Gutschein-Code
          const voucherCode = generateVoucherCode()
          
          // Gutschein-Daten
          const voucherData = {
            name: product.name,
            code: voucherCode,
            discount_type: 'fixed',
            discount_value: product.price_rappen / 100, // Rappen zu CHF
            max_discount_rappen: product.price_rappen,
            remaining_amount_rappen: product.price_rappen,
            min_amount_rappen: 0,
            usage_limit: 1,
            usage_count: 0,
            is_active: true,
            is_voucher: true,
            voucher_recipient_name: customerName || payment.metadata?.customer_name,
            voucher_recipient_email: customerEmail || payment.metadata?.customer_email,
            voucher_buyer_name: customerName || payment.metadata?.customer_name,
            voucher_buyer_email: customerEmail || payment.metadata?.customer_email,
            payment_id: payment.id,
            applies_to: 'appointments',
            valid_until: new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toISOString(), // 2 Jahre gültig
            tenant_id: payment.metadata?.tenant_id
          }

          // Erstelle Gutschein in der Datenbank
          const { data: newVoucher, error: createError } = await supabase
            .from('discounts')
            .insert(voucherData)
            .select()
            .single()

          if (createError) throw createError

          createdVouchers.push({
            id: newVoucher.id,
            code: newVoucher.code,
            name: newVoucher.name,
            amount_chf: newVoucher.discount_value
          })

          logger.debug('✅ Voucher created:', voucherCode)

          // TODO: Optional - automatisch E-Mail senden
          // Hier könnte die automatische E-Mail-Versendung implementiert werden
          // await sendVoucherEmail(newVoucher.id, payment.metadata?.customer_email)
        }
      } catch (err: any) {
        console.error('❌ Error creating voucher for product:', product.id, err)
        // Fehler bei einem Produkt stoppt nicht den gesamten Prozess
      }
    }

    logger.debug('✅ All vouchers created for payment:', paymentId, 'Count:', createdVouchers.length)

    return {
      success: true,
      vouchersCreated: createdVouchers.length,
      vouchers: createdVouchers,
      message: `${createdVouchers.length} Gutschein(e) erfolgreich erstellt`
    }

  } catch (error: any) {
    console.error('❌ Error creating vouchers after purchase:', error)
    return {
      success: false,
      error: error.message || 'Error creating vouchers after purchase'
    }
  }
})
