// plugins/tenant-restore.client.ts
export default defineNuxtPlugin(async () => {
  // Nur auf Client-Seite ausführen
  if (process.server) return

  console.log('🔄 Tenant restore plugin starting...')

  try {
    const { currentUser, fetchCurrentUser } = useCurrentUser()
    const { loadTenantBrandingById } = useTenantBranding()

    // Warte bis Auth-State wiederhergestellt ist - nutze Supabase-Modul Client
    const supabase = useSupabaseClient()
    
    // Prüfe ob bereits ein User eingeloggt ist
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      console.log('ℹ️ No authenticated user found on reload')
      return
    }

    console.log('✅ Auth user found on reload:', user.email)

    // Lade den Business-User
    await fetchCurrentUser()
    
    if (currentUser.value?.tenant_id) {
      console.log('🎨 Loading tenant branding on reload for tenant:', currentUser.value.tenant_id)
      
      // Lade Tenant-Branding
      await loadTenantBrandingById(currentUser.value.tenant_id)
      
      console.log('✅ Tenant branding restored on reload')
    } else {
      console.warn('⚠️ No tenant_id found for user on reload')
    }

  } catch (error) {
    console.error('❌ Error restoring tenant on reload:', error)
  }
})
