// plugins/tenant-branding.client.ts
// Client-side Plugin für automatisches Tenant-Branding
export default defineNuxtPlugin(async () => {
  const { $router } = useNuxtApp()
  const { loadTenantBranding, loadTenantBrandingById } = useTenantBranding()
  const { setTenantThemeSettings, initializeTheme } = useUIStore()

  // Tenant aus User-Session oder Route bestimmen
  const getTenantInfo = async (route?: any) => {
    const currentRoute = route || $router?.currentRoute?.value
    
    // 1. Prüfe Login-Seiten mit Tenant-Slug
    if (currentRoute?.name === 'login-tenant' && currentRoute?.params?.tenant) {
      return { type: 'slug', value: currentRoute.params.tenant as string }
    }
    
    // 2. Für alle anderen Seiten: Verwende Tenant-ID des eingeloggten Users
    if (process.client) {
      try {
        const { currentUser } = useCurrentUser()
        await nextTick() // Warte bis User geladen ist
        
        if (currentUser.value?.tenant_id) {
          console.log('🎨 Using tenant_id from current user:', currentUser.value.tenant_id)
          return { type: 'id', value: currentUser.value.tenant_id }
        }
      } catch (error) {
        console.log('⚠️ Could not get user tenant_id:', error)
      }
    }
    
    return null
  }

  // Branding laden basierend auf Tenant-Info
  const initializeBranding = async () => {
    try {
      const tenantInfo = await getTenantInfo()
      
      if (tenantInfo) {
        console.log('🎨 Initializing tenant branding:', tenantInfo)
        
        // Tenant-Branding laden (by ID oder by slug)
        if (tenantInfo.type === 'id') {
          await loadTenantBrandingById(tenantInfo.value)
        } else {
          await loadTenantBranding(tenantInfo.value)
        }
        
        // Theme-Einstellungen aus Tenant-Daten übernehmen
        const branding = useTenantBranding().currentTenantBranding.value
        if (branding) {
          setTenantThemeSettings({
            defaultTheme: branding.defaultTheme,
            allowThemeSwitch: branding.allowThemeSwitch
          })
          
          console.log('✅ Tenant branding applied successfully for:', branding.name)
        }
      } else {
        console.log('🎨 Initializing standard theme (no tenant context)')
      }
      
      // Theme initialisieren
      initializeTheme()
      
    } catch (error) {
      console.error('❌ Failed to initialize tenant branding:', error)
      
      // Fallback: Standard-Theme laden
      initializeTheme()
    }
  }

  // Branding bei Route-Wechsel aktualisieren
  const handleRouteChange = async (to: any) => {
    // Skip preloading on the login slug route; the page handles its own branding and errors
    if (to?.name === 'login-tenant') {
      return
    }
    const newTenantInfo = await getTenantInfo(to)
    const currentBranding = useTenantBranding().currentTenantBranding.value
    
    // Nur neu laden wenn sich der Tenant geändert hat
    if (newTenantInfo && (!currentBranding || 
        (newTenantInfo.type === 'id' && currentBranding.id !== newTenantInfo.value) ||
        (newTenantInfo.type === 'slug' && currentBranding.slug !== newTenantInfo.value))) {
      console.log('🔄 Tenant changed, updating branding:', newTenantInfo)
      
      if (newTenantInfo.type === 'id') {
        await loadTenantBrandingById(newTenantInfo.value)
      } else {
        await loadTenantBranding(newTenantInfo.value)
      }
    }
  }

  // Router-Hooks registrieren - wait for router to be ready
  const setupRouterGuard = () => {
    try {
      if ($router && $router.beforeEach) {
        $router.beforeEach(async (to, from, next) => {
          await handleRouteChange(to)
          next()
        })
        console.log('✅ Router guard for tenant branding registered')
      } else {
        // Router not ready yet, try again later
        setTimeout(setupRouterGuard, 100)
      }
    } catch (err) {
      console.log('⚠️ Router not ready yet for tenant branding hooks, retrying...')
      setTimeout(setupRouterGuard, 100)
    }
  }
  
  // Start trying to setup router guard
  setupRouterGuard()

  // DEAKTIVIERT: Automatisches Laden wird von den Layouts gesteuert
  // setTimeout(async () => {
  //   await initializeBranding()
  // }, 100)

  return {
    provide: {
      tenantBranding: {
        getTenantInfo,
        initializeBranding,
        handleRouteChange
      }
    }
  }
})
