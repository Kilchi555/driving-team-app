// server/api/sms/send.post.ts
// Authenticated staff/admin SMS send — tenant is always taken from the session.
import { logger } from '~/utils/logger'
import { sendTenantSMS, normalizePhoneNumber } from '~/server/utils/sms'
import { requireAdminProfile } from '~/server/utils/auth'
import { checkRateLimit } from '~/server/utils/rate-limiter'

const ALLOWED_ROLES = ['admin', 'staff', 'tenant_admin', 'superadmin', 'super_admin']
const MAX_MESSAGE_LENGTH = 1000
const ALLOWED_PURPOSES = new Set([
  'appointment_notification',
  'appointment_confirmation',
  'appointment_reminder',
  'appointment_cancellation',
  'manual',
  'staff_message',
])

export default defineEventHandler(async (event) => {
  try {
    const profile = await requireAdminProfile(event, ALLOWED_ROLES)
    const tenantId = profile.tenant_id

    const rate = await checkRateLimit(
      `sms_send:${profile.id}`,
      'sms_send',
      30,
      60 * 60 * 1000,
    )
    if (!rate.allowed) {
      throw createError({
        statusCode: 429,
        statusMessage: 'Too many SMS requests. Please try again later.',
      })
    }

    const body = await readBody(event)
    const phone = (body?.phone ?? '').toString().trim()
    const message = (body?.message ?? '').toString().trim()
    const senderName = body?.senderName ? String(body.senderName).trim().slice(0, 80) : undefined
    const purposeRaw = body?.purpose ? String(body.purpose).trim() : 'manual'
    const purpose = ALLOWED_PURPOSES.has(purposeRaw) ? purposeRaw : 'manual'

    // Never trust client-supplied tenantId — ignore body.tenantId entirely.
    if (body?.tenantId && body.tenantId !== tenantId) {
      logger.warn('🚫 SMS send ignored mismatched tenantId from client', {
        claimed: body.tenantId,
        actual: tenantId,
        userId: profile.id,
      })
    }

    if (!phone || !message) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields: phone, message',
      })
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      throw createError({
        statusCode: 400,
        statusMessage: `Message too long (max ${MAX_MESSAGE_LENGTH} characters)`,
      })
    }

    const formattedPhone = normalizePhoneNumber(phone)
    if (!formattedPhone) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid phone number',
      })
    }

    logger.debug('📱 Sending SMS via Twilio:', {
      to: formattedPhone,
      from: senderName || 'phone_number',
      messageLength: message.length,
      tenantId,
      purpose,
      userId: profile.id,
    })

    const smsResult = await sendTenantSMS({
      tenantId,
      to: formattedPhone,
      message,
      purpose,
      senderName,
    })

    logger.debug('✅ SMS sent successfully:', smsResult)

    return {
      success: true,
      phone: formattedPhone,
      message: 'SMS sent successfully',
      smsData: {
        messageSid: smsResult.messageSid,
        segmentCount: smsResult.segmentCount,
      },
    }
  } catch (error: any) {
    if (error?.statusCode) throw error
    console.error('❌ SMS sending error:', error)
    throw createError({
      statusCode: error?.code === 'SMS_QUOTA_EXCEEDED' ? 402 : 500,
      statusMessage: error.message || 'Failed to send SMS',
    })
  }
})
