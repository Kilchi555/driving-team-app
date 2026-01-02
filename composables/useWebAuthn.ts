import { ref, computed } from 'vue'
import { logger } from '~/utils/logger'

interface WebAuthnCredential {
  id: string
  deviceName?: string
  createdAt: string
  lastUsedAt?: string
  transports?: string[]
}

interface RegistrationState {
  isLoading: boolean
  error: string | null
  success: string | null
  credentials: WebAuthnCredential[]
}

export const useWebAuthn = () => {
  const state = ref<RegistrationState>({
    isLoading: false,
    error: null,
    success: null,
    credentials: []
  })

  const hasCredentials = computed(() => state.value.credentials.length > 0)

  /**
   * Start WebAuthn registration (Face ID / Touch ID setup)
   */
  const startRegistration = async (deviceName: string = 'My Device') => {
    state.value.isLoading = true
    state.value.error = null

    try {
      // Check browser support
      if (!window.PublicKeyCredential) {
        throw new Error('WebAuthn nicht vom Browser unterstützt')
      }

      logger.debug('🔐 Starting WebAuthn registration...')

      // Get registration options from server
      const response = await fetch('/api/auth/webauthn-registration-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceName })
      })

      if (!response.ok) {
        throw new Error('Fehler beim Abrufen der Registrierungsoptionen')
      }

      const { options, error } = await response.json()

      if (error) {
        throw new Error(error)
      }

      logger.debug('📋 Received registration options')

      // Convert strings back to ArrayBuffers
      options.challenge = Uint8Array.from(atob(options.challenge), c => c.charCodeAt(0))
      if (options.user.id) {
        options.user.id = Uint8Array.from(atob(options.user.id), c => c.charCodeAt(0))
      }

      // Show browser's biometric prompt
      logger.debug('👆 Showing biometric prompt...')
      const credential = await navigator.credentials.create({ publicKey: options })

      if (!credential) {
        throw new Error('WebAuthn-Registrierung abgebrochen')
      }

      logger.debug('✅ Credential created, verifying...')

      // Send credential to server for verification
      const verifyResponse = await fetch('/api/auth/webauthn-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credential: {
            id: credential.id,
            rawId: arrayBufferToBase64(credential.rawId),
            type: credential.type,
            response: {
              clientDataJSON: arrayBufferToBase64(credential.response.clientDataJSON),
              attestationObject: arrayBufferToBase64(credential.response.attestationObject)
            }
          },
          deviceName
        })
      })

      if (!verifyResponse.ok) {
        const errorData = await verifyResponse.json()
        throw new Error(errorData.statusMessage || 'Registrierung fehlgeschlagen')
      }

      const verifyData = await verifyResponse.json()

      if (!verifyData.success) {
        throw new Error(verifyData.message || 'Registrierung fehlgeschlagen')
      }

      state.value.success = 'Face ID erfolgreich aktiviert!'
      logger.debug('✅ WebAuthn registration successful')

      // Reload credentials
      await loadCredentials()

      return true
    } catch (error: any) {
      logger.debug('❌ WebAuthn registration error:', error.message)
      state.value.error = error.message || 'WebAuthn-Registrierung fehlgeschlagen'
      return false
    } finally {
      state.value.isLoading = false
    }
  }

  /**
   * Start WebAuthn login (Face ID / Touch ID authentication)
   */
  const startLogin = async (options: any) => {
    try {
      // Check browser support
      if (!window.PublicKeyCredential) {
        throw new Error('WebAuthn nicht vom Browser unterstützt')
      }

      logger.debug('👆 Starting WebAuthn login...')

      // Convert challenge from base64 to ArrayBuffer
      options.challenge = Uint8Array.from(atob(options.challenge), c => c.charCodeAt(0))

      // Show browser's biometric prompt
      const assertion = await navigator.credentials.get({ publicKey: options })

      if (!assertion) {
        throw new Error('WebAuthn-Authentifizierung abgebrochen')
      }

      logger.debug('✅ Assertion completed')

      // Convert assertion data to send to server
      return {
        id: assertion.id,
        rawId: arrayBufferToBase64(assertion.rawId),
        type: assertion.type,
        response: {
          clientDataJSON: arrayBufferToBase64(assertion.response.clientDataJSON),
          authenticatorData: arrayBufferToBase64(assertion.response.authenticatorData),
          signature: arrayBufferToBase64(assertion.response.signature)
        }
      }
    } catch (error: any) {
      logger.error('❌ WebAuthn login error:', error)
      throw error
    }
  }

  /**
   * Check if WebAuthn is supported
   */
  const isSupported = async () => {
    try {
      return window.PublicKeyCredential !== undefined
    } catch {
      return false
    }
  }

  /**
   * Load user's WebAuthn credentials
   */
  const loadCredentials = async () => {
    try {
      const response = await fetch('/api/auth/webauthn-credentials', {
        method: 'GET'
      })

      if (!response.ok) {
        throw new Error('Fehler beim Laden der Credentials')
      }

      const { credentials, error } = await response.json()

      if (error) {
        logger.debug('⚠️ Error loading credentials:', error)
        state.value.credentials = []
        return
      }

      state.value.credentials = credentials || []
      logger.debug('✅ Loaded WebAuthn credentials:', state.value.credentials.length)
    } catch (error: any) {
      logger.debug('❌ Failed to load credentials:', error.message)
      state.value.credentials = []
    }
  }

  /**
   * Delete a WebAuthn credential
   */
  const deleteCredential = async (credentialId: string) => {
    state.value.isLoading = true
    state.value.error = null

    try {
      const response = await fetch(`/api/auth/webauthn-credential/${credentialId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Löschen fehlgeschlagen')
      }

      state.value.success = 'Face ID entfernt'
      logger.debug('✅ Credential deleted')

      // Reload credentials
      await loadCredentials()

      return true
    } catch (error: any) {
      logger.debug('❌ Delete credential error:', error.message)
      state.value.error = error.message || 'Löschen fehlgeschlagen'
      return false
    } finally {
      state.value.isLoading = false
    }
  }

  /**
   * Helper: Convert ArrayBuffer to Base64
   */
  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  }

  return {
    state,
    hasCredentials,
    startRegistration,
    startLogin,
    isSupported,
    loadCredentials,
    deleteCredential
  }
}

