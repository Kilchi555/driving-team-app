import { Wallee } from 'wallee'
import { logger } from '~/utils/logger'
import { mergePaymentMetadata, normalizePaymentMetadata } from '~/server/utils/payment-metadata'
import {
  walleeFeeKindFromTransaction,
  walleePaymentMethodIdFromTransaction,
  type WalleeFeeKind,
} from '~/utils/wallee-fee'

type PaymentUpdateClient = {
  from: (table: string) => any
}

/**
 * Transaction.read often returns the connector configuration as an id.
 * Resolve the global payment method id from the Wallee API before classifying TWINT.
 */
export async function ensureWalleePaymentMethodId(tx: any, spaceId: number, sdkConfig: any): Promise<any> {
  if (!tx || typeof tx !== 'object') return tx
  if (walleePaymentMethodIdFromTransaction(tx) != null) return tx
  const connector = tx.paymentConnectorConfiguration
  const connectorId = typeof connector === 'number' ? connector : Number(connector?.id)
  if (!Number.isFinite(connectorId) || connectorId <= 0 || !spaceId || !sdkConfig) return tx

  try {
    const connectorService = new Wallee.api.PaymentConnectorConfigurationService(sdkConfig)
    const connectorRes = await connectorService.read(spaceId, connectorId)
    const connectorBody = connectorRes?.body || connectorRes
    if (!connectorBody || typeof connectorBody !== 'object') return tx

    let methodConfig = connectorBody.paymentMethodConfiguration
    const nestedId = walleePaymentMethodIdFromTransaction({
      paymentConnectorConfiguration: { paymentMethodConfiguration: methodConfig },
    })
    if (nestedId == null) {
      const methodConfigId = typeof methodConfig === 'number' ? methodConfig : Number(methodConfig?.id)
      if (Number.isFinite(methodConfigId) && methodConfigId > 0) {
        const methodService = new Wallee.api.PaymentMethodConfigurationService(sdkConfig)
        const methodRes = await methodService.read(spaceId, methodConfigId)
        methodConfig = methodRes?.body || methodRes
      }
    }

    tx.paymentConnectorConfiguration = {
      ...(typeof connectorBody === 'object' ? connectorBody : {}),
      paymentMethodConfiguration: methodConfig,
    }
  } catch (err: any) {
    logger.warn('⚠️ Could not resolve Wallee payment method id:', err?.message)
  }
  return tx
}

export function walleeFeeMetadataPatch(tx: unknown): {
  wallee_payment_method_id: number
  wallee_fee_kind: Exclude<WalleeFeeKind, 'legacy'>
} | null {
  const id = walleePaymentMethodIdFromTransaction(tx)
  const kind = walleeFeeKindFromTransaction(tx)
  if (id == null || kind == null) return null
  return { wallee_payment_method_id: id, wallee_fee_kind: kind }
}

/** Store the fee kind once, when a new capture is classified. Does not rewrite an existing kind. */
export async function stampWalleeFeeKind(
  supabase: PaymentUpdateClient,
  payment: { id?: string | null, metadata?: unknown },
  tx: unknown,
): Promise<void> {
  if (!payment?.id) return
  const { data: row, error: loadError } = await supabase
    .from('payments')
    .select('metadata')
    .eq('id', payment.id)
    .maybeSingle()
  if (loadError) {
    logger.warn('⚠️ Could not load payment metadata for Wallee fee kind:', {
      paymentId: payment.id,
      error: loadError.message,
    })
    return
  }
  const existing = normalizePaymentMetadata(row?.metadata ?? payment.metadata)
  if (existing.wallee_fee_kind === 'standard' || existing.wallee_fee_kind === 'twint') return
  const patch = walleeFeeMetadataPatch(tx)
  if (!patch) {
    logger.warn('⚠️ Wallee fee kind not stored: payment method id missing on verified transaction', {
      paymentId: payment.id,
    })
    return
  }
  const { error } = await supabase
    .from('payments')
    .update({
      metadata: mergePaymentMetadata(existing, patch),
    })
    .eq('id', payment.id)
  if (error) {
    logger.warn('⚠️ Could not store Wallee fee kind:', { paymentId: payment.id, error: error.message })
    return
  }
  payment.metadata = mergePaymentMetadata(existing, patch)
}
