/**
 * Insert one immutable marketing touch. Same fingerprint returns the existing row.
 * Does not write users.acquisition_*.
 * users.acquisition_touch_id is set only when a new-customer conversion is recorded.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { logger } from '~/utils/logger'
import {
  MARKETING_SESSION_ID_PATTERN,
  classifyMarketingTouch,
  marketingTouchIdempotencyKey,
  referrerHost,
  type MarketingTouchClass,
  type TouchObservation,
} from '~/server/utils/marketing-touch-class'

export type PersistTouchResult =
  | { ok: true; touchId: string; touchClass: MarketingTouchClass; duplicate: boolean }
  | { ok: false; reason: string }

export async function persistMarketingTouch(
  supabase: SupabaseClient,
  input: {
    tenantId: string
    sessionId: string
    observation: TouchObservation
    touchAt?: string | null
    userId?: string | null
  },
): Promise<PersistTouchResult> {
  if (!input.tenantId) return { ok: false, reason: 'missing_tenant' }
  if (!MARKETING_SESSION_ID_PATTERN.test(input.sessionId || '')) {
    return { ok: false, reason: 'invalid_session_id' }
  }

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
  const touchAt = input.touchAt || new Date().toISOString()
  const capturedAt = new Date().toISOString()

  const row = {
    tenant_id: input.tenantId,
    session_id: input.sessionId,
    idempotency_key: idempotencyKey,
    touch_at: touchAt,
    captured_at: capturedAt,
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

  let touchId = inserted.data?.id as string | undefined
  let duplicate = false
  if (!touchId) {
    const code = inserted.error?.code
    const message = inserted.error?.message || ''
    const unique = code === '23505' || /duplicate key/i.test(message)
    if (inserted.error && !unique) {
      logger.warn('marketing touch insert failed', message)
      return { ok: false, reason: 'db_error' }
    }
    duplicate = true
    const existing = await supabase
      .from('marketing_touches')
      .select('id')
      .eq('tenant_id', input.tenantId)
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle()
    touchId = existing.data?.id as string | undefined
  }
  if (!touchId) return { ok: false, reason: 'touch_not_stored' }

  if (input.userId) {
    await bindTouchToUser(supabase, {
      tenantId: input.tenantId,
      userId: input.userId,
      touchId,
    })
  }

  return { ok: true, touchId, touchClass, duplicate }
}

async function bindTouchToUser(
  supabase: SupabaseClient,
  input: {
    tenantId: string
    userId: string
    touchId: string
  },
): Promise<void> {
  const { data: user } = await supabase
    .from('users')
    .select('id, tenant_id')
    .eq('id', input.userId)
    .maybeSingle()
  if (!user || user.tenant_id !== input.tenantId) return

  await supabase
    .from('marketing_touches')
    .update({ user_id: input.userId })
    .eq('id', input.touchId)
    .eq('tenant_id', input.tenantId)
    .is('user_id', null)

  // user_id on the touch is an identity link only.
  // users.acquisition_touch_id is set later, and only for a new customer.
}
