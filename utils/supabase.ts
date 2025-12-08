// utils/supabase.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let supabaseInstance: SupabaseClient | null = null
let supabaseAdminInstance: SupabaseClient | null = null

// Custom Storage Adapter für normales localStorage
// Supabase speichert Sessions direkt im localStorage ohne Prefix
function createNormalStorage() {
  if (typeof window === 'undefined') {
    // Fallback für Server-Side: normales localStorage-Verhalten
    return {
      getItem: (key: string) => null,
      setItem: (key: string, value: string) => {},
      removeItem: (key: string) => {}
    }
  }

  return {
    getItem: (key: string): string | null => {
      try {
        return localStorage.getItem(key)
      } catch (error) {
        console.error('❌ Error reading from storage:', error)
        return null
      }
    },
    setItem: (key: string, value: string): void => {
      try {
        localStorage.setItem(key, value)
      } catch (error) {
        console.error('❌ Error writing to storage:', error)
      }
    },
    removeItem: (key: string): void => {
      try {
        localStorage.removeItem(key)
      } catch (error) {
        console.error('❌ Error removing from storage:', error)
      }
    }
  }
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

    console.log('🔗 Initializing Supabase client with URL:', supabaseUrl)
    
    // Use normal localStorage for session persistence across browser windows
    const storageAdapter = process.client ? createNormalStorage() : undefined
    
    supabaseInstance = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        storage: storageAdapter as any // Custom storage adapter für fenster-spezifische Sessions
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

  console.log('🔐 DEBUG: Incoming headers:', {
    authHeader: authHeader ? '✓ Present' : '✗ Missing',
    authHeaderFirst50: authHeader.substring(0, 50)
  })

  if (authHeader.startsWith('Bearer ')) {
    accessToken = authHeader.substring(7)
    console.log('🔐 DEBUG: Extracted token from Authorization header:', accessToken ? `✓ (${accessToken.length} chars)` : '✗')
  }

  console.log('🔐 DEBUG: Final accessToken:', accessToken ? `✓ Found (${accessToken.length} chars)` : '✗ Not found')

  // Create Supabase client with the access token if available
  let headers: Record<string, string> = {}
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`
    console.log('🔐 DEBUG: Using Bearer token auth')
  } else {
    console.log('🔐 DEBUG: Using anon key auth (no token found)')
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