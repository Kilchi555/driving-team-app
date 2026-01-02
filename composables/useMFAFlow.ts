import { ref, computed, readonly } from 'vue'
import { logger } from '~/utils/logger'

interface MFAOption {
  id: string
  name: string
  type: 'sms' | 'email' | 'totp'
  verified: boolean
  lastUsed?: string
}

interface MFAState {
  requiresMFA: boolean
  email: string
  availableOptions: MFAOption[]
  selectedOption: MFAOption | null
  code: string
  isVerifying: boolean
  error: string | null
  remainingAttempts: number
}

export const useMFAFlow = () => {
  const state = ref<MFAState>({
    requiresMFA: false,
    email: '',
    availableOptions: [],
    selectedOption: null,
    code: '',
    isVerifying: false,
    error: null,
    remainingAttempts: 3
  })

  const canSubmitCode = computed(() => 
    state.value.code.length >= 4 && 
    !state.value.isVerifying &&
    state.value.remainingAttempts > 0
  )

  /**
   * Handle MFA requirement - fetch available MFA methods
   * Only TOTP and WebAuthn are considered secure
   */
  const handleMFARequired = async (email: string) => {
    try {
      logger.debug('🔐 Handling MFA requirement for:', email.substring(0, 3) + '***')
      
      // Fetch available MFA options for this user
      const response = await fetch('/api/auth/get-mfa-methods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch MFA methods: ${response.statusText}`)
      }

      const { methods, error } = await response.json()

      if (error) {
        state.value.error = error
        logger.debug('❌ Error fetching MFA methods:', error)
        return false
      }

      // Filter out insecure methods (SMS, Email) - only allow TOTP and WebAuthn
      const secureMethods = (methods || []).filter((m: MFAOption) => 
        ['totp', 'webauthn'].includes(m.type)
      )

      if (secureMethods.length === 0) {
        state.value.error = 'Keine sicheren Authentifizierungsmethoden verfügbar. Bitte kontaktieren Sie den Support.'
        logger.debug('❌ No secure MFA methods available')
        return false
      }

      state.value.requiresMFA = true
      state.value.email = email
      state.value.availableOptions = secureMethods
      state.value.selectedOption = secureMethods[0]
      state.value.error = null

      logger.debug('✅ Available secure MFA methods:', secureMethods.length)
      return true
    } catch (error: any) {
      logger.debug('❌ MFA setup error:', error.message)
      state.value.error = error.message || 'Fehler beim Abrufen der MFA-Methoden'
      return false
    }
  }

  /**
   * Send MFA code to selected method
   */
  const sendMFACode = async () => {
    if (!state.value.selectedOption) {
      state.value.error = 'Bitte wählen Sie eine MFA-Methode aus'
      return false
    }

    try {
      logger.debug('📤 Sending MFA code via:', state.value.selectedOption.type)
      state.value.isVerifying = true
      state.value.error = null

      const response = await fetch('/api/auth/send-mfa-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: state.value.email,
          mfaMethodId: state.value.selectedOption.id,
          mfaType: state.value.selectedOption.type
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to send MFA code: ${response.statusText}`)
      }

      const { success, error } = await response.json()

      if (error || !success) {
        state.value.error = error || 'Fehler beim Versand des MFA-Codes'
        return false
      }

      logger.debug('✅ MFA code sent successfully')
      state.value.code = ''
      return true
    } catch (error: any) {
      logger.debug('❌ Send MFA code error:', error.message)
      state.value.error = error.message || 'Fehler beim Versand des MFA-Codes'
      return false
    } finally {
      state.value.isVerifying = false
    }
  }

  /**
   * Verify MFA code and complete login
   */
  const verifyMFACode = async (password: string) => {
    if (!state.value.selectedOption || !state.value.code) {
      state.value.error = 'Bitte geben Sie den MFA-Code ein'
      return false
    }

    try {
      logger.debug('🔐 Verifying MFA code...')
      state.value.isVerifying = true
      state.value.error = null

      const response = await fetch('/api/auth/verify-mfa-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: state.value.email,
          password: password,
          code: state.value.code,
          mfaType: state.value.selectedOption.type
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.statusMessage || `MFA verification failed: ${response.statusText}`)
      }

      const { success, message, session, user } = await response.json()

      if (!success) {
        state.value.error = message || 'MFA-Verifikation fehlgeschlagen'
        state.value.remainingAttempts--
        
        if (state.value.remainingAttempts === 0) {
          state.value.error = 'Zu viele fehlgeschlagene Versuche. Bitte versuchen Sie es später erneut.'
        }
        return false
      }

      logger.debug('✅ MFA verification successful')
      
      // Clear state
      resetMFAState()
      
      return { success: true, session, user }
    } catch (error: any) {
      logger.debug('❌ MFA verification error:', error.message)
      state.value.error = error.message || 'MFA-Verifikation fehlgeschlagen'
      state.value.remainingAttempts--
      return false
    } finally {
      state.value.isVerifying = false
    }
  }

  /**
   * Reset MFA state
   */
  const resetMFAState = () => {
    state.value = {
      requiresMFA: false,
      email: '',
      availableOptions: [],
      selectedOption: null,
      code: '',
      isVerifying: false,
      error: null,
      remainingAttempts: 3
    }
  }

  /**
   * Select a different MFA method
   */
  const selectMFAMethod = (methodId: string) => {
    const option = state.value.availableOptions.find(m => m.id === methodId)
    if (option) {
      state.value.selectedOption = option
      state.value.code = ''
      state.value.error = null
      logger.debug('✅ MFA method selected:', option.type)
    }
  }

  return {
    state: readonly(state),
    canSubmitCode,
    handleMFARequired,
    sendMFACode,
    verifyMFACode,
    resetMFAState,
    selectMFAMethod,
    updateCode: (code: string) => { state.value.code = code }
  }
}

