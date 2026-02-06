/**
 * Encryption/Decryption Utility für Tenant Secrets
 * 
 * AES-256-CBC Verschlüsselung mit zufälligem IV
 * Format: iv:encryptedData (beide in hex)
 */

import crypto from 'crypto'
import { logger } from '~/utils/logger'

/**
 * Verschlüsselt einen Secret-Value
 * @param value - Der zu verschlüsselnde Wert
 * @param key - Der Encryption Key (32 bytes hex = 64 chars)
 * @returns Verschlüsselter String im Format: iv:ciphertext
 */
export function encryptSecret(value: string, key?: string): string {
  try {
    const encryptionKey = key || process.env.ENCRYPTION_KEY
    
    if (!encryptionKey) {
      throw new Error('ENCRYPTION_KEY environment variable is not set')
    }

    // Key muss 32 bytes (256 bits) für AES-256 sein
    const keyBuffer = Buffer.from(encryptionKey, 'hex')
    if (keyBuffer.length !== 32) {
      throw new Error(`ENCRYPTION_KEY must be 32 bytes (64 hex chars), got ${keyBuffer.length} bytes`)
    }

    // Generiere random IV (16 bytes für AES)
    const iv = crypto.randomBytes(16)
    
    // Erstelle Cipher
    const cipher = crypto.createCipheriv('aes-256-cbc', keyBuffer, iv)
    
    // Verschlüssle
    let encrypted = cipher.update(value, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    // Kombiniere IV + encrypted data
    const result = iv.toString('hex') + ':' + encrypted
    
    logger.debug('🔒 Secret encrypted successfully', {
      originalLength: value.length,
      encryptedLength: result.length
    })
    
    return result
  } catch (error: any) {
    logger.error('❌ Encryption failed:', error.message)
    throw new Error(`Failed to encrypt secret: ${error.message}`)
  }
}

/**
 * Entschlüsselt einen Secret-Value
 * @param encrypted - Der verschlüsselte String im Format: iv:ciphertext
 * @param key - Der Encryption Key (32 bytes hex = 64 chars)
 * @returns Der entschlüsselte ursprüngliche Wert
 */
export function decryptSecret(encrypted: string, key?: string): string {
  try {
    const encryptionKey = key || process.env.ENCRYPTION_KEY
    
    if (!encryptionKey) {
      throw new Error('ENCRYPTION_KEY environment variable is not set')
    }

    // Splitte IV und encrypted data
    const parts = encrypted.split(':')
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted format: expected iv:ciphertext')
    }

    const [ivHex, cipherHex] = parts
    
    // Key muss 32 bytes sein
    const keyBuffer = Buffer.from(encryptionKey, 'hex')
    if (keyBuffer.length !== 32) {
      throw new Error(`ENCRYPTION_KEY must be 32 bytes (64 hex chars), got ${keyBuffer.length} bytes`)
    }

    // Rekonstruiere IV
    const iv = Buffer.from(ivHex, 'hex')
    if (iv.length !== 16) {
      throw new Error(`Invalid IV length: expected 16 bytes, got ${iv.length}`)
    }

    // Erstelle Decipher
    const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuffer, iv)
    
    // Entschlüssle
    let decrypted = decipher.update(cipherHex, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    
    logger.debug('🔓 Secret decrypted successfully', {
      encryptedLength: encrypted.length,
      decryptedLength: decrypted.length
    })
    
    return decrypted
  } catch (error: any) {
    logger.error('❌ Decryption failed:', error.message)
    throw new Error(`Failed to decrypt secret: ${error.message}`)
  }
}

/**
 * Generiert einen neuen, sicheren ENCRYPTION_KEY
 * Nur für Setup/Dokumentation
 */
export function generateEncryptionKey(): string {
  const key = crypto.randomBytes(32).toString('hex')
  logger.info('🔑 Generated new ENCRYPTION_KEY (keep this secret!):', key)
  return key
}
