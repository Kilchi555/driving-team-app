/**
 * Secure SARI Credentials Loader
 * 
 * Retrieves SARI credentials from tenant_secrets table with fallback to legacy tenants table
 * for backward compatibility during migration period.
 */

import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'

interface SARICredentials {
  environment: 'test' | 'production'
  clientId: string
  clientSecret: string
  username: string
  password: string
}

/**
 * Get SARI credentials for a tenant from secure storage
 * @param tenantId - The tenant ID
 * @param context - Context for logging (e.g., 'SARI_ENROLLMENT')
 * @returns SARI credentials or null if not configured
 */
export async function getSARICredentialsSecure(
  tenantId: string,
  context: string = 'DEFAULT'
): Promise<SARICredentials | null> {
  try {
    const supabaseAdmin = getSupabaseAdmin()

    // 1. Try to load from tenant_secrets (secure storage)
    const { data: secrets, error: secretsError } = await supabaseAdmin
      .from('tenant_secrets')
      .select('secret_type, secret_value')
      .eq('tenant_id', tenantId)
      .in('secret_type', ['SARI_CLIENT_ID', 'SARI_CLIENT_SECRET', 'SARI_USERNAME', 'SARI_PASSWORD', 'SARI_ENVIRONMENT'])

    let clientId = ''
    let clientSecret = ''
    let username = ''
    let password = ''
    let environment: 'test' | 'production' = 'production'

    if (!secretsError && secrets && secrets.length > 0) {
      for (const secret of secrets) {
        switch (secret.secret_type) {
          case 'SARI_CLIENT_ID':
            clientId = secret.secret_value
            break
          case 'SARI_CLIENT_SECRET':
            clientSecret = secret.secret_value
            break
          case 'SARI_USERNAME':
            username = secret.secret_value
            break
          case 'SARI_PASSWORD':
            password = secret.secret_value
            break
          case 'SARI_ENVIRONMENT':
            environment = secret.secret_value as 'test' | 'production'
            break
        }
      }
    }

    // 2. If not found in secrets, fallback to legacy tenants table
    if (!clientId || !clientSecret || !username || !password) {
      logger.warn(
        `⚠️ Missing SARI credentials in secure storage for tenant ${tenantId}. Attempting fallback to legacy 'tenants' table.`,
        { context }
      )

      const { data: legacyTenant, error: legacyError } = await supabaseAdmin
        .from('tenants')
        .select('sari_client_id, sari_client_secret, sari_username, sari_password, sari_environment')
        .eq('id', tenantId)
        .single()

      if (legacyError || !legacyTenant?.sari_client_id) {
        logger.error(
          `❌ Fallback failed: No SARI credentials found in legacy 'tenants' table for tenant ${tenantId}`,
          { context, error: legacyError?.message }
        )
        return null
      }

      logger.debug(`✅ Loaded SARI credentials from legacy tenants table for tenant ${tenantId}`, { context })
      return {
        environment: (legacyTenant.sari_environment || 'production') as 'test' | 'production',
        clientId: legacyTenant.sari_client_id,
        clientSecret: legacyTenant.sari_client_secret,
        username: legacyTenant.sari_username,
        password: legacyTenant.sari_password
      }
    }

    logger.debug(`✅ SARI credentials retrieved from SECURE storage for tenant ${tenantId}`, { context })

    return {
      environment,
      clientId,
      clientSecret,
      username,
      password
    }
  } catch (error: any) {
    logger.error('❌ Error loading SARI credentials:', error.message)
    return null
  }
}

