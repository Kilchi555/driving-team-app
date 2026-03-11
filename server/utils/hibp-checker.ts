/**
 * HaveIBeenPwned Password Check
 *
 * Uses k-Anonymity: only the first 5 chars of the SHA1 hash are sent to the API.
 * The full hash never leaves the server – completely private.
 *
 * Docs: https://haveibeenpwned.com/API/v3#PwnedPasswords
 */

import { subtle } from 'node:crypto'

async function sha1Hex(text: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(text)
  const hashBuffer = await subtle.digest('SHA-1', data)
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()
}

export interface HibpResult {
  isPwned: boolean
  count: number   // how many times found in known leaks (0 = not found)
  error?: string  // set if the API call failed (non-fatal)
}

export async function checkPasswordPwned(password: string): Promise<HibpResult> {
  try {
    const hash = await sha1Hex(password)
    const prefix = hash.slice(0, 5)
    const suffix = hash.slice(5)

    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: {
        'Add-Padding': 'true',  // prevents traffic-analysis side-channel
        'User-Agent': 'Simy-App-PasswordCheck'
      },
      signal: AbortSignal.timeout(3000) // 3s timeout – non-blocking on failure
    })

    if (!response.ok) {
      // HIBP API unavailable → fail open (don't block registration)
      return { isPwned: false, count: 0, error: `HIBP API returned ${response.status}` }
    }

    const text = await response.text()

    // Response format: "HASH_SUFFIX:COUNT\r\n..."
    for (const line of text.split('\r\n')) {
      const [lineSuffix, countStr] = line.split(':')
      if (lineSuffix === suffix) {
        const count = parseInt(countStr, 10)
        return { isPwned: count > 0, count }
      }
    }

    return { isPwned: false, count: 0 }
  } catch (err: any) {
    // Network error, timeout, etc. → fail open
    return { isPwned: false, count: 0, error: err.message }
  }
}
