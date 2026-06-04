import { ref, computed } from 'vue'

/**
 * Unified password policy (NIST SP 800-63B aligned):
 *  - Length is the only hard composition requirement (≥ 12).
 *  - Strength is judged by zxcvbn (real entropy estimate), not by mandating
 *    uppercase/number/special characters.
 *  - Known-breached passwords are rejected via HaveIBeenPwned (k-anonymity).
 *
 * Used by every password-entry surface (register modal, set-password,
 * onboarding) so the client never enforces stricter rules than the server.
 */

export const PASSWORD_MIN_LENGTH = 12
const MIN_ZXCVBN_SCORE = 2 // 0..4; ≥2 = "akzeptabel"

const STRENGTH_LABELS = ['Sehr schwach', 'Schwach', 'Akzeptabel', 'Stark', 'Sehr stark'] as const

export function usePasswordStrength() {
  const zxcvbnScore = ref<0 | 1 | 2 | 3 | 4 | null>(null)
  const hibpStatus = ref<'idle' | 'checking' | 'pwned' | 'safe'>('idle')
  const hibpCount = ref(0)
  let hibpDebounceTimer: ReturnType<typeof setTimeout> | null = null

  /** Run zxcvbn locally, then debounce-check HIBP (only when strong enough). */
  const evaluate = async (password: string) => {
    if (!password || password.length < PASSWORD_MIN_LENGTH) {
      zxcvbnScore.value = null
      hibpStatus.value = 'idle'
      if (hibpDebounceTimer) clearTimeout(hibpDebounceTimer)
      return
    }

    const { default: zxcvbn } = await import('zxcvbn')
    zxcvbnScore.value = zxcvbn(password).score as 0 | 1 | 2 | 3 | 4

    if (zxcvbnScore.value < MIN_ZXCVBN_SCORE) {
      hibpStatus.value = 'idle'
      if (hibpDebounceTimer) clearTimeout(hibpDebounceTimer)
      return
    }

    hibpStatus.value = 'checking'
    if (hibpDebounceTimer) clearTimeout(hibpDebounceTimer)
    hibpDebounceTimer = setTimeout(async () => {
      try {
        const hibp = await $fetch<{ isPwned: boolean; count: number }>('/api/auth/check-password-pwned', {
          method: 'POST',
          body: { password }
        })
        hibpCount.value = hibp.count
        hibpStatus.value = hibp.isPwned ? 'pwned' : 'safe'
      } catch {
        // HIBP unavailable → fail open (never block on a flaky third party)
        hibpStatus.value = 'idle'
      }
    }, 500)
  }

  const reset = () => {
    zxcvbnScore.value = null
    hibpStatus.value = 'idle'
    hibpCount.value = 0
    if (hibpDebounceTimer) clearTimeout(hibpDebounceTimer)
  }

  const strengthLabel = computed(() =>
    zxcvbnScore.value === null ? '' : STRENGTH_LABELS[zxcvbnScore.value]
  )

  /** Whether a given password currently satisfies the unified policy. */
  const isPasswordAcceptable = (password: string): boolean =>
    password.length >= PASSWORD_MIN_LENGTH &&
    zxcvbnScore.value !== null &&
    zxcvbnScore.value >= MIN_ZXCVBN_SCORE &&
    hibpStatus.value !== 'pwned' &&
    hibpStatus.value !== 'checking'

  return {
    zxcvbnScore,
    hibpStatus,
    hibpCount,
    strengthLabel,
    evaluate,
    reset,
    isPasswordAcceptable,
    generateStrongPassword,
  }
}

/**
 * Generate a strong, reasonably typeable random password using the Web Crypto
 * RNG. Ambiguous characters (O/0, l/1, I) are excluded. Guarantees character
 * variety so it always scores highly and is never a breached password.
 */
export function generateStrongPassword(length = 16): string {
  const lower = 'abcdefghijkmnpqrstuvwxyz'
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const digits = '23456789'
  const symbols = '!@#$%&*?-_'
  const all = lower + upper + digits + symbols

  const randomInt = (max: number): number => {
    const buf = new Uint32Array(1)
    crypto.getRandomValues(buf)
    return buf[0] % max
  }

  const pick = (set: string, n: number): string[] =>
    Array.from({ length: n }, () => set[randomInt(set.length)])

  const remaining = Math.max(0, length - 4)
  const chars = [
    ...pick(lower, 1),
    ...pick(upper, 1),
    ...pick(digits, 1),
    ...pick(symbols, 1),
    ...pick(all, remaining),
  ]

  // Fisher–Yates shuffle so the guaranteed chars aren't always first
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }

  return chars.join('')
}
