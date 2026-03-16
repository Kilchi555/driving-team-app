// server/utils/iban-utils.ts
// IBAN validation and AES-256 encryption/decryption

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-cbc'

function getEncryptionKey(): Buffer {
  const key = process.env.IBAN_ENCRYPTION_KEY
  if (!key) throw new Error('IBAN_ENCRYPTION_KEY environment variable is not set')
  // Key must be 32 bytes (256 bit) — use hex encoded 64-char string
  if (key.length !== 64) throw new Error('IBAN_ENCRYPTION_KEY must be 64 hex characters (32 bytes)')
  return Buffer.from(key, 'hex')
}

/**
 * Encrypt IBAN with AES-256-CBC
 * Returns: "iv:encryptedData" as hex string
 */
export function encryptIBAN(iban: string): string {
  const key = getEncryptionKey()
  const iv = randomBytes(16)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(iban, 'utf8'), cipher.final()])
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`
}

/**
 * Decrypt IBAN
 */
export function decryptIBAN(encryptedData: string): string {
  const key = getEncryptionKey()
  const [ivHex, dataHex] = encryptedData.split(':')
  if (!ivHex || !dataHex) throw new Error('Invalid encrypted IBAN format')
  const iv = Buffer.from(ivHex, 'hex')
  const encrypted = Buffer.from(dataHex, 'hex')
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
}

/**
 * Validate Swiss IBAN (CH + 19 chars) or international IBAN
 * Uses MOD-97 checksum algorithm
 */
export function validateIBAN(iban: string): { valid: boolean; error?: string } {
  const cleaned = iban.replace(/\s/g, '').toUpperCase()

  if (!cleaned) return { valid: false, error: 'IBAN ist leer' }
  if (cleaned.length < 15 || cleaned.length > 34) return { valid: false, error: 'IBAN-Länge ungültig' }
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/.test(cleaned)) return { valid: false, error: 'IBAN-Format ungültig' }

  // Swiss IBAN: CH + 2 check digits + 5 bank code + 12 account = 21 chars
  if (cleaned.startsWith('CH') && cleaned.length !== 21) {
    return { valid: false, error: 'Schweizer IBAN muss 21 Zeichen lang sein' }
  }

  // MOD-97 check: move first 4 chars to end, convert letters to numbers, check mod 97 === 1
  const rearranged = cleaned.slice(4) + cleaned.slice(0, 4)
  const numeric = rearranged.split('').map(c => {
    const code = c.charCodeAt(0)
    return code >= 65 && code <= 90 ? (code - 55).toString() : c
  }).join('')

  // BigInt mod for large numbers
  let remainder = BigInt(0)
  for (const char of numeric) {
    remainder = (remainder * BigInt(10) + BigInt(parseInt(char))) % BigInt(97)
  }

  if (remainder !== BigInt(1)) return { valid: false, error: 'IBAN-Prüfziffer ungültig' }
  return { valid: true }
}

/**
 * Format IBAN for display: CH93 **** **** **** **57
 */
export function maskIBAN(iban: string): string {
  const cleaned = iban.replace(/\s/g, '').toUpperCase()
  const last4 = cleaned.slice(-4)
  const prefix = cleaned.slice(0, 4)
  const maskedMiddle = '*'.repeat(Math.max(0, cleaned.length - 8)).replace(/(.{4})/g, '$1 ').trim()
  return `${prefix} ${maskedMiddle} ${last4}`.replace(/\s+/g, ' ')
}
