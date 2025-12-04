// server/payment-providers/factory.ts
// Factory zum Erstellen des richtigen Payment Providers

import type { IPaymentProvider, PaymentProviderConfig } from './types'
import { WalleeProvider } from './wallee-provider'
import { StripeProvider } from './stripe-provider'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

/**
 * Lädt die Payment Provider Konfiguration für einen Tenant aus der Datenbank
 */
export async function getPaymentProviderConfig(tenantId: string): Promise<PaymentProviderConfig> {
  const supabase = getSupabaseAdmin()

  const { data: settings, error } = await supabase
    .from('tenant_settings')
    .select('payment_provider, wallee_space_id, wallee_user_id, wallee_secret_key, stripe_api_key, stripe_webhook_secret')
    .eq('tenant_id', tenantId)
    .single()

  if (error || !settings) {
    throw new Error(`Failed to load payment provider config for tenant ${tenantId}: ${error?.message}`)
  }

  // Default zu Wallee falls nicht gesetzt
  const provider = settings.payment_provider || 'wallee'

  if (provider === 'stripe') {
    if (!settings.stripe_api_key) {
      throw new Error('Stripe API key not configured for tenant')
    }

    return {
      provider: 'stripe',
      apiKey: settings.stripe_api_key,
      webhookSecret: settings.stripe_webhook_secret,
      isActive: true
    }
  } else {
    // Wallee
    if (!settings.wallee_space_id || !settings.wallee_user_id || !settings.wallee_secret_key) {
      throw new Error('Wallee credentials not configured for tenant')
    }

    return {
      provider: 'wallee',
      apiKey: '', // Nicht verwendet für Wallee
      spaceId: settings.wallee_space_id,
      userId: settings.wallee_user_id,
      apiSecret: settings.wallee_secret_key,
      isActive: true
    }
  }
}

/**
 * Erstellt eine Payment Provider Instanz basierend auf der Konfiguration
 */
export function createPaymentProvider(config: PaymentProviderConfig): IPaymentProvider {
  console.log(`🏭 Creating payment provider: ${config.provider}`)

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

