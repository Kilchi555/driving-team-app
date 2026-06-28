/**
 * Wallee Webhook Auto-Registration
 *
 * Ensures that our webhook endpoint is registered in a Wallee Space.
 * Called automatically when production or test credentials are saved for a tenant.
 *
 * Wallee webhook registration is two-step:
 *   1. Create (or reuse) a WebhookUrl pointing to our endpoint
 *   2. Create (or reuse) WebhookListeners for Transaction AND Refund entity events
 *
 * Entity type IDs in Wallee:
 *   Transaction: 1473444080
 *   Refund:      1472041829
 */

import { Wallee } from 'wallee'
import { getWalleeSDKConfig } from '~/server/utils/wallee-config'
import { logger } from '~/utils/logger'

const WEBHOOK_URL  = 'https://app.simy.ch/api/wallee/webhook'
const WEBHOOK_NAME = 'Simy App – Webhook'

// Wallee internal entity type IDs
const TRANSACTION_ENTITY_TYPE_ID = 1473444080
const REFUND_ENTITY_TYPE_ID      = 1472041829

// States that trigger each listener
const TRANSACTION_STATES = ['AUTHORIZED', 'DECLINE', 'FAILED', 'FULFILL', 'VOIDED']
const REFUND_STATES      = ['SUCCESSFUL', 'FAILED']

interface ListenerSpec {
  entityTypeId: number
  entityStates: string[]
  name: string
}

const LISTENERS: ListenerSpec[] = [
  { entityTypeId: TRANSACTION_ENTITY_TYPE_ID, entityStates: TRANSACTION_STATES, name: `${WEBHOOK_NAME} – Transaction` },
  { entityTypeId: REFUND_ENTITY_TYPE_ID,      entityStates: REFUND_STATES,      name: `${WEBHOOK_NAME} – Refund` },
]

export interface WebhookSetupResult {
  success: boolean
  message: string
  webhookUrlId?: number
  listenerIds?: number[]
  skipped?: boolean
}

/**
 * Ensures our webhook is registered in the given Wallee space.
 * Idempotent: if the webhook URL and/or listeners already exist, they are reused.
 *
 * @param spaceId   - Wallee space ID
 * @param userId    - Wallee application user ID
 * @param apiSecret - Wallee API secret
 */
export async function ensureWalleeWebhook(
  spaceId: number,
  userId: number,
  apiSecret: string,
): Promise<WebhookSetupResult> {
  const sdkConfig              = getWalleeSDKConfig(spaceId, userId, apiSecret)
  const webhookUrlService      = new Wallee.api.WebhookUrlService(sdkConfig)
  const webhookListenerService = new Wallee.api.WebhookListenerService(sdkConfig)

  try {
    // ── Step 1: Find or create the shared webhook URL ─────────────────────────
    let webhookUrlId: number | undefined

    try {
      const existingUrlsResponse = await webhookUrlService.all(spaceId)
      const existingUrls: any[]  = (existingUrlsResponse as any)?.body ?? existingUrlsResponse ?? []

      const existing = Array.isArray(existingUrls)
        ? existingUrls.find((u: any) => u.url === WEBHOOK_URL && u.state !== 'DELETED')
        : null

      if (existing?.id) {
        webhookUrlId = existing.id
        logger.info(`[wallee-webhook] Reusing existing webhook URL #${webhookUrlId} in space ${spaceId}`)
      }
    } catch (listErr: any) {
      logger.warn(`[wallee-webhook] Could not list webhook URLs: ${listErr?.message}`)
    }

    if (!webhookUrlId) {
      const createUrlResponse = await webhookUrlService.create(spaceId, {
        name: WEBHOOK_NAME,
        url:  WEBHOOK_URL,
      } as any)

      const created = (createUrlResponse as any)?.body ?? createUrlResponse
      webhookUrlId  = created?.id

      if (!webhookUrlId) throw new Error('Webhook URL creation returned no ID')
      logger.info(`[wallee-webhook] Created webhook URL #${webhookUrlId} in space ${spaceId}`)
    }

    // ── Step 2: Fetch existing listeners once ─────────────────────────────────
    let existingListeners: any[] = []
    try {
      const existingListenersResponse = await webhookListenerService.all(spaceId)
      existingListeners = (existingListenersResponse as any)?.body ?? existingListenersResponse ?? []
      if (!Array.isArray(existingListeners)) existingListeners = []
    } catch (listErr: any) {
      logger.warn(`[wallee-webhook] Could not list webhook listeners: ${listErr?.message}`)
    }

    // ── Step 3: Ensure each listener exists ───────────────────────────────────
    const listenerIds: number[] = []

    for (const spec of LISTENERS) {
      const alreadyExists = existingListeners.some(
        (l: any) => l.url?.id === webhookUrlId
          && l.entity === spec.entityTypeId
          && l.state !== 'DELETED',
      )

      if (alreadyExists) {
        const match = existingListeners.find(
          (l: any) => l.url?.id === webhookUrlId && l.entity === spec.entityTypeId,
        )
        if (match?.id) listenerIds.push(match.id)
        logger.info(`[wallee-webhook] Listener for entity ${spec.entityTypeId} already exists in space ${spaceId} (#${match?.id})`)
        continue
      }

      try {
        const createListenerResponse = await webhookListenerService.create(spaceId, {
          name:              spec.name,
          url:               webhookUrlId,
          entity:            spec.entityTypeId,
          entityStates:      spec.entityStates,
          notifyEveryChange: false,
        } as any)

        const createdListener = (createListenerResponse as any)?.body ?? createListenerResponse
        if (createdListener?.id) {
          listenerIds.push(createdListener.id)
          logger.info(`✅ [wallee-webhook] Registered ${spec.name} listener #${createdListener.id} in space ${spaceId}`)
        }
      } catch (createErr: any) {
        logger.error(`❌ [wallee-webhook] Failed to create listener for entity ${spec.entityTypeId}: ${createErr?.message}`)
      }
    }

    const allSkipped = listenerIds.length > 0 && LISTENERS.every(spec =>
      existingListeners.some((l: any) => l.url?.id === webhookUrlId && l.entity === spec.entityTypeId && l.state !== 'DELETED'),
    )

    return {
      success: true,
      message: allSkipped
        ? `Webhooks bereits registriert (Space ${spaceId})`
        : `Webhooks erfolgreich in Space ${spaceId} registriert`,
      webhookUrlId,
      listenerIds,
      skipped: allSkipped,
    }
  } catch (err: any) {
    logger.error(`❌ [wallee-webhook] Failed to register webhooks in space ${spaceId}: ${err?.message}`)
    return {
      success: false,
      message: `Webhook-Registrierung fehlgeschlagen: ${err?.message ?? 'Unbekannter Fehler'}`,
    }
  }
}
