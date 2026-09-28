import { getRequestIP } from 'h3'
import { getAppUrl } from '~/server/utils/app-url'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { discoverWebsiteFactory } from '~/server/utils/website-factory-discover'
import type { FactoryManualInput } from '~/server/utils/website-factory-profile'

function text(value: unknown, max: number) {
  const cleaned = String(value || '').trim()
  if (!cleaned) return null
  return cleaned.slice(0, max)
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event).catch(() => ({} as Record<string, unknown>))
  const manualRaw = (body?.manual && typeof body.manual === 'object' ? body.manual : {}) as Record<string, unknown>
  const manual: FactoryManualInput = {
    businessName: text(manualRaw.businessName, 120),
    offer: text(manualRaw.offer, 180),
    city: text(manualRaw.city, 80),
    phone: text(manualRaw.phone, 30),
    email: text(manualRaw.email, 120),
    address: text(manualRaw.address, 180),
    websiteUrl: text(manualRaw.websiteUrl, 300),
    bookingUrl: text(manualRaw.bookingUrl, 300),
  }
  const result = await discoverWebsiteFactory(
    {
      ip: getRequestIP(event, { xForwardedFor: true }) || 'unknown',
      googleUrl: text(body?.googleUrl, 2048),
      websiteUrl: text(body?.websiteUrl, 2048),
      manual,
    },
    { supabase: getSupabaseAdmin(), baseUrl: getAppUrl() },
  )
  if (!result.success && result.status >= 400) {
    throw createError({ statusCode: result.status, statusMessage: result.message })
  }
  if (!result.success) {
    return { success: false, missing: result.missing, known: result.known }
  }
  return { success: true, previewUrl: result.previewUrl }
})
