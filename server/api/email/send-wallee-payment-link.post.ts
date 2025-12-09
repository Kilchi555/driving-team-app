// server/api/email/send-wallee-payment-link.post.ts
// Send email with Wallee payment link

import { getSupabaseAdmin } from '~/utils/supabase'
import { logger } from '~/utils/logger'

interface SendEmailRequest {
  email: string
  subject: string
  html: string
  paymentLink: string
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody<SendEmailRequest>(event)
    const { email, subject, html, paymentLink } = body

    if (!email || !subject || !html) {
      throw createError({
        statusCode: 400,
        statusMessage: 'email, subject, and html are required'
      })
    }

    logger.debug('📧 Sending Wallee payment link email to:', email)

    const supabase = getSupabaseAdmin()

    // Use Supabase Edge Function to send email
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        email,
        subject,
        html,
        from: 'noreply@simy.ch'
      }
    })

    if (error) {
      console.error('❌ Error sending email:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to send email'
      })
    }

    logger.debug('✅ Email sent successfully:', data)

    return {
      success: true,
      message: 'Email sent successfully'
    }
  } catch (error: any) {
    console.error('❌ Error in send-wallee-payment-link:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || error.message || 'Failed to send email'
    })
  }
})

