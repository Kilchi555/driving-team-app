/**
 * Internal endpoint: upload an inquiry (booking_proposal) conversion to Google Ads.
 * Called from drivingteam.ch contact form — keeps Google Ads credentials on app.simy.ch only.
 */
import { defineEventHandler, readBody, createError, getRequestHeaders } from 'h3'
import { recordAndUploadInquiryConversion, sha256Hex } from '~/server/utils/google-ads-conversion'

export default defineEventHandler(async (event) => {
  const internalApiSecret = process.env.NUXT_INTERNAL_API_SECRET
  const providedSecret = getRequestHeaders(event)['x-internal-api-secret']

  if (!internalApiSecret || providedSecret !== internalApiSecret) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized internal API access' })
  }

  const body = await readBody(event)
  const { proposal_id, gclid, gbraid, wbraid, email, phone } = body ?? {}

  if (!proposal_id) {
    throw createError({ statusCode: 400, statusMessage: 'proposal_id is required' })
  }

  if (!gclid && !gbraid && !wbraid) {
    return { uploaded: false, reason: 'no_click_id' }
  }

  const normalizedEmail = (email ?? '').trim().toLowerCase()
  const normalizedPhone = (phone ?? '').replace(/\s+/g, '').replace(/^00/, '+')
  const hashedEmail = normalizedEmail ? await sha256Hex(normalizedEmail) : null
  const hashedPhone = normalizedPhone.startsWith('+') ? await sha256Hex(normalizedPhone) : null

  await recordAndUploadInquiryConversion({
    proposal_id,
    gclid: gclid ?? null,
    gbraid: gbraid ?? null,
    wbraid: wbraid ?? null,
    conversion_date_time: new Date(),
    hashed_email: hashedEmail,
    hashed_phone: hashedPhone,
  })

  return { uploaded: true }
})
