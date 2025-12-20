// server/payment-providers/factory.ts
// Factory zum Erstellen des richtigen Payment Providers

import type { IPaymentProvider, PaymentProviderConfig } from './types'
import { WalleeProvider } from './wallee-provider'
import { StripeProvider } from './stripe-provider'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'

/**
 * Lädt die Payment Provider Konfiguration für einen Tenant aus der Datenbank
 */
export async function getPaymentProviderConfig(tenantId: string): Promise<PaymentProviderConfig> {
  const supabase = getSupabaseAdmin()

  const { data: tenant, error } = await supabase
    .from('tenants')
    .select('wallee_space_id, wallee_user_id, wallee_secret_key')
    .eq('id', tenantId)
    .single()

  if (error || !tenant) {
    throw new Error(`Failed to load payment provider config for tenant ${tenantId}: ${error?.message}`)
  }

  // Default zu Wallee
  if (!tenant.wallee_space_id || !tenant.wallee_user_id || !tenant.wallee_secret_key) {
    throw new Error('Wallee credentials not configured for tenant')
  }

  return {
    provider: 'wallee',
    apiKey: '', // Nicht verwendet für Wallee
    spaceId: tenant.wallee_space_id,
    userId: tenant.wallee_user_id,
    apiSecret: tenant.wallee_secret_key,
    isActive: true
  }
}

/**
 * Erstellt eine Payment Provider Instanz basierend auf der Konfiguration
 */
export function createPaymentProvider(config: PaymentProviderConfig): IPaymentProvider {
  logger.debug(`🏭 Creating payment provider: ${config.provider}`)

  switch (config.provider) {
    case 'wallee':
      return new WalleeProvider(config)
    case 'stripe':
      return new StripeProvider(config)
    default:
      throw new Error(`Unsupported payment provider: ${config.provider}`)
  }
}

/**
 * Lädt und erstellt den Payment Provider für einen Tenant
 */
export async function getPaymentProviderForTenant(tenantId: string): Promise<IPaymentProvider> {
  const config = await getPaymentProviderConfig(tenantId)
  return createPaymentProvider(config)
}

/**
 * Cache für Provider-Instanzen (optional, für Performance)
 */
const providerCache = new Map<string, IPaymentProvider>()

export async function getCachedPaymentProvider(tenantId: string): Promise<IPaymentProvider> {
  if (providerCache.has(tenantId)) {
    return providerCache.get(tenantId)!
  }

  const provider = await getPaymentProviderForTenant(tenantId)
  providerCache.set(tenantId, provider)

  return provider
}

/**
 * Löscht den Cache für einen Tenant (z.B. nach Config-Änderung)
 */
export function clearProviderCache(tenantId?: string) {
  if (tenantId) {
    providerCache.delete(tenantId)
  } else {
    providerCache.clear()
  }
}

