/**
 * Composable for error logging
 * Usage: const { captureError, captureMessage, setUser } = useErrorLog()
 */

export const useErrorLog = () => {
  const { $errorLog } = useNuxtApp()

  if (!$errorLog) {
    console.warn('Error logging not initialized')
    return {
      captureError: () => {},
      captureMessage: () => {},
      setUser: () => {},
      clearUser: () => {},
      addBreadcrumb: () => {},
    }
  }

  /**
   * Capture an error manually
   */
  const captureError = async (error: Error | string, context?: Record<string, any>) => {
    if (typeof error === 'string') {
      await $errorLog.captureMessage(error)
    } else {
      await $errorLog.captureException(error, context)
    }
    console.error('📍 Error logged:', error)
  }

  /**
   * Capture a message (not an error)
   */
  const captureMessage = async (
    message: string,
    level: 'fatal' | 'error' | 'warning' | 'info' | 'debug' = 'info'
  ) => {
    await $errorLog.captureMessage(message, level)
    console.log(`📍 Message logged [${level.toUpperCase()}]:`, message)
  }

  /**
   * Set user context
   */
  const setUser = (userId: string, email?: string, name?: string) => {
    $errorLog.setUser(userId, email, name)
  }

  /**
   * Clear user context (on logout)
   */
  const clearUser = () => {
    $errorLog.clearUser()
  }

  /**
   * Add breadcrumb for tracking user actions
   */
  const addBreadcrumb = (
    message: string,
    category: string = 'user-action',
    level: 'fatal' | 'error' | 'warning' | 'info' | 'debug' = 'info'
  ) => {
    $errorLog.addBreadcrumb(message, category, level)
  }

  return {
    captureError,
    captureMessage,
    setUser,
    clearUser,
    addBreadcrumb,
  }
}
