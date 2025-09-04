// utils/supabase.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let supabaseInstance: SupabaseClient | null = null

export const getSupabase = (): SupabaseClient => {
  if (!supabaseInstance) {
    // Handle both client and server environments
    let supabaseUrl: string
    let supabaseKey: string
    
    if (process.server) {
      // Server-side: use environment variables directly
      supabaseUrl = process.env.SUPABASE_URL || 'https://unyjaetebnaexaflpyoc.supabase.co'
      supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVueWphZXRlYm5hZXhhZmxweW9jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAzOTc0NjAsImV4cCI6MjA2NTk3MzQ2MH0.GH3W1FzpogOG-iTWNv8ckt-TkqboCiB9RYGFlGUzLnU'
    } else {
      // Client-side: try to get from window object or fallback to environment variables
      try {
        // Check if we're in a browser environment with runtime config
        if (typeof window !== 'undefined' && (window as any).__NUXT__?.config) {
          const config = (window as any).__NUXT__.config
          supabaseUrl = config.public?.supabaseUrl || 'https://unyjaetebnaexaflpyoc.supabase.co'
          supabaseKey = config.public?.supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVueWphZXRlYm5hZXhhZmxweW9jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAzOTc0NjAsImV4cCI6MjA2NTk3MzQ2MH0.GH3W1FzpogOG-iTWNv8ckt-TkqboCiB9RYGFlGUzLnU'
        } else {
          // Fallback to environment variables
          supabaseUrl = process.env.SUPABASE_URL || 'https://unyjaetebnaexaflpyoc.supabase.co'
          supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVueWphZXRlYm5hZXhhZmxweW9jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAzOTc0NjAsImV4cCI6MjA2NTk3MzQ2MH0.GH3W1FzpogOG-iTWNv8ckt-TkqboCiB9RYGFlGUzLnU'
        }
      } catch (error) {
        // Fallback to environment variables if anything fails
        supabaseUrl = process.env.SUPABASE_URL || 'https://unyjaetebnaexaflpyoc.supabase.co'
        supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVueWphZXRlYm5hZXhhZmxweW9jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAzOTc0NjAsImV4cCI6MjA2NTk3MzQ2MH0.GH3W1FzpogOG-iTWNv8ckt-TkqboCiB9RYGFlGUzLnU'
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
    
    supabaseInstance = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    })
  }
  return supabaseInstance
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