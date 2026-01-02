/**
 * Error Logging Plugin
 * Sends errors to Supabase for persistent storage and monitoring
 * No external Sentry dependency needed!
 */

import type { NuxtApp } from '#app'
import { defineNuxtPlugin } from '#app'
import { getSupabase } from '~/utils/supabase'

export default defineNuxtPlugin((nuxtApp: NuxtApp) => {
  const supabase = getSupabase()
  
  console.log('🔴 Sentry plugin loading...')

  /**
   * Store error in Supabase (adapted for existing error_logs table schema)
   */
  const logErrorToSupabase = async (errorData: any) => {
    try {
      console.log('📝 logErrorToSupabase called with:', errorData.type, errorData.message)
      const { data: userData } = await supabase.auth.getUser()
      const user = userData?.user

      // Get tenant ID and database user ID
      let tenantId = null
      let dbUserId = null
      if (user) {
        const { data: userProfile } = await supabase
          .from('users')
          .select('id, tenant_id')
          .eq('auth_user_id', user.id)
          .single()
        tenantId = userProfile?.tenant_id
        dbUserId = userProfile?.id // Use database user ID, not auth user ID!
      }

      // Map severity to level (debug, info, warn, error)
      const levelMap: Record<string, string> = {
        'info': 'info',
        'warning': 'warn',
        'error': 'error',
        'critical': 'error',
        'debug': 'debug',
      }

      // Insert error log using existing table schema
      const { error: insertError } = await supabase
        .from('error_logs')
        .insert({
          level: levelMap[errorData.severity] || 'error',
          component: errorData.type || 'Error',
          message: errorData.message || 'Unknown error',
          data: {
            stack: errorData.stack,
            breadcrumbs: errorData.breadcrumbs || [],
            browserName: errorData.browserName,
            browserVersion: errorData.browserVersion,
            pageLoadTime: errorData.pageLoadTime,
            apiResponseTime: errorData.apiResponseTime,
            customContext: errorData.context,
          },
          url: window.location.href,
          user_agent: navigator.userAgent,
          user_id: dbUserId || null, // Use database user ID
          tenant_id: tenantId,
        })

      if (insertError) {
        console.error('Failed to log error to Supabase:', insertError)
      }
    } catch (err) {
      console.error('Error logging to Supabase:', err)
    }
  }

  /**
   * Capture exception and log to Supabase
   */
  const captureException = async (error: any, context?: Record<string, any>) => {
    try {
      const errorData = {
        type: error.name || 'Error',
        message: error.message || String(error),
        stack: error.stack,
        breadcrumbs: getStoredBreadcrumbs(),
        severity: context?.severity || 'error',
        browserName: getBrowserName(),
        browserVersion: navigator.userAgent,
        userName: context?.userName,
        ...context,
      }

      await logErrorToSupabase(errorData)
      console.error('📍 Error logged to Supabase:', error)
    } catch (err) {
      console.error('Failed to capture exception:', err)
    }
  }

  /**
   * Capture message and log to Supabase
   */
  const captureMessage = async (
    message: string,
    level: 'fatal' | 'error' | 'warning' | 'info' | 'debug' = 'info'
  ) => {
    try {
      const errorData = {
        type: 'Message',
        message: message,
        breadcrumbs: getStoredBreadcrumbs(),
        severity: level,
        browserName: getBrowserName(),
      }

      await logErrorToSupabase(errorData)
      console.log(`📍 Message logged [${level.toUpperCase()}]:`, message)
    } catch (err) {
      console.error('Failed to capture message:', err)
    }
  }

  /**
   * Set user context
   */
  const setUser = (userId: string, email?: string, name?: string) => {
    const userContext = {
      id: userId,
      email: email || '',
      username: name || '',
    }
    sessionStorage.setItem('error_log_user', JSON.stringify(userContext))
  }

  /**
   * Clear user context
   */
  const clearUser = () => {
    sessionStorage.removeItem('error_log_user')
  }

  /**
   * Add breadcrumb for tracking user actions
   */
  const addBreadcrumb = (
    message: string,
    category: string = 'user-action',
    level: 'fatal' | 'error' | 'warning' | 'info' | 'debug' = 'info'
  ) => {
    const breadcrumbs = getStoredBreadcrumbs()
    breadcrumbs.push({
      message,
      category,
      level,
      timestamp: new Date().toISOString(),
    })
    // Keep only last 50 breadcrumbs
    if (breadcrumbs.length > 50) breadcrumbs.shift()
    sessionStorage.setItem('error_log_breadcrumbs', JSON.stringify(breadcrumbs))
  }

  /**
   * Get stored breadcrumbs
   */
  const getStoredBreadcrumbs = () => {
    try {
      return JSON.parse(sessionStorage.getItem('error_log_breadcrumbs') || '[]')
    } catch {
      return []
    }
  }

  /**
   * Get browser name
   */
  const getBrowserName = () => {
    const ua = navigator.userAgent
    if (ua.includes('Firefox')) return 'Firefox'
    if (ua.includes('Chrome')) return 'Chrome'
    if (ua.includes('Safari')) return 'Safari'
    if (ua.includes('Edge')) return 'Edge'
    return 'Unknown'
  }

  /**
   * Capture unhandled errors
   */
  window.addEventListener('error', (event) => {
    console.log('🔴 Unhandled error event caught:', event.message)
    captureException(event.error || new Error(event.message), {
      type: 'uncaught_error',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    })
  })

  /**
   * Capture unhandled promise rejections
   */
  window.addEventListener('unhandledrejection', (event) => {
    console.log('🔴 Unhandled promise rejection caught:', event.reason?.message)
    captureException(event.reason || new Error('Unhandled Promise Rejection'), {
      type: 'unhandled_promise_rejection',
    })
  })

  /**
   * Hook Vue error handler
   */
  nuxtApp.vueApp.config.errorHandler = (err: any, instance: any, info: string) => {
    console.log('🔴 Vue error handler caught:', err.message)
    captureException(err, {
      type: 'vue_error',
      componentName: instance?.$options?.name || 'Unknown',
      lifecycleHook: info,
      severity: 'error',
    })
  }
  
  console.log('🟢 Sentry plugin loaded successfully')

  /**
   * Provide error logging to the app
   */
  return {
    provide: {
      errorLog: {
        captureException,
        captureMessage,
        setUser,
        clearUser,
        addBreadcrumb,
      },
    },
  }
})
