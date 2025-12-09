/**
 * Centralized Logger Utility
 * 
 * Usage:
 * logger.debug('ComponentName', 'Debug message', { data: 'value' })  // Only in development
 * logger.info('ComponentName', 'Info message')                        // Always
 * logger.warn('ComponentName', 'Warning message')                     // Always
 * logger.error('ComponentName', 'Error message', error)               // Always + sent to server
 */

export interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error'
  component: string
  message: string
  data?: any
  timestamp: string
  url?: string
  userAgent?: string
}

// Check isDev at runtime (works in browser and server)
const isDev = () => {
  // In Nuxt/Node
  if (typeof process !== 'undefined' && process.env) {
    return process.env.NODE_ENV === 'development'
  }
  // Fallback: check if running in dev server (localhost)
  if (typeof window !== 'undefined') {
    return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  }
  return false
}

/**
 * Format timestamp to ISO string
 */
function getTimestamp(): string {
  return new Date().toISOString()
}

/**
 * Get current page URL (client-side only)
 */
function getPageUrl(): string {
  if (typeof window !== 'undefined') {
    return window.location.href
  }
  return ''
}

/**
 * Get user agent (client-side only)
 */
function getUserAgent(): string {
  if (typeof navigator !== 'undefined') {
    return navigator.userAgent
  }
  return ''
}

/**
 * Send error to server for logging (critical errors only)
 */
async function sendErrorToServer(logEntry: LogEntry) {
  try {
    // Only send errors to server, not debug/info/warn
    if (logEntry.level !== 'error') {
      return
    }

    // Don't send if we're in development and offline
    if (isDev() && !navigator.onLine) {
      return
    }

    await $fetch('/api/logs/save', {
      method: 'POST',
      body: logEntry
    })
  } catch (err) {
    // Silently fail - don't log the logging error to avoid infinite loops
    if (isDev()) {
      console.error('Failed to send error to server:', err)
    }
  }
}

/**
 * Main logger object - Flexible signatures for both old and new usage
 */
export const logger = {
  /**
   * Debug logs - only in development
   * Flexible: accepts (message, ...args) OR (component, message, ...args)
   */
  debug: (...args: any[]) => {
    if (!isDev()) {
      return
    }
    console.log(...args)
  },

  /**
   * Info logs - always shown
   * Flexible: accepts (message, ...args) OR (component, message, ...args)
   */
  info: (...args: any[]) => {
    console.log(...args)
  },

  /**
   * Warning logs - always shown
   * Flexible: accepts (message, ...args) OR (component, message, ...args)
   */
  warn: (...args: any[]) => {
    console.warn(...args)
  },

  /**
   * Error logs - always shown + sent to server
   * Flexible: accepts (message, data?) OR (component, message, data?)
   */
  error: (...args: any[]) => {
    console.error(...args)
    
    // Try to send to server if possible
    if (typeof window !== 'undefined' && args.length >= 2) {
      const logEntry: LogEntry = {
        level: 'error',
        component: typeof args[0] === 'string' ? args[0] : 'Unknown',
        message: typeof args[1] === 'string' ? args[1] : String(args[1]),
        data: args[2] || null,
        timestamp: getTimestamp(),
        url: getPageUrl(),
        userAgent: getUserAgent()
      }
      sendErrorToServer(logEntry)
    }
  },

  /**
   * Get all console methods (for testing)
   */
  getConfig: () => ({
    isDev: isDev(),
    environment: typeof process !== 'undefined' ? process.env.NODE_ENV : 'unknown'
  })
}

export default logger

