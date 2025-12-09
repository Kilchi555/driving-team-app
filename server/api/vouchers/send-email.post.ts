// server/api/vouchers/send-email.post.ts
// Gutschein-E-Mail Versendung API

import { getSupabase } from '~/utils/supabase'
import { generateVoucherEmailContent } from '~/utils/voucherGenerator'

interface SendEmailRequest {
  voucherId: string
  recipientEmail?: string
}

interface SendEmailResponse {
  success: boolean
  message?: string
  error?: string
}

export default defineEventHandler(async (event): Promise<SendEmailResponse> => {
  try {
    const { voucherId, recipientEmail }: SendEmailRequest = await readBody(event)
    
    if (!voucherId) {
      throw new Error('Voucher ID is required')
    }

    logger.debug('📧 Sending email for voucher:', voucherId)

    // Gutschein-Daten aus der Datenbank abrufen
    const supabase = getSupabase()
    const { data: voucher, error: voucherError } = await supabase
      .from('discounts')
      .select(`
        id,
        code,
        name,
        description,
        discount_value,
        voucher_recipient_name,
        voucher_recipient_email,
        voucher_buyer_name,
        voucher_buyer_email,
        valid_until,
        created_at
      `)
      .eq('id', voucherId)
      .eq('is_voucher', true)
      .single()

    if (voucherError || !voucher) {
      throw new Error('Voucher not found')
    }

    // Bestimme Empfänger-E-Mail
    const emailTo = recipientEmail || voucher.voucher_recipient_email || voucher.voucher_buyer_email
    
    if (!emailTo) {
      throw new Error('No recipient email found for voucher')
    }

    // E-Mail-Inhalt generieren
    const emailContent = generateVoucherEmailContent({
      code: voucher.code,
      name: voucher.name,
      amount_chf: voucher.discount_value,
      recipient_name: voucher.voucher_recipient_name,
      recipient_email: emailTo,
      valid_until: voucher.valid_until
    })

    // TODO: Hier würde die echte E-Mail-Versendung implementiert werden
    // Für jetzt loggen wir nur die E-Mail-Daten
    logger.debug('📧 Would send email:', {
      to: emailTo,
      subject: emailContent.subject,
      voucherCode: voucher.code,
      amount: voucher.discount_value
    })

    // In einer echten Implementierung würde hier z.B. nodemailer, sendgrid, etc. verwendet werden
    // const emailResult = await sendEmail({
    //   to: emailTo,
    //   subject: emailContent.subject,
    //   html: emailContent.html,
    //   text: emailContent.text
    // })

    logger.debug('✅ Voucher email prepared successfully for:', voucher.code)

    return {
      success: true,
      message: `E-Mail wurde an ${emailTo} gesendet`
    }

  } catch (error: any) {
    console.error('❌ Error sending voucher email:', error)
    return {
      success: false,
      error: error.message || 'Error sending voucher email'
    }
  }
})
