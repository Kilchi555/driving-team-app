// server/payment-providers/factory.ts
// Factory zum Erstellen des richtigen Payment Providers

import type { IPaymentProvider, PaymentProviderConfig } from './types'
import { WalleeProvider } from './wallee-provider'
import { StripeProvider } from './stripe-provider'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getWalleeConfigForTenant } from '~/server/utils/wallee-config'
import { logger } from '~/utils/logger'
import { createError } from 'h3'

/**
 * Lädt die Payment Provider Konfiguration für einen Tenant aus der Datenbank
 * Credentials resolution order:
 *   1. tenant_secrets table (per-tenant, encrypted) — preferred
 *   2. tenants table (space_id / user_id) + WALLEE_SECRET_KEY env var — legacy fallback
 */
export async function getPaymentProviderConfig(tenantId: string): Promise<PaymentProviderConfig> {
  const supabase = getSupabaseAdmin()

  // Check wallee_enabled flag from tenants table
  const { data: tenant, error } = await supabase
    .from('tenants')
    .select('wallee_space_id, wallee_user_id, wallee_onboarding_status, wallee_enabled')
    .eq('id', tenantId)
    .single()

  if (error || !tenant) {
    throw new Error(`Failed to load payment provider config for tenant ${tenantId}: ${error?.message}`)
  }

  // ✅ Guard: online payments require wallee_enabled = true (set by tenant toggle)
  //    wallee_enabled can only be true after onboarding_status = 'active'
  if (!tenant.wallee_enabled) {
    const statusMessage: Record<string, string> = {
      not_started: 'Online-Zahlungen sind noch nicht eingerichtet. Bitte richte zuerst dein Wallee-Konto ein (Einstellungen → Zahlungen).',
      pending:     'Dein Antrag für Online-Zahlungen wird gerade bearbeitet. Wir melden uns sobald dein Konto aktiviert ist.',
      active:      'Online-Zahlungen sind vorübergehend deaktiviert. Du kannst sie in den Einstellungen wieder einschalten.',
    }
    const msg = statusMessage[tenant.wallee_onboarding_status as string]
      || 'Online-Zahlungen sind nicht verfügbar.'
    throw createError({ statusCode: 402, statusMessage: msg })
  }

  // Load full Wallee config via the shared helper (tenant_secrets → env var fallback)
  const walleeConfig = await getWalleeConfigForTenant(tenantId)

  return {
    provider: 'wallee',
    apiKey: '',
    spaceId: walleeConfig.spaceId,
    userId: walleeConfig.userId,
    apiSecret: walleeConfig.apiSecret,
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

