/**
 * Website copy of the touch insert. Same fingerprint, same table.
 * Keep the insert shape aligned with server/utils/marketing-touch-persist.ts.
 * This endpoint never accepts a client user id.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  MARKETING_SESSION_ID_PATTERN,
  classifyMarketingTouch,
  marketingTouchIdempotencyKey,
  referrerHost,
  type TouchObservation,
} from '~/server/utils/marketing-touch-class'

export async function persistWebsiteMarketingTouch(
  supabase: SupabaseClient,
  input: {
    tenantId: string
    sessionId: string
    observation: TouchObservation
  },
): Promise<void> {
  if (!input.tenantId) return
  if (!MARKETING_SESSION_ID_PATTERN.test(input.sessionId || '')) return

  const observation = {
    ...input.observation,
    referrer: referrerHost(input.observation.referrer),
  }
  const touchClass = classifyMarketingTouch(observation)
  const idempotencyKey = marketingTouchIdempotencyKey({
    tenantId: input.tenantId,
    sessionId: input.sessionId,
    touchClass,
    observation,
  })
  const now = new Date().toISOString()
  const row = {
    tenant_id: input.tenantId,
    session_id: input.sessionId,
    idempotency_key: idempotencyKey,
    touch_at: now,
    captured_at: now,
    source: observation.utm_source || null,
    medium: observation.utm_medium || null,
    campaign: observation.utm_campaign || null,
    term: observation.utm_term || null,
    content: observation.utm_content || null,
    gclid: observation.gclid || null,
    gbraid: observation.gbraid || null,
    wbraid: observation.wbraid || null,
    fbclid: observation.fbclid || null,
    fbc: observation.fbc || null,
    fbp: observation.fbp || null,
    referrer: observation.referrer || null,
    landing_page: observation.landing_page || null,
    attribution_class: touchClass,
  }

  const inserted = await supabase
    .from('marketing_touches')
    .insert(row)
    .select('id')
    .maybeSingle()

  if (inserted.data?.id || !inserted.error) return
  const unique = inserted.error.code === '23505' || /duplicate key/i.test(inserted.error.message || '')
  if (!unique) {
    console.warn('[save-attribution] marketing touch insert failed:', inserted.error.message)
  }
}
