// PDF Receipt Generation API

import { defineEventHandler, readBody } from 'h3'
import { getSupabase } from '~/utils/supabase'

interface ReceiptRequest {
  paymentId: string
}

interface ReceiptResponse {
  success: boolean
  pdfUrl?: string
  error?: string
}

export default defineEventHandler(async (event): Promise<ReceiptResponse> => {
  try {
    const { paymentId }: ReceiptRequest = await readBody(event)
    
    if (!paymentId) {
      throw new Error('Payment ID is required')
    }

    console.log('📄 Generating receipt for payment:', paymentId)

    // Get payment details from database
    const supabase = getSupabase()
    const { data: payment, error } = await supabase
      .from('payments')
      .select(`
        *,
        appointments (
          title,
          start_time,
          duration_minutes,
          type
        ),
        users!payments_user_id_fkey (
          first_name,
          last_name,
          email,
          street,
          street_nr,
          zip,
          city
        )
      `)
      .eq('id', paymentId)
      .single()

    if (error || !payment) {
      throw new Error('Payment not found')
    }

    // Generate PDF receipt
    const receiptData = {
      payment: {
        id: payment.id,
        transactionId: payment.wallee_transaction_id,
        amount: payment.total_amount_rappen / 100,
        baseAmount: payment.lesson_price_rappen / 100,
        adminFee: payment.admin_fee_rappen / 100,
        method: payment.payment_method,
        status: payment.payment_status,
        paidAt: payment.paid_at,
        createdAt: payment.created_at,
        description: payment.description,
        currency: payment.currency
      },
      appointment: payment.appointments,
      customer: payment.users,
      company: {
        name: 'Driving Team Zürich GmbH',
        address: 'Baslerstrasse 145',
        zip: '8048',
        city: 'Zürich',
        email: 'info@drivingteam.ch',
        phone: '044 431 00 33'
      }
    }

    // Here you would integrate with a PDF generation service
    // For now, we'll return a placeholder
    const pdfUrl = await generatePDF(receiptData)

    console.log('✅ Receipt generated:', pdfUrl)

    return {
      success: true,
      pdfUrl
    }

  } catch (error: any) {
    console.error('❌ Receipt generation failed:', error)
    return {
      success: false,
      error: error.message || 'Receipt generation failed'
    }
  }
})

async function generatePDF(data: any): Promise<string> {
  // Placeholder for PDF generation
  // You can integrate with services like:
  // - Puppeteer
  // - jsPDF
  // - PDFKit
  // - External PDF service
  
  // For now, return a mock URL
  return '/api/receipts/placeholder.pdf'
}

// .env Variables für Wallee
/*
# Wallee Configuration
WALLEE_BASE_URL=https://app-wallee.com
WALLEE_SPACE_ID=your_space_id_here
WALLEE_USER_ID=your_user_id_here
WALLEE_API_SECRET=your_api_secret_here
WALLEE_TWINT_METHOD_ID=your_twint_method_configuration_id

# Webhook URLs (für Wallee Dashboard)
# Success URL: https://yourdomain.com/payment/success
# Failed URL: https://yourdomain.com/payment/failed
# Webhook URL: https://yourdomain.com/api/wallee/webhook
*/