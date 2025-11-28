// plugins/tenant-branding.client.ts
// Client-side Plugin für automatisches Tenant-Branding
export default defineNuxtPlugin(async (nuxtApp) => {
  const { loadTenantBranding, loadTenantBrandingById } = useTenantBranding()
  const { setTenantThemeSettings, initializeTheme } = useUIStore()

  // Tenant aus User-Session oder Route bestimmen
  const getTenantInfo = async (route?: any) => {
    let currentRoute = route
    if (!currentRoute) {
      try {
        // Use nuxtApp.$router instead of useRouter() to avoid setup context issues
        const $router = nuxtApp.$router
        currentRoute = $router?.currentRoute?.value
      } catch (e) {
        console.log('⚠️ Router not available in getTenantInfo:', e)
        // Router not ready yet
      }
    }
    
    // 1. Prüfe Login-Seiten mit Tenant-Slug in Route-Parametern
    if (currentRoute?.params?.tenant) {
      console.log('🎨 getTenantInfo: Found tenant param:', currentRoute.params.tenant, 'from route:', currentRoute.name)
      return { type: 'slug', value: currentRoute.params.tenant as string }
    }
    
    // 1b. Prüfe auch [slug] Route für public pages
    if (currentRoute?.params?.slug && currentRoute?.path && !currentRoute.path.includes('admin') && !currentRoute.path.includes('dashboard')) {
      console.log('🎨 getTenantInfo: Found slug param:', currentRoute.params.slug, 'from route:', currentRoute.name)
      return { type: 'slug', value: currentRoute.params.slug as string }
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
    console.log('🔄 Route changed to:', to?.path, 'params:', to?.params)
    
    const newTenantInfo = await getTenantInfo(to)
    const currentBranding = useTenantBranding().currentTenantBranding.value
    
    console.log('🔄 Tenant info detected:', newTenantInfo)
    
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

  // Router-Hooks registrieren - register IMMEDIATELY on plugin load
  if (process.client) {
    // Try to register guard immediately
    try {
      const $router = nuxtApp.$router
      if ($router && $router.beforeEach) {
        console.log('✅ Registering router guard immediately on plugin load')
        $router.beforeEach(async (to: any, from: any) => {
          console.log('🔄 beforeEach guard triggered:', to.path)
          await handleRouteChange(to)
          // Vue Router 4: Just return undefined (or nothing) to proceed
        })
      }
    } catch (e) {
      console.log('⚠️ Router not available immediately, will register in app:mounted')
      
      // Fallback: Register in app:mounted hook if not available yet
      nuxtApp.hook('app:mounted', () => {
        const $router = nuxtApp.$router
        
        if ($router && $router.beforeEach) {
          console.log('✅ Router guard for tenant branding registered (app:mounted)')
          $router.beforeEach(async (to: any, from: any) => {
            console.log('🔄 beforeEach guard triggered (app:mounted):', to.path)
            await handleRouteChange(to)
          })
        } else {
          console.warn('⚠️ Router not available in app:mounted hook')
        }
      })
    }
  }

  // Also load branding initially for current route
  console.log('🎨 Loading initial branding on plugin load')
  await initializeBranding()

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
