/**
 * Migration Utility: Encrypt all plaintext secrets in tenant_secrets table
 * 
 * This script should be run ONCE after ENCRYPTION_KEY is deployed to Vercel.
 * It will encrypt all plaintext secrets (those without ":" format).
 * 
 * Usage: Call this in a cron job or one-time admin endpoint
 */

import crypto from 'crypto'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { encryptSecret } from '~/server/utils/encryption'
import { logger } from '~/utils/logger'

export interface EncryptionStats {
  total: number
  encrypted: number
  skipped: number
  errors: number
  details: Array<{
    id: string
    secret_type: string
    status: 'encrypted' | 'skipped' | 'error'
    reason?: string
  }>
}

/**
 * Check if a secret is already encrypted
 */
function isEncrypted(value: string): boolean {
  // Encrypted format is: iv:ciphertext
  // iv is 32 hex chars (16 bytes), ciphertext varies
  const parts = value.split(':')
  if (parts.length !== 2) return false
  
  // Check if both parts are valid hex
  const [ivHex, cipherHex] = parts
  if (ivHex.length !== 32) return false // IV must be 32 hex chars
  
  try {
    Buffer.from(ivHex, 'hex')
    Buffer.from(cipherHex, 'hex')
    return true
  } catch {
    return false
  }
}

/**
 * Encrypt all plaintext secrets in tenant_secrets table
 */
export async function encryptAllPlaintextSecrets(): Promise<EncryptionStats> {
  const stats: EncryptionStats = {
    total: 0,
    encrypted: 0,
    skipped: 0,
    errors: 0,
    details: []
  }

  try {
    const supabaseAdmin = getSupabaseAdmin()

    logger.info('📥 Fetching secrets from database...')
    // Get all secrets from tenant_secrets table
    const { data: secrets, error: fetchError } = await supabaseAdmin
      .from('tenant_secrets')
      .select('id, tenant_id, secret_type, secret_value')

    if (fetchError) {
      logger.error('❌ Failed to fetch secrets from tenant_secrets table:', fetchError.message)
      throw fetchError
    }

    if (!secrets || secrets.length === 0) {
      logger.info('✅ No secrets found in tenant_secrets table')
      return stats
    }

    stats.total = secrets.length
    logger.info(`🔒 Starting encryption migration for ${stats.total} secrets...`)

    // Process each secret sequentially with small delays to avoid timeout
    for (let i = 0; i < secrets.length; i++) {
      const secret = secrets[i]
      
      try {
        logger.debug(`[${i + 1}/${stats.total}] Processing ${secret.secret_type} for tenant ${secret.tenant_id}`)
        
        // Check if already encrypted
        if (isEncrypted(secret.secret_value)) {
          logger.debug(`✅ Already encrypted: ${secret.secret_type}`)
          stats.skipped++
          stats.details.push({
            id: secret.id,
            secret_type: secret.secret_type,
            status: 'skipped',
            reason: 'already_encrypted'
          })
          continue
        }

        // Encrypt the plaintext secret
        logger.debug(`🔒 Encrypting plaintext secret: ${secret.secret_type}`)
        const encrypted = encryptSecret(secret.secret_value)
        logger.debug(`✅ Encrypted successfully, updating database...`)

        // Update in database with explicit error handling
        const { error: updateError, data: updateData } = await supabaseAdmin
          .from('tenant_secrets')
          .update({ secret_value: encrypted, updated_at: new Date().toISOString() })
          .eq('id', secret.id)
          .select()

        if (updateError) {
          logger.error(`❌ Update failed: ${updateError.message}`)
          throw updateError
        }

        logger.info(`✅ [${i + 1}/${stats.total}] Encrypted: ${secret.secret_type}`)
        stats.encrypted++
        stats.details.push({
          id: secret.id,
          secret_type: secret.secret_type,
          status: 'encrypted'
        })
        
        // Small delay to prevent overwhelming the database
        if (i < secrets.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      } catch (error: any) {
        logger.error(`❌ [${i + 1}/${stats.total}] Failed to encrypt ${secret.id}:`, error.message)
        stats.errors++
        stats.details.push({
          id: secret.id,
          secret_type: secret.secret_type,
          status: 'error',
          reason: error.message
        })
      }
    }

    logger.info(`✅ Encryption migration complete!`, {
      total: stats.total,
      encrypted: stats.encrypted,
      skipped: stats.skipped,
      errors: stats.errors
    })

    return stats
  } catch (error: any) {
    logger.error('❌ Encryption migration failed:', error.message)
    throw error
  }
}

/**
 * Check encryption status of all secrets (diagnostic)
 */
export async function checkEncryptionStatus() {
  try {
    const supabaseAdmin = getSupabaseAdmin()

    const { data: secrets, error: fetchError } = await supabaseAdmin
      .from('tenant_secrets')
      .select('id, tenant_id, secret_type, secret_value')

    if (fetchError) throw fetchError

    let encrypted = 0
    let plaintext = 0

    for (const secret of secrets || []) {
      if (isEncrypted(secret.secret_value)) {
        encrypted++
      } else {
        plaintext++
        logger.warn(`⚠️ Plaintext secret found: ${secret.secret_type} for tenant ${secret.tenant_id}`)
      }
    }

    const status = {
      total: (secrets || []).length,
      encrypted,
      plaintext,
      allEncrypted: plaintext === 0
    }

    logger.info('🔍 Encryption status:', status)
    return status
  } catch (error: any) {
    logger.error('❌ Failed to check encryption status:', error.message)
    throw error
  }
}
