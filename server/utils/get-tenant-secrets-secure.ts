/**
 * Sichere Tenant-Secrets Loader
 * 
 * Lädt Secrets aus tenant_secrets Table mit:
 * ✅ Automatischer Entschlüsselung
 * ✅ Type Safety
 * ✅ Audit Logging
 * ✅ Error Handling
 */

import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { decryptSecret } from '~/server/utils/encryption'
import { logger } from '~/utils/logger'

export interface TenantSecrets {
  [key: string]: string
}

/**
 * Lädt und entschlüsselt Tenant Secrets sicher
 * 
 * @param tenantId - Die Tenant ID
 * @param secretTypes - Array of secret types zu laden (z.B. ['SARI_CLIENT_ID', 'SARI_PASSWORD'])
 * @param context - Context für Logging (z.B. 'SARI_ENROLLMENT')
 * @returns Objekt mit Key=secretType, Value=decrypted value
 * 
 * @example
 * const secrets = await getTenantSecretsSecure(
 *   tenantId,
 *   ['SARI_CLIENT_ID', 'SARI_CLIENT_SECRET', 'SARI_USERNAME', 'SARI_PASSWORD'],
 *   'SARI_ENROLLMENT'
 * )
 * 
 * const sariClient = new SARIClient({
 *   clientId: secrets.SARI_CLIENT_ID,
 *   clientSecret: secrets.SARI_CLIENT_SECRET,
 *   username: secrets.SARI_USERNAME,
 *   password: secrets.SARI_PASSWORD
 * })
 */
export async function getTenantSecretsSecure(
  tenantId: string,
  secretTypes: string[],
  context: string = 'DEFAULT'
): Promise<TenantSecrets> {
  try {
    if (!tenantId) {
      throw new Error('tenantId is required')
    }

    if (!secretTypes || secretTypes.length === 0) {
      throw new Error('At least one secretType is required')
    }

    logger.debug(`🔑 Loading ${secretTypes.length} secrets for tenant ${tenantId}`, { context })

    const supabaseAdmin = getSupabaseAdmin()

    // 1. Lade Secrets aus tenant_secrets Table (NUR diese Spalten!)
    const { data: secrets, error: secretsError } = await supabaseAdmin
      .from('tenant_secrets')
      .select('secret_type, secret_value, updated_at')
      .eq('tenant_id', tenantId)
      .in('secret_type', secretTypes)

    if (secretsError) {
      logger.error(`❌ Failed to load secrets from DB for tenant ${tenantId}:`, {
        context,
        error: secretsError.message
      })
      throw secretsError
    }

    if (!secrets || secrets.length === 0) {
      logger.warn(`⚠️ No secrets found for tenant ${tenantId}`, {
        context,
        requestedTypes: secretTypes
      })
      throw new Error(`No secrets configured for tenant ${tenantId}. Requested: ${secretTypes.join(', ')}`)
    }

    // 2. Überprüfe, ob alle geforderten Secrets vorhanden sind
    const loadedTypes = secrets.map(s => s.secret_type)
    const missingTypes = secretTypes.filter(st => !loadedTypes.includes(st))

    if (missingTypes.length > 0) {
      logger.warn(`⚠️ Missing secrets for tenant ${tenantId}:`, {
        context,
        missing: missingTypes,
        loaded: loadedTypes
      })
      throw new Error(`Missing secrets: ${missingTypes.join(', ')}`)
    }

    // 3. Entschlüssle alle Secrets
    const result: TenantSecrets = {}

    for (const secret of secrets) {
      try {
        const decrypted = decryptSecret(secret.secret_value)
        result[secret.secret_type] = decrypted

        logger.debug(`✅ Decrypted secret: ${secret.secret_type}`, {
          context,
          updatedAt: secret.updated_at
        })
      } catch (decryptErr: any) {
        logger.error(`❌ Failed to decrypt secret ${secret.secret_type}:`, {
          context,
          error: decryptErr.message
        })
        throw new Error(`Corrupted secret: ${secret.secret_type}. ${decryptErr.message}`)
      }
    }

    logger.info(`✅ Successfully loaded ${Object.keys(result).length} secrets for tenant ${tenantId}`, {
      context,
      secretTypes: Object.keys(result)
    })

    return result
  } catch (error: any) {
    logger.error(`❌ getTenantSecretsSecure failed for tenant ${tenantId}:`, {
      context,
      error: error.message,
      secretTypes
    })
    throw error
  }
}

/**
 * Hilfsfunktion: Überprüfe ob Secrets existieren (ohne zu laden)
 */
export async function checkTenantSecretsExist(
  tenantId: string,
  secretTypes: string[]
): Promise<{ exists: boolean; missing: string[] }> {
  try {
    const supabaseAdmin = getSupabaseAdmin()

    const { data: secrets, error } = await supabaseAdmin
      .from('tenant_secrets')
      .select('secret_type')
      .eq('tenant_id', tenantId)
      .in('secret_type', secretTypes)

    if (error) throw error

    const loadedTypes = (secrets || []).map(s => s.secret_type)
    const missing = secretTypes.filter(st => !loadedTypes.includes(st))

    return {
      exists: missing.length === 0,
      missing
    }
  } catch (error: any) {
    logger.error(`❌ checkTenantSecretsExist failed:`, error)
    throw error
  }
}
