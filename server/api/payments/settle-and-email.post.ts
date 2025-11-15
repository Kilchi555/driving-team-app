// server/api/payments/settle-and-email.post.ts
// Mark appointments as settled ("verrechnet") and send confirmation email to customer

import { getSupabaseAdmin } from '~/utils/supabase'
import { sendEmail } from '~/server/utils/email'

interface SettleEmailData {
  customerName: string
  appointmentDate: string
  appointmentTime: string
  staffName: string
  amount: string
  invoiceNumber?: string
  tenantName: string
  pdfUrl?: string
}

function generateSettlementEmail(data: SettleEmailData): string {
  return `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Termin verrechnet</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; border-radius: 10px; padding: 30px; margin-bottom: 20px;">
    <h1 style="color: #2563eb; margin-top: 0;">Termin verrechnet</h1>
    
    <p>Hallo ${data.customerName},</p>
    
    <p>Ihr Termin bei <strong>${data.tenantName}</strong> wurde verrechnet.</p>
    
    <div style="background-color: white; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0; border-radius: 5px;">
      <h3 style="margin-top: 0; color: #2563eb;">Termin-Details</h3>
      <p style="margin: 5px 0;"><strong>Datum:</strong> ${data.appointmentDate}</p>
      <p style="margin: 5px 0;"><strong>Zeit:</strong> ${data.appointmentTime}</p>
      <p style="margin: 5px 0;"><strong>Fahrlehrer:</strong> ${data.staffName}</p>
      <p style="margin: 5px 0;"><strong>Betrag:</strong> CHF ${data.amount}</p>
      ${data.invoiceNumber ? `<p style="margin: 5px 0;"><strong>Rechnungsnummer:</strong> ${data.invoiceNumber}</p>` : ''}
    </div>
    
    <p>Vielen Dank für Ihre Nutzung unserer Dienste!</p>

    ${data.pdfUrl ? `
    <div style="text-align: center; margin: 30px 0;">
      <a href="${data.pdfUrl}" 
         style="background-color: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
        📄 Quittung herunterladen
      </a>
    </div>
    ` : ''}
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
    
    <p style="font-size: 12px; color: #999;">
      Diese E-Mail wurde automatisch generiert. Bei Fragen wenden Sie sich bitte direkt an ${data.tenantName}.
    </p>
  </div>
</body>
</html>
  `.trim()
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { appointmentIds, invoiceNumber } = body

    if (!appointmentIds || !Array.isArray(appointmentIds) || appointmentIds.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'appointmentIds array is required'
      })
    }

    const supabase = getSupabaseAdmin()

    // 1. Fetch appointment details for all appointments
    const { data: appointments, error: fetchError } = await supabase
      .from('appointments')
      .select(`
        id,
        start_time,
        end_time,
        duration_minutes,
        user_id,
        staff_id,
        type,
        users:user_id (
          email,
          first_name,
          last_name
        ),
        staff:staff_id (
          first_name,
          last_name
        )
      `)
      .in('id', appointmentIds)

    if (fetchError) {
      console.error('❌ Error fetching appointments:', fetchError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch appointments'
      })
    }

    // 2. Fetch payment details for calculating amounts
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('appointment_id, total_amount_rappen')
      .in('appointment_id', appointmentIds)

    if (paymentsError) {
      console.error('❌ Error fetching payments:', paymentsError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch payments'
      })
    }

    // 3. Get tenant info
    if (!appointments || appointments.length === 0) {
      throw createError({
        statusCode: 404,
        statusMessage: 'No appointments found'
      })
    }

    // Get first appointment's user to determine tenant
    const firstUser = appointments[0].users
    if (!firstUser?.email) {
      throw createError({
        statusCode: 404,
        statusMessage: 'User not found for appointments'
      })
    }

    // 4. Fetch tenant info to get tenant name
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('id', firstUser?.id || '')
      .single()

    let tenantName = 'Fahrschule'

    if (!usersError && users?.tenant_id) {
      const { data: tenant } = await supabase
        .from('tenants')
        .select('name')
        .eq('id', users.tenant_id)
        .single()

      if (tenant?.name) {
        tenantName = tenant.name
      }
    }

    // 5. Update appointments to "verrechnet" status
    const { error: updateError } = await supabase
      .from('appointments')
      .update({
        status: 'verrechnet',
        updated_at: new Date().toISOString()
      })
      .in('id', appointmentIds)

    if (updateError) {
      console.error('❌ Error updating appointments:', updateError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to update appointment status'
      })
    }

    console.log('✅ Appointments marked as verrechnet:', appointmentIds)

    // 6. Generate and upload PDF to Supabase Storage
    let pdfUrl: string | undefined

    if (invoiceNumber && appointmentIds.length > 0) {
      try {
        console.log('🔄 Generating PDF receipt...')
        
        // Get payment IDs for PDF generation
        const paymentIds = payments.map(p => p.id).filter(Boolean)
        
        if (paymentIds.length > 0) {
          const pdfResult = await $fetch('/api/payments/receipt', {
            method: 'POST',
            body: {
              paymentIds
            }
          })

          if (pdfResult?.pdfUrl) {
            console.log('✅ PDF generated:', pdfResult.pdfUrl)
            pdfUrl = pdfResult.pdfUrl
          }
        }
      } catch (pdfError) {
        console.warn('⚠️ Failed to generate PDF:', pdfError)
        // Continue without PDF - don't fail the entire process
      }
    }

    // 7. Send settlement email to customer
    try {
      const emailsToSend: Array<{ to: string; subject: string; html: string }> = []

      for (const appointment of appointments) {
        const payment = payments.find(p => p.appointment_id === appointment.id)
        const amount = payment ? ((payment.total_amount_rappen || 0) / 100).toFixed(2) : '0.00'

        const appointmentDate = new Date(appointment.start_time).toLocaleDateString('de-CH')
        const appointmentTime = new Date(appointment.start_time).toLocaleTimeString('de-CH', {
          hour: '2-digit',
          minute: '2-digit'
        })

        const staffName = appointment.staff
          ? `${appointment.staff.first_name} ${appointment.staff.last_name}`
          : 'Unbekannt'

        const emailHtml = generateSettlementEmail({
          customerName: appointment.users?.first_name || 'Kunde',
          appointmentDate,
          appointmentTime,
          staffName,
          amount,
          invoiceNumber,
          tenantName,
          pdfUrl
        })

        const emailData: any = {
          to: appointment.users?.email || '',
          subject: `Termin verrechnet - ${tenantName}`,
          html: emailHtml
        }

        emailsToSend.push(emailData)
      }

      // Send all emails
      let successCount = 0
      let failureCount = 0

      for (const emailData of emailsToSend) {
        try {
          await sendEmail(emailData)
          successCount++
        } catch (emailError) {
          console.error('❌ Failed to send email to', emailData.to, ':', emailError)
          failureCount++
        }
      }

      console.log(`✅ Settlement emails sent: ${successCount} success, ${failureCount} failures`)

      return {
        success: true,
        message: `${appointmentIds.length} appointments marked as settled`,
        emailsSent: successCount,
        emailsFailed: failureCount
      }
    } catch (emailError) {
      console.warn('⚠️ Failed to send settlement emails:', emailError)
      // Don't throw - appointments are already marked as settled
      return {
        success: true,
        message: `${appointmentIds.length} appointments marked as settled`,
        emailsSent: 0,
        emailsFailed: appointmentIds.length,
        emailError: 'Failed to send emails'
      }
    }
  } catch (error: any) {
    console.error('❌ Error settling appointments:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to settle appointments'
    })
  }
})

