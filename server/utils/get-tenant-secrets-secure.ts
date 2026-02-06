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

    // 1. Lade Secrets aus tenant_secrets Table - both by secret_type AND secret_name
    logger.debug(`🔍 Searching for secrets by tenant_id:`, { tenantId, secretTypes, context })
    
    // Fetch ALL secrets for this tenant first, then filter in code (more reliable)
    const { data: allSecrets, error: fetchError } = await supabaseAdmin
      .from('tenant_secrets')
      .select('secret_type, secret_name, secret_value, updated_at')
      .eq('tenant_id', tenantId)

    if (fetchError) {
      logger.error(`❌ Failed to load secrets from DB:`, { context, error: fetchError.message })
      throw fetchError
    }

    if (!allSecrets || allSecrets.length === 0) {
      logger.warn(`⚠️ No secrets at all found for tenant ${tenantId} in database`, { context })
    } else {
      logger.debug(`📦 Found ${allSecrets.length} total secrets in database for tenant`, {
        context,
        secretCount: allSecrets.length,
        secretTypes: allSecrets.map(s => ({ type: s.secret_type, name: s.secret_name }))
      })
    }

    // Filter to only those we need (match by secret_type OR secret_name)
    const secrets = (allSecrets || []).filter(s => {
      const typeMatch = secretTypes.includes(s.secret_type)
      const nameMatch = s.secret_name && secretTypes.includes(s.secret_name.toUpperCase())
      return typeMatch || nameMatch
    })

    logger.debug(`🔎 Filtered to ${secrets.length} matching secrets`, {
      context,
      matched: secrets.map(s => ({ type: s.secret_type, name: s.secret_name }))
    })

    if (!secrets || secrets.length === 0) {
      logger.warn(`⚠️ No secrets found for tenant ${tenantId}`, {
        context,
        requestedTypes: secretTypes
      })
      
      // Try fallback to legacy tenants table for backward compatibility
      logger.debug(`🔄 Attempting fallback to legacy tenants table for tenant ${tenantId}`, { context })
      
      const legacySariTypes = secretTypes.filter(t => t.startsWith('SARI_'))
      if (legacySariTypes.length > 0) {
        const legacyColumns = legacySariTypes.map(t => {
          switch(t) {
            case 'SARI_CLIENT_ID': return 'sari_client_id'
            case 'SARI_CLIENT_SECRET': return 'sari_client_secret'
            case 'SARI_USERNAME': return 'sari_username'
            case 'SARI_PASSWORD': return 'sari_password'
            case 'SARI_ENVIRONMENT': return 'sari_environment'
            default: return null
          }
        }).filter(Boolean).join(', ')
        
        if (legacyColumns) {
          const { data: legacyTenant, error: legacyError } = await supabaseAdmin
            .from('tenants')
            .select(legacyColumns)
            .eq('id', tenantId)
            .single()
          
          if (!legacyError && legacyTenant) {
            logger.debug(`✅ Loaded SARI secrets from legacy tenants table for tenant ${tenantId}`, { context })
            const result: TenantSecrets = {}
            
            legacySariTypes.forEach(type => {
              const columnName = {
                'SARI_CLIENT_ID': 'sari_client_id',
                'SARI_CLIENT_SECRET': 'sari_client_secret',
                'SARI_USERNAME': 'sari_username',
                'SARI_PASSWORD': 'sari_password',
                'SARI_ENVIRONMENT': 'sari_environment'
              }[type]
              
              if (columnName && (legacyTenant as any)[columnName]) {
                result[type] = (legacyTenant as any)[columnName]
              }
            })
            
            if (Object.keys(result).length > 0) {
              return result
            }
          }
        }
      }
      
      throw new Error(`No secrets configured for tenant ${tenantId}. Requested: ${secretTypes.join(', ')}`)
    }

    // 2. Überprüfe, ob alle geforderten Secrets vorhanden sind
    // Secrets can be matched by secret_type or secret_name
    const loadedKeys = secrets.map(s => (s.secret_name || s.secret_type).toUpperCase())
    const missingTypes = secretTypes.filter(st => !loadedKeys.includes(st.toUpperCase()))

    if (missingTypes.length > 0) {
      logger.warn(`⚠️ Missing secrets for tenant ${tenantId}:`, {
        context,
        missing: missingTypes,
        loaded: loadedKeys
      })
      throw new Error(`Missing secrets: ${missingTypes.join(', ')}`)
    }

    // 3. Entschlüssle alle Secrets
    const result: TenantSecrets = {}

    for (const secret of secrets) {
      try {
        const decrypted = decryptSecret(secret.secret_value)
        // Use secret_name if available (more specific), otherwise secret_type
        const keyName = (secret.secret_name || secret.secret_type).toUpperCase()
        result[keyName] = decrypted

        logger.debug(`✅ Decrypted secret: ${keyName}`, {
          context,
          secretType: secret.secret_type,
          secretName: secret.secret_name,
          updatedAt: secret.updated_at
        })
      } catch (decryptErr: any) {
        logger.error(`❌ Failed to decrypt secret ${secret.secret_name || secret.secret_type}:`, {
          context,
          error: decryptErr.message
        })
        throw new Error(`Corrupted secret: ${secret.secret_name || secret.secret_type}. ${decryptErr.message}`)
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
