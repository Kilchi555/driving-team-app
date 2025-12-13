import { getSupabase } from '~/utils/supabase'
import { logger } from '~/utils/logger'

/**
 * Composable to make authenticated API calls with Supabase token
 * Automatically includes the Authorization header from the current session
 */
export function useAuthFetch() {
  const getAuthHeaders = async (): Promise<Record<string, string>> => {
    try {
      const supabase = getSupabase()
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error || !session?.access_token) {
        logger.warn('⚠️ No active session for auth fetch')
        return {}
      }

      return {
        Authorization: `Bearer ${session.access_token}`
      }
    } catch (err) {
      logger.warn('⚠️ Error getting auth headers:', err)
      return {}
    }
  }

  const authFetch = async <T = any>(
    url: string,
    options?: any
  ): Promise<T> => {
    try {
      const headers = await getAuthHeaders()
      
      const mergedOptions = {
        ...options,
        headers: {
          ...headers,
          ...(options?.headers || {})
        }
      }

      logger.debug(`🔐 Auth fetch [${mergedOptions.method || 'GET'}] ${url}`)

      return await $fetch<T>(url, mergedOptions)
    } catch (error: any) {
      logger.debug(`❌ Auth fetch error [${url}]:`, error.message)
      throw error
    }
  }

  return {
    authFetch,
    getAuthHeaders
  }
}

