/**
 * Composable for Passkey (WebAuthn) registration, login, and management.
 *
 * Wraps @simplewebauthn/browser and our /api/auth/passkey/* endpoints.
 */

import { ref, computed } from 'vue'
import {
  startRegistration,
  startAuthentication,
  browserSupportsWebAuthn
} from '@simplewebauthn/browser'

export interface PasskeyCredential {
  id: string
  deviceName: string | null
  deviceType: 'singleDevice' | 'multiDevice'
  synced: boolean
  transports: string[]
  createdAt: string
  lastUsedAt: string | null
}

export interface PasskeyStatus {
  enabledRoles: string[]
  requiredRoles: string[]
  anyEnabled: boolean
  loginEnabled: boolean
}

export const usePasskey = () => {
  const credentials = ref<PasskeyCredential[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const isSupported = computed(() => {
    if (typeof window === 'undefined') return false
    return browserSupportsWebAuthn()
  })

  // ──────────────────────────────────────────────────────────────────────────
  // Registration
  // ──────────────────────────────────────────────────────────────────────────

  const registerPasskey = async (deviceName?: string): Promise<{ success: boolean; deviceType?: string }> => {
    isLoading.value = true
    error.value = null

    try {
      if (!isSupported.value) {
        throw new Error('Passkeys werden von diesem Browser nicht unterstützt.')
      }

      // 1. Get registration options
      const optsRes = await $fetch<{ challengeId: string; options: any }>(
        '/api/auth/passkey/register/options',
        { method: 'POST' }
      )

      // 2. Trigger browser/OS biometric prompt
      const response = await startRegistration({ optionsJSON: optsRes.options })

      // 3. Verify on server
      const result = await $fetch<{ success: boolean; deviceType?: string }>(
        '/api/auth/passkey/register/verify',
        {
          method: 'POST',
          body: {
            challengeId: optsRes.challengeId,
            response,
            deviceName: deviceName || guessDeviceName()
          }
        }
      )

      await loadCredentials()
      return result
    } catch (err: any) {
      const msg = humanizeError(err)
      error.value = msg
      return { success: false }
    } finally {
      isLoading.value = false
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Login
  // ──────────────────────────────────────────────────────────────────────────

  const loginWithPasskey = async (email?: string): Promise<{ success: boolean; user?: any }> => {
    isLoading.value = true
    error.value = null

    try {
      if (!isSupported.value) {
        throw new Error('Passkeys werden von diesem Browser nicht unterstützt.')
      }

      const optsRes = await $fetch<{ challengeId: string; options: any }>(
        '/api/auth/passkey/login/options',
        {
          method: 'POST',
          body: email ? { email } : {}
        }
      )

      const response = await startAuthentication({ optionsJSON: optsRes.options })

      const result = await $fetch<{ success: boolean; user?: any }>(
        '/api/auth/passkey/login/verify',
        {
          method: 'POST',
          body: {
            challengeId: optsRes.challengeId,
            response
          }
        }
      )

      return result
    } catch (err: any) {
      error.value = humanizeError(err)
      return { success: false }
    } finally {
      isLoading.value = false
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Credential management
  // ──────────────────────────────────────────────────────────────────────────

  const loadCredentials = async () => {
    try {
      const res = await $fetch<{ credentials: PasskeyCredential[] }>(
        '/api/auth/passkey/credentials'
      )
      credentials.value = res.credentials
    } catch (err: any) {
      // Silent — empty list is acceptable
      credentials.value = []
    }
  }

  const deletePasskey = async (id: string): Promise<boolean> => {
    isLoading.value = true
    error.value = null
    try {
      await $fetch(`/api/auth/passkey/credentials/${id}`, { method: 'DELETE' })
      await loadCredentials()
      return true
    } catch (err: any) {
      error.value = humanizeError(err)
      return false
    } finally {
      isLoading.value = false
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Status (public)
  // ──────────────────────────────────────────────────────────────────────────

  const fetchStatus = async (): Promise<PasskeyStatus> => {
    return await $fetch<PasskeyStatus>('/api/auth/passkey/status')
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Backup codes
  // ──────────────────────────────────────────────────────────────────────────

  const generateBackupCodes = async (): Promise<string[] | null> => {
    isLoading.value = true
    error.value = null
    try {
      const res = await $fetch<{ codes: string[] }>(
        '/api/auth/passkey/backup-codes/generate',
        { method: 'POST' }
      )
      return res.codes
    } catch (err: any) {
      error.value = humanizeError(err)
      return null
    } finally {
      isLoading.value = false
    }
  }

  const getBackupCodeStatus = async (): Promise<number> => {
    try {
      const res = await $fetch<{ remainingCodes: number }>(
        '/api/auth/passkey/backup-codes/status'
      )
      return res.remainingCodes
    } catch {
      return 0
    }
  }

  const loginWithBackupCode = async (
    email: string,
    code: string
  ): Promise<{ success: boolean; user?: any; remainingCodes?: number }> => {
    isLoading.value = true
    error.value = null
    try {
      const result = await $fetch<any>('/api/auth/passkey/backup-codes/verify', {
        method: 'POST',
        body: { email, code }
      })
      return result
    } catch (err: any) {
      error.value = humanizeError(err)
      return { success: false }
    } finally {
      isLoading.value = false
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────────────────────────────────────

  const hasCredentials = computed(() => credentials.value.length > 0)

  return {
    // state
    credentials,
    isLoading,
    error,
    isSupported,
    hasCredentials,
    // actions
    registerPasskey,
    loginWithPasskey,
    loadCredentials,
    deletePasskey,
    fetchStatus,
    generateBackupCodes,
    getBackupCodeStatus,
    loginWithBackupCode
  }
}

function guessDeviceName(): string {
  if (typeof navigator === 'undefined') return 'Unbenanntes Gerät'
  const ua = navigator.userAgent
  const date = new Date().toLocaleDateString('de-CH')
  if (/iPhone/i.test(ua)) return `iPhone (${date})`
  if (/iPad/i.test(ua)) return `iPad (${date})`
  if (/Android/i.test(ua)) return `Android (${date})`
  if (/Mac OS X/i.test(ua)) return `Mac (${date})`
  if (/Windows/i.test(ua)) return `Windows (${date})`
  return `Browser (${date})`
}

function humanizeError(err: any): string {
  const msg = err?.data?.statusMessage || err?.statusMessage || err?.message || 'Unbekannter Fehler'

  if (err?.name === 'NotAllowedError' || /not allowed|cancel/i.test(msg)) {
    return 'Vorgang abgebrochen.'
  }
  if (err?.name === 'InvalidStateError' || /already.*registered|exclude/i.test(msg)) {
    return 'Dieses Gerät ist bereits registriert.'
  }
  if (/not supported/i.test(msg)) {
    return 'Passkeys werden hier nicht unterstützt. Stelle sicher dass du HTTPS und einen modernen Browser verwendest.'
  }
  if (/Challenge invalid/i.test(msg)) {
    return 'Vorgang abgelaufen. Bitte erneut versuchen.'
  }
  if (/counter regression/i.test(msg)) {
    return 'Sicherheitsproblem erkannt: dieser Passkey wurde vorsorglich deaktiviert. Bitte einen neuen erstellen.'
  }
  return msg
}
