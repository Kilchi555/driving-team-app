// plugins/tenant-restore.client.ts
import { getSupabase } from '~/utils/supabase'
import { pathnameIncludesAffiliateDashboard } from '~/utils/affiliate-dashboard-path'
import { logger } from '~/utils/logger'

export default defineNuxtPlugin(async () => {
  // Nur auf Client-Seite ausführen
  if (process.server) return

  if (typeof window !== 'undefined' && pathnameIncludesAffiliateDashboard(window.location.pathname)) {
    logger.debug('🔄 Tenant restore: übersprungen auf Affiliate-Dashboard (Profil über Supabase-Session)')
    return
  }

  logger.debug('🔄 Tenant restore plugin starting...')

  try {
    const { currentUser, fetchCurrentUser } = useCurrentUser()
    const { loadTenantBrandingById } = useTenantBranding()

    // Warte bis Auth-State wiederhergestellt ist - nutze Supabase-Modul Client
    const supabase = getSupabase()
    
    // Prüfe ob bereits ein User eingeloggt ist
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      logger.debug('ℹ️ No authenticated user found on reload')
      return
    }

    logger.debug('✅ Auth user found on reload:', user.email)

    // Lade den Business-User
    await fetchCurrentUser()
    
    if (currentUser.value?.tenant_id) {
      logger.debug('🎨 Loading tenant branding on reload for tenant:', currentUser.value.tenant_id)
      
      // Lade Tenant-Branding
      await loadTenantBrandingById(currentUser.value.tenant_id)
      
      logger.debug('✅ Tenant branding restored on reload')
    } else {
      console.warn('⚠️ No tenant_id found for user on reload')
    }

  } catch (error) {
    console.error('❌ Error restoring tenant on reload:', error)
  }
})
