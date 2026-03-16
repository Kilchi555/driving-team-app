// server/api/vouchers/send-email.post.ts
// Gutschein per E-Mail versenden — nur für eingeloggte Staff/Admin oder Webhook (internal secret)

import { defineEventHandler, readBody, createError, getHeader } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { generateVoucherEmailContent } from '~/utils/voucherGenerator'
import { sendEmail } from '~/server/utils/email'
import { logger } from '~/utils/logger'

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
  // ── Auth: eingeloggte User (Staff/Admin) ODER interner Webhook-Aufruf ──
  const serverSecret = process.env.INTERNAL_API_SECRET
  const internalHeader = getHeader(event, 'x-internal-secret')
  const isInternal = serverSecret && internalHeader === serverSecret

  if (!isInternal) {
    const authUser = await getAuthenticatedUser(event)
    if (!authUser) throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
    const userId = authUser.db_user_id || authUser.id
    const supabaseCheck = getSupabaseAdmin()
    const { data: profile } = await supabaseCheck.from('users').select('role').eq('id', userId).single()
    if (!profile || !['admin', 'tenant_admin', 'staff'].includes(profile.role)) {
      throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
    }
  }

  try {
    const { voucherId, recipientEmail }: SendEmailRequest = await readBody(event)

    if (!voucherId) {
      throw createError({ statusCode: 400, statusMessage: 'Voucher ID is required' })
    }

    logger.debug('📧 Sending email for voucher:', voucherId)

    const supabase = getSupabaseAdmin()

    // Versuche zuerst in `vouchers`-Tabelle, dann in `discounts` (legacy)
    let voucher: any = null
    const { data: v1 } = await supabase
      .from('vouchers')
      .select('id, code, name, description, amount_rappen, recipient_name, recipient_email, buyer_email, valid_until')
      .eq('id', voucherId)
      .single()

    if (v1) {
      voucher = {
        ...v1,
        discount_value: v1.amount_rappen / 100,
        voucher_recipient_name: v1.recipient_name,
        voucher_recipient_email: v1.recipient_email,
        voucher_buyer_email: v1.buyer_email,
      }
    } else {
      const { data: v2 } = await supabase
        .from('discounts')
        .select('id, code, name, description, discount_value, voucher_recipient_name, voucher_recipient_email, voucher_buyer_email, valid_until')
        .eq('id', voucherId)
        .eq('is_voucher', true)
        .single()
      voucher = v2
    }

    if (!voucher) {
      throw createError({ statusCode: 404, statusMessage: 'Voucher not found' })
    }

    const emailTo = recipientEmail || voucher.voucher_recipient_email || voucher.voucher_buyer_email
    if (!emailTo) {
      throw createError({ statusCode: 400, statusMessage: 'Keine Empfänger-E-Mail gefunden' })
    }

    const amountChf = typeof voucher.discount_value === 'number' ? voucher.discount_value : (voucher.amount_rappen || 0) / 100

    const emailContent = generateVoucherEmailContent({
      code: voucher.code,
      name: voucher.name || 'Gutschein',
      amount_chf: amountChf,
      recipient_name: voucher.voucher_recipient_name || undefined,
      recipient_email: emailTo,
      valid_until: voucher.valid_until || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
    })

    await sendEmail({
      to: emailTo,
      subject: emailContent.subject,
      html: emailContent.html
    })

    logger.debug('✅ Voucher email sent to:', emailTo, 'code:', voucher.code)

    return {
      success: true,
      message: `Gutschein wurde an ${emailTo} gesendet`
    }

  } catch (error: any) {
    if (error.statusCode) throw error
    console.error('❌ Error sending voucher email:', error)
    return {
      success: false,
      error: error.message || 'Error sending voucher email'
    }
  }
})
