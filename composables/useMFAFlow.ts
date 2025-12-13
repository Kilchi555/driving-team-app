import { ref } from 'vue'
import { logger } from '~/utils/logger'

/**
 * Composable for MFA (Multi-Factor Authentication) flow
 * Handles SMS/Email codes and Passkey verification
 */
export function useMFAFlow() {
  const showMFAModal = ref(false)
  const mfaStep = ref<'method' | 'code' | 'passkey'>('method') // Which step in MFA flow
  const mfaSelectedMethod = ref<'sms' | 'email' | 'passkey'>('sms')
  const mfaCodeInput = ref('')
  const mfaCodeSent = ref(false)
  const mfaCodeLoading = ref(false)
  const mfaCodeError = ref<string | null>(null)
  const mfaCodeSuccess = ref(false)
  const mfaCodeExpiresIn = ref(0) // seconds
  
  // MFA Options from server
  const mfaOptions = ref<any>(null)
  const mfaUserId = ref<string | null>(null)
  const mfaTempToken = ref<string | null>(null)

  /**
   * Open MFA dialog after successful password verification
   */
  const openMFAFlow = (userId: string, tempToken: string, options: any) => {
    mfaUserId.value = userId
    mfaTempToken.value = tempToken
    mfaOptions.value = options
    showMFAModal.value = true
    mfaStep.value = 'method'
    mfaSelectedMethod.value = options.hasPasskeys ? 'passkey' : 'sms'
    mfaCodeInput.value = ''
    mfaCodeSent.value = false
    mfaCodeError.value = null
    mfaCodeSuccess.value = false
    logger.debug('📱 Opening MFA flow for user:', userId)
  }

  /**
   * Send SMS or Email code
   */
  const sendMFACode = async (method: 'sms' | 'email', email: string) => {
    mfaCodeLoading.value = true
    mfaCodeError.value = null
    mfaCodeSuccess.value = false

    try {
      logger.debug(`📤 Requesting ${method} code for:`, email)
      
      const response = await $fetch('/api/mfa/send-code', {
        method: 'POST',
        body: {
          email: email,
          method: method
        }
      }) as any

      if (response?.success) {
        mfaCodeSent.value = true
        mfaCodeSuccess.value = true
        mfaCodeExpiresIn.value = 10 * 60 // 10 minutes
        mfaStep.value = 'code'
        
        logger.debug(`✅ ${method.toUpperCase()} code sent successfully`)
        
        // Start countdown
        startCodeExpireCountdown()
      } else {
        mfaCodeError.value = response?.message || `${method.toUpperCase()} konnte nicht gesendet werden`
        logger.warn(`❌ Failed to send ${method} code:`, response?.message)
      }
    } catch (error: any) {
      console.error(`❌ Error sending ${method} code:`, error)
      mfaCodeError.value = error?.data?.statusMessage || `Fehler beim Senden des ${method.toUpperCase()}-Codes`
      logger.error(`Error: ${error.message}`)
    } finally {
      mfaCodeLoading.value = false
    }
  }

  /**
   * Verify SMS or Email code
   */
  const verifyMFACode = async (method: 'sms' | 'email'): Promise<boolean> => {
    if (!mfaCodeInput.value || mfaCodeInput.value.length < 6) {
      mfaCodeError.value = 'Bitte geben Sie einen 6-stelligen Code ein'
      return false
    }

    mfaCodeLoading.value = true
    mfaCodeError.value = null

    try {
      logger.debug(`🔐 Verifying ${method} code...`)
      
      const response = await $fetch('/api/mfa/verify-code', {
        method: 'POST',
        body: {
          userId: mfaUserId.value,
          code: mfaCodeInput.value,
          method: method,
          ipAddress: 'client', // Can be enhanced
          deviceName: navigator.userAgent.split('(')[1]?.split(';')[0] || 'Unknown'
        }
      }) as any

      if (response?.success) {
        mfaCodeSuccess.value = true
        logger.debug(`✅ ${method.toUpperCase()} code verified successfully`)
        return true
      } else {
        mfaCodeError.value = response?.message || 'Code konnte nicht verifiziert werden'
        logger.warn(`❌ Failed to verify ${method} code:`, response?.message)
        return false
      }
    } catch (error: any) {
      console.error(`❌ Error verifying ${method} code:`, error)
      mfaCodeError.value = error?.data?.statusMessage || 'Fehler bei der Code-Verifizierung'
      logger.error(`Error: ${error.message}`)
      return false
    } finally {
      mfaCodeLoading.value = false
    }
  }

  /**
   * Start countdown for code expiration
   */
  const startCodeExpireCountdown = () => {
    const interval = setInterval(() => {
      mfaCodeExpiresIn.value--
      if (mfaCodeExpiresIn.value <= 0) {
        clearInterval(interval)
        mfaCodeSent.value = false
        mfaCodeError.value = 'Code ist abgelaufen. Bitte anfordern Sie einen neuen Code.'
      }
    }, 1000)
  }

  /**
   * Format expires-in to readable format
   */
  const formatExpiresIn = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  /**
   * Close MFA modal
   */
  const closeMFAFlow = () => {
    showMFAModal.value = false
    mfaStep.value = 'method'
    mfaCodeInput.value = ''
    mfaCodeSent.value = false
    mfaCodeError.value = null
    mfaCodeSuccess.value = false
    mfaUserId.value = null
    mfaTempToken.value = null
  }

  return {
    showMFAModal,
    mfaStep,
    mfaSelectedMethod,
    mfaCodeInput,
    mfaCodeSent,
    mfaCodeLoading,
    mfaCodeError,
    mfaCodeSuccess,
    mfaCodeExpiresIn,
    mfaOptions,
    mfaUserId,
    mfaTempToken,
    openMFAFlow,
    sendMFACode,
    verifyMFACode,
    closeMFAFlow,
    formatExpiresIn
  }
}

