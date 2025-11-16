// utils/supabase.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let supabaseInstance: SupabaseClient | null = null
let supabaseAdminInstance: SupabaseClient | null = null

// Custom Storage Adapter für fenster-spezifische Sessions
// Jedes Browser-Fenster bekommt eine eigene Session
function createWindowSpecificStorage() {
  if (typeof window === 'undefined') {
    // Fallback für Server-Side: normales localStorage-Verhalten
    return {
      getItem: (key: string) => null,
      setItem: (key: string, value: string) => {},
      removeItem: (key: string) => {}
    }
  }

  // Generiere eine fenster-spezifische ID (bleibt für die Lebensdauer des Fensters)
  let windowId = sessionStorage.getItem('supabase_window_id')
  if (!windowId) {
    windowId = `window_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    sessionStorage.setItem('supabase_window_id', windowId)
  }

  const getStorageKey = (key: string) => `${windowId}_${key}`

  return {
    getItem: (key: string): string | null => {
      try {
        const prefixedKey = getStorageKey(key)
        return localStorage.getItem(prefixedKey)
      } catch (error) {
        console.error('❌ Error reading from storage:', error)
        return null
      }
    },
    setItem: (key: string, value: string): void => {
      try {
        const prefixedKey = getStorageKey(key)
        localStorage.setItem(prefixedKey, value)
      } catch (error) {
        console.error('❌ Error writing to storage:', error)
      }
    },
    removeItem: (key: string): void => {
      try {
        const prefixedKey = getStorageKey(key)
        localStorage.removeItem(prefixedKey)
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
    
    // Use custom storage for client-side to support multiple windows with different users
    const storageAdapter = process.client ? createWindowSpecificStorage() : undefined
    
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