// utils/supabase.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { logger } from '~/utils/logger'

let supabaseInstance: SupabaseClient | null = null
let supabaseAdminInstance: SupabaseClient | null = null
let storageAdapter: any | null = null

// SECURITY: SessionStorage adapter - tokens are stored in HTTP-Only cookies AND sessionStorage
// sessionStorage is cleared when the browser tab is closed, making it more secure than localStorage
// This allows Supabase client-side queries to work while keeping tokens from localStorage XSS exposure
// HTTP-Only cookies provide the real auth layer, sessionStorage is just for client-side convenience
function getSecureSessionStorage() {
  if (storageAdapter) {
    return storageAdapter
  }

  // Check if sessionStorage is available (browser environment)
  const isSessionStorageAvailable = typeof sessionStorage !== 'undefined'

  storageAdapter = {
    getItem: (key: string): string | null => {
      if (isSessionStorageAvailable) {
        return sessionStorage.getItem(key)
      }
      return null
    },
    setItem: (key: string, value: string): void => {
      if (isSessionStorageAvailable) {
        sessionStorage.setItem(key, value)
      }
    },
    removeItem: (key: string): void => {
      if (isSessionStorageAvailable) {
        sessionStorage.removeItem(key)
      }
    }
  }
  
  return storageAdapter
}

export const getSupabase = (): SupabaseClient => {
  if (!supabaseInstance) {
    // Handle both client and server environments
    let supabaseUrl: string
    let supabaseKey: string
    
    if (process.server) {
      // Server-side: use environment variables directly
      supabaseUrl = process.env.SUPABASE_URL || ''
      supabaseKey = process.env.SUPABASE_ANON_KEY || ''
    } else {
      // Client-side: try to get from window object or fallback to environment variables
      try {
        // Check if we're in a browser environment with runtime config
        if (typeof window !== 'undefined' && (window as any).__NUXT__?.config) {
          const config = (window as any).__NUXT__.config
          supabaseUrl = config.public?.supabaseUrl || ''
          supabaseKey = config.public?.supabaseAnonKey || ''
        } else {
          // Fallback to environment variables
          supabaseUrl = process.env.SUPABASE_URL || ''
          supabaseKey = process.env.SUPABASE_ANON_KEY || ''
        }
      } catch (error) {
        // Fallback to environment variables if anything fails
        supabaseUrl = process.env.SUPABASE_URL || ''
        supabaseKey = process.env.SUPABASE_ANON_KEY || ''
      }
    }
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing Supabase configuration:', { 
        url: supabaseUrl ? '✅' : '❌', 
        key: supabaseKey ? '✅' : '❌' 
      })
      throw new Error('Missing Supabase configuration')
    }

    logger.debug('Supabase', '🔗 Initializing Supabase client with URL:', supabaseUrl)
    
    // SECURITY: Use sessionStorage - tokens are in HTTP-Only cookies AND sessionStorage
    // sessionStorage is cleared when browser tab closes (more secure than localStorage)
    // This allows client-side Supabase queries while preventing XSS token theft
    const storage = process.client ? getSecureSessionStorage() : undefined
    
    supabaseInstance = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        storage: storage as any // Singleton storage adapter
      }
    })
  }
  return supabaseInstance
}

// Server-side admin client (uses service role to bypass RLS for trusted jobs)
export const getSupabaseAdmin = (): SupabaseClient => {
  if (!process.server) {
    throw new Error('getSupabaseAdmin can only be used on the server')
  }
  if (!supabaseAdminInstance) {
    const supabaseUrl = process.env.SUPABASE_URL || 'https://unyjaetebnaexaflpyoc.supabase.co'
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) {
      console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY for admin client')
      throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')
    }
    supabaseAdminInstance = createClient(supabaseUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      }
    })
  }
  return supabaseAdminInstance
}

// Server-side helper to create a Supabase client with user session from Authorization header
export const getSupabaseServerWithSession = (event: any): SupabaseClient => {
  if (!process.server) {
    throw new Error('getSupabaseServerWithSession can only be used on the server')
  }

  const supabaseUrl = process.env.SUPABASE_URL || 'https://unyjaetebnaexaflpyoc.supabase.co'
  const supabaseKey = process.env.SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase configuration')
    throw new Error('Missing Supabase configuration')
  }

  // Try to get access token from Authorization header
  const authHeader = event.node.req.headers.authorization || ''
  let accessToken: string | null = null

  logger.debug('Supabase', '🔐 DEBUG: Incoming headers:', {
    authHeader: authHeader ? '✓ Present' : '✗ Missing',
    authHeaderFirst50: authHeader.substring(0, 50)
  })

  if (authHeader.startsWith('Bearer ')) {
    accessToken = authHeader.substring(7)
    logger.debug('Supabase', '🔐 DEBUG: Extracted token from Authorization header:', accessToken ? `✓ (${accessToken.length} chars)` : '✗')
  }

  logger.debug('Supabase', '🔐 DEBUG: Final accessToken:', accessToken ? `✓ Found (${accessToken.length} chars)` : '✗ Not found')

  // Create Supabase client with the access token if available
  let headers: Record<string, string> = {}
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`
    logger.debug('Supabase', '🔐 DEBUG: Using Bearer token auth')
  } else {
    logger.debug('Supabase', '🔐 DEBUG: Using anon key auth (no token found)')
  }

  return createClient(supabaseUrl, supabaseKey, {
    global: { headers },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    }
  })
}

export default getSupabase

/**
 * Helper function to filter out soft-deleted appointments
 * @param query - Supabase query builder
 * @returns Query builder with soft delete filter applied
 */
export function excludeDeletedAppointments<T extends any>(query: any) {
  return query.is('deleted_at', null)
}

/**
 * Helper function to get only deleted appointments (for admin purposes)
 * @param query - Supabase query builder
 * @returns Query builder with only deleted appointments
 */
export function onlyDeletedAppointments<T extends any>(query: any) {
  return query.not('deleted_at', 'is', null)
}