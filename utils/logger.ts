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

const isDev = process.env.NODE_ENV === 'development'

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
    if (isDev && !navigator.onLine) {
      return
    }

    await $fetch('/api/logs/save', {
      method: 'POST',
      body: logEntry
    })
  } catch (err) {
    // Silently fail - don't log the logging error to avoid infinite loops
    if (isDev) {
      console.error('Failed to send error to server:', err)
    }
  }
}

/**
 * Main logger object
 */
export const logger = {
  /**
   * Debug logs - only in development
   */
  debug: (component: string, message: string, data?: any) => {
    if (!isDev) {
      return
    }

    console.log(`🔍 [${component}] ${message}`, data || '')
  },

  /**
   * Info logs - always shown
   */
  info: (component: string, message: string, data?: any) => {
    console.log(`ℹ️ [${component}] ${message}`, data || '')
  },

  /**
   * Warning logs - always shown
   */
  warn: (component: string, message: string, data?: any) => {
    console.warn(`⚠️ [${component}] ${message}`, data || '')
  },

  /**
   * Error logs - always shown + sent to server
   */
  error: (component: string, message: string, data?: any) => {
    const timestamp = getTimestamp()
    const logEntry: LogEntry = {
      level: 'error',
      component,
      message,
      data: data || null,
      timestamp,
      url: getPageUrl(),
      userAgent: getUserAgent()
    }

    // Log to browser console
    console.error(`❌ [${component}] ${message}`, data || '')

    // Send to server for persistent logging
    if (typeof window !== 'undefined') {
      sendErrorToServer(logEntry)
    }
  },

  /**
   * Get all console methods (for testing)
   */
  getConfig: () => ({
    isDev,
    environment: process.env.NODE_ENV
  })
}

export default logger

