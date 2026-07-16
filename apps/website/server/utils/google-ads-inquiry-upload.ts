/**
 * Shared helper: forward a website lead (waitlist signup, lead magnet, course
 * registration, price calculation, contact form, ...) to app.simy.ch so it can
 * upload a server-side inquiry conversion to Google Ads.
 *
 * Google Ads credentials live only on app.simy.ch — this website never talks
 * to the Google Ads API directly, it just relays gclid/gbraid/wbraid + an
 * optional conversion value through the internal API (shared secret).
 */
import type { H3Event } from 'h3'

export interface WebsiteMarketingAttributionPayload {
  gclid?: string | null
  gbraid?: string | null
  wbraid?: string | null
  utm_source?: string | null
  utm_medium?: string | null
  utm_campaign?: string | null
  utm_content?: string | null
  utm_term?: string | null
  fbclid?: string | null
}

export async function uploadInquiryConversionViaSimy(
  event: H3Event,
  input: {
    /** Any unique string identifying this lead — stored as "proposal_<entity_id>" in google_ads_conversion_uploads. */
    entity_id: string
    marketing_attribution?: WebsiteMarketingAttributionPayload | null
    email?: string | null
    phone?: string | null
    /** Override the default inquiry value (e.g. the real estimated course price from the price calculator). */
    conversion_value_chf?: number
  },
): Promise<void> {
  const attr = input.marketing_attribution
  if (!attr?.gclid && !attr?.gbraid && !attr?.wbraid) return

  const cfg = useRuntimeConfig(event)
  const internalSecret = cfg.internalApiSecret as string
  const baseUrl = (cfg.simyApiBaseUrl as string) || 'https://app.simy.ch'
  if (!internalSecret) {
    console.warn('⚠️ NUXT_INTERNAL_API_SECRET not set — skipping Google Ads inquiry upload')
    return
  }

  try {
    await fetch(`${baseUrl.replace(/\/$/, '')}/api/internal/upload-inquiry-conversion`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Api-Secret': internalSecret,
      },
      body: JSON.stringify({
        proposal_id: input.entity_id,
        gclid: attr.gclid ?? null,
        gbraid: attr.gbraid ?? null,
        wbraid: attr.wbraid ?? null,
        email: input.email ?? '',
        phone: input.phone ?? '',
        conversion_value_chf: input.conversion_value_chf,
      }),
    })
  } catch (err: any) {
    console.warn('⚠️ Google Ads inquiry upload failed (non-critical):', err?.message ?? err)
  }
}
