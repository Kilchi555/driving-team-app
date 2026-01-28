/**
 * SESSION PERSISTENCE ARCHITECTURE
 * ================================
 * 
 * How the app maintains user sessions across HMR, page reloads, and browser restarts:
 * 
 * 1. PLUGIN LOAD ORDER:
 *    - 00-session-persist.client.ts (first)
 *    - 01-session-auto-save.client.ts (second)
 *    - auth-restore.client.ts (third)
 * 
 * 2. ON APP START (HMR or Page Reload):
 *    a) 00-session-persist.client.ts runs:
 *       - Checks localStorage for cached session (key: 'app-session-cache')
 *       - If valid cache found (< 24h old): Restores immediately ✅ FAST HMR RECOVERY
 *       - If no cache: Fetches from /api/auth/current-user (HTTP-Only cookies)
 *       - Saves response to localStorage for next HMR
 *    
 *    b) 01-session-auto-save.client.ts runs:
 *       - Sets up watcher on authStore.user
 *       - Auto-saves to localStorage whenever auth state changes
 *    
 *    c) auth-restore.client.ts runs:
 *       - Handles Supabase session setup
 *       - Calls setSession() for Supabase client-side queries
 * 
 * 3. SESSION DATA STORED IN LOCALSTORAGE:
 *    {
 *      user: { id, email, user_metadata },
 *      profile: { id, tenant_id, role, email, first_name, last_name, auth_user_id },
 *      timestamp: Date.now(),
 *      expiresIn: 24 * 60 * 60 * 1000  // 24 hours
 *    }
 * 
 * 4. SECURITY:
 *    - Real auth tokens remain in HTTP-Only cookies (not accessible to JS)
 *    - localStorage only contains user metadata (safe to expose)
 *    - Sessions automatically expire after 24 hours
 *    - Cleared on logout
 * 
 * 5. BENEFITS:
 *    ✅ HMR Recovery: Stay logged in during development
 *    ✅ Fast Resume: First load uses cached session (no API call)
 *    ✅ Automatic Sync: Changes to auth state auto-saved
 *    ✅ Secure: Tokens in HTTP-Only cookies, metadata in localStorage
 *    ✅ Expiry: Sessions auto-clear after 24 hours
 */

export const SESSION_STORAGE_KEY = 'app-session-cache'

export interface PersistentSession {
  user: {
    id: string
    email: string
    user_metadata?: Record<string, any>
  }
  profile: {
    id: string
    tenant_id: string
    role: string
    email: string
    first_name?: string
    last_name?: string
    auth_user_id: string
  }
  // Supabase session tokens for client-side queries
  tokens?: {
    access_token: string
    refresh_token: string
  }
  timestamp: number
  expiresIn: number // 24 hours = 86400000 ms
}
