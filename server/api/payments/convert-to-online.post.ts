// server/api/payments/convert-to-online.post.ts
// Convert a payment from pending (cash/invoice) back to online payment

import { getSupabaseAdmin } from '~/utils/supabase'

interface ConvertToOnlineRequest {
  paymentId: string
  customerEmail?: string
}

export default defineEventHandler(async (event) => {
  try {
    console.log('🔄 convert-to-online.post called')
    const body = await readBody<ConvertToOnlineRequest>(event)
    const { paymentId, customerEmail } = body

    if (!paymentId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'paymentId is required'
      })
    }

    console.log('📋 Processing payment conversion:', { paymentId })
    const supabase = getSupabaseAdmin()

    // 1. Fetch the existing payment
    const { data: payment, error: fetchError } = await supabase
      .from('payments')
      .select(`
        *,
        appointments (id, user_id, start_time, title)
      `)
      .eq('id', paymentId)
      .single()

    if (fetchError || !payment) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Payment not found'
      })
    }

    console.log('📊 Fetched payment:', {
      id: payment.id,
      status: payment.payment_status,
      method: payment.payment_method,
      wallee_transaction_id: payment.wallee_transaction_id
    })

    // 2. Check if payment is in pending status
    if (payment.payment_status !== 'pending') {
      throw createError({
        statusCode: 400,
        statusMessage: `Cannot convert payment with status '${payment.payment_status}' to online. Only 'pending' payments can be converted.`
      })
    }

    // 3. If there's an existing Wallee transaction, void it
    if (payment.wallee_transaction_id) {
      console.log(`🔄 Voiding existing Wallee transaction: ${payment.wallee_transaction_id}`)
      try {
        // Void the transaction
        const voidResult = await fetch(
          `https://app-default.wallee.com/api/transaction/void?spaceId=${process.env.WALLEE_SPACE_ID}&id=${payment.wallee_transaction_id}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json;charset=utf-8',
              'Authorization': `Bearer ${process.env.WALLEE_API_KEY}`
            }
          }
        )

        if (voidResult.ok) {
          console.log(`✅ Wallee transaction ${payment.wallee_transaction_id} voided`)
        } else {
          console.warn(`⚠️ Could not void Wallee transaction: ${voidResult.statusText}`)
        }
      } catch (err) {
        console.error(`❌ Error voiding Wallee transaction:`, err)
      }
    }

    // 4. Create new Wallee transaction via internal API
    const appointment = payment.appointments
    
    try {
      const walleeTransactionResult = await $fetch('/api/wallee/create-transaction', {
        method: 'POST',
        body: {
          orderId: payment.id,
          amount: payment.total_amount_rappen, // Already in Rappen
          currency: payment.currency || 'CHF',
          customerEmail: email,
          customerName: customer?.first_name || 'Customer',
          description: payment.description || `${payment.appointments?.title || 'Fahrstunde'}`,
          userId: payment.user_id,
          tenantId: payment.tenant_id
        }
      })

      if (!walleeTransactionResult || !walleeTransactionResult.transactionId || !walleeTransactionResult.paymentPageUrl) {
        throw new Error('Failed to get Wallee transaction response')
      }

      console.log('✅ New Wallee transaction created:', {
        transactionId: walleeTransactionResult.transactionId,
        paymentPageUrl: walleeTransactionResult.paymentPageUrl
      })
    } catch (walleeErr: any) {
      console.error('❌ Error creating Wallee transaction:', walleeErr)
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to create Wallee transaction: ${walleeErr.message}`
      })
    }
    
    const newWalleeResult = walleeTransactionResult

    // 5. Update payment with new transaction info
    const { error: updateError } = await supabase
      .from('payments')
      .update({
        payment_method: 'wallee',
        payment_status: 'pending',
        wallee_transaction_id: newWalleeResult.transactionId,
        updated_at: new Date().toISOString()
      })
      .eq('id', paymentId)

    if (updateError) {
      console.error('❌ Error updating payment:', updateError)
      throw updateError
    }

    console.log('✅ Payment updated to pending_authorization with new transaction')

    // 6. Get tenant info for email
    const { data: tenant } = await supabase
      .from('tenants')
      .select('name, primary_color')
      .eq('id', payment.tenant_id)
      .single()

    // 7. Get customer info for email
    const { data: customer } = await supabase
      .from('users')
      .select('first_name, email')
      .eq('id', payment.user_id)
      .single()

    const email = customerEmail || customer?.email
    const customerName = customer?.first_name || 'Kunde'

    // 8. Send email with payment link
    if (email && newWalleeResult.paymentPageUrl) {
      const emailHtml = `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Zahlung erforderlich</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; border-radius: 10px; padding: 30px; margin-bottom: 20px;">
    <h1 style="color: #2563eb; margin-top: 0;">Zahlung erforderlich</h1>
    
    <p>Hallo ${customerName},</p>
    
    <p>Ihre Zahlung wurde auf Online-Zahlung umgestellt. Bitte begleichen Sie die ausstehende Rechnung:</p>
    
    <div style="background-color: white; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0; border-radius: 5px;">
      <h3 style="margin-top: 0; color: #2563eb;">Zahlungsdetails</h3>
      <p style="margin: 5px 0;"><strong>Betrag:</strong> CHF ${(payment.total_amount_rappen / 100).toFixed(2)}</p>
      <p style="margin: 5px 0;"><strong>Termin:</strong> ${appointment?.title || 'Fahrstunde'}</p>
      ${appointment?.start_time ? `<p style="margin: 5px 0;"><strong>Datum:</strong> ${new Date(appointment.start_time).toLocaleDateString('de-CH')}</p>` : ''}
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${newWalleeResult.paymentPageUrl}" 
         style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
        💳 Jetzt bezahlen
      </a>
    </div>
    
    <p style="color: #666; font-size: 0.9em;">
      Falls Sie Fragen haben, kontaktieren Sie bitte ${tenant?.name || 'unser Büro'}.
    </p>
  </div>
</body>
</html>
      `.trim()

      try {
        await $fetch('/api/email/send-wallee-payment-link', {
          method: 'POST',
          body: {
            email,
            subject: `Zahlung erforderlich - ${tenant?.name || 'Fahrstunde'}`,
            html: emailHtml,
            paymentLink: newWalleeResult.paymentPageUrl
          }
        })
        console.log('✅ Payment link email sent to:', email)
      } catch (emailErr) {
        console.error('❌ Error sending email:', emailErr)
        // Don't fail the whole request if email fails
      }
    }

    return {
      success: true,
      payment: {
        id: payment.id,
        payment_status: 'pending',
        payment_method: 'wallee',
        wallee_transaction_id: newWalleeResult.transactionId,
        paymentLink: newWalleeResult.paymentPageUrl
      },
      message: 'Payment converted to online payment successfully'
    }
  } catch (error: any) {
    console.error('❌ Error converting payment to online:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || error.message || 'Failed to convert payment'
    })
  }
})

