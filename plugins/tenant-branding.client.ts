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
        logger.debug('⚠️ Router not available in getTenantInfo:', e)
        // Router not ready yet
      }
    }
    
    // Skip these paths - they're NOT tenant slugs!
    const nonTenantPaths = [
      '/register-staff',
      '/password-reset',
      '/reset-password',
      '/tenant-register',
      '/tenant-start',
      '/tenant-demo',
      '/customer-dashboard',
      '/dashboard',
      '/login',
      '/register',
      '/auswahl',
      '/shop',
      '/learning',
      '/users',
      '/customers',
      '/upgrade'
    ]
    
    if (currentRoute?.path && nonTenantPaths.includes(currentRoute.path)) {
      logger.debug('🎨 getTenantInfo: Path is not a tenant slug:', currentRoute.path)
      return null
    }
    
    // 1. Prüfe Login-Seiten mit Tenant-Slug in Route-Parametern
    if (currentRoute?.params?.tenant) {
      logger.debug('🎨 getTenantInfo: Found tenant param:', currentRoute.params.tenant, 'from route:', currentRoute.name)
      return { type: 'slug', value: currentRoute.params.tenant as string }
    }
    
    // 1b. Prüfe auch [slug] Route für public pages
    if (currentRoute?.params?.slug && currentRoute?.path && !currentRoute.path.includes('admin') && !currentRoute.path.includes('dashboard')) {
      logger.debug('🎨 getTenantInfo: Found slug param:', currentRoute.params.slug, 'from route:', currentRoute.name)
      return { type: 'slug', value: currentRoute.params.slug as string }
    }
    
    // 2. Für alle anderen Seiten: Verwende Tenant-ID des eingeloggten Users
    if (process.client) {
      try {
        const { currentUser } = useCurrentUser()
        await nextTick() // Warte bis User geladen ist
        
        if (currentUser.value?.tenant_id) {
          logger.debug('🎨 Using tenant_id from current user:', currentUser.value.tenant_id)
          return { type: 'id', value: currentUser.value.tenant_id }
        }
      } catch (error) {
        logger.debug('⚠️ Could not get user tenant_id:', error)
      }
    }
    
    return null
  }

  // Branding laden basierend auf Tenant-Info
  const initializeBranding = async () => {
    try {
      const tenantInfo = await getTenantInfo()
      
      if (tenantInfo) {
        logger.debug('🎨 Initializing tenant branding:', tenantInfo)
        
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
          
          logger.debug('✅ Tenant branding applied successfully for:', branding.name)
        }
      } else {
        logger.debug('🎨 Initializing standard theme (no tenant context)')
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
    logger.debug('🔄 Route changed to:', to?.path, 'params:', to?.params)
    
    const newTenantInfo = await getTenantInfo(to)
    const currentBranding = useTenantBranding().currentTenantBranding.value
    
    logger.debug('🔄 Tenant info detected:', newTenantInfo)
    
    // Nur neu laden wenn sich der Tenant geändert hat
    if (newTenantInfo && (!currentBranding || 
        (newTenantInfo.type === 'id' && currentBranding.id !== newTenantInfo.value) ||
        (newTenantInfo.type === 'slug' && currentBranding.slug !== newTenantInfo.value))) {
      logger.debug('🔄 Tenant changed, updating branding:', newTenantInfo)
      
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
        logger.debug('✅ Registering router guard immediately on plugin load')
        $router.beforeEach(async (to: any, from: any) => {
          logger.debug('🔄 beforeEach guard triggered:', to.path)
          await handleRouteChange(to)
          // Vue Router 4: Just return undefined (or nothing) to proceed
        })
      }
    } catch (e) {
      logger.debug('⚠️ Router not available immediately, will register in app:mounted')
      
      // Fallback: Register in app:mounted hook if not available yet
      nuxtApp.hook('app:mounted', () => {
        const $router = nuxtApp.$router
        
        if ($router && $router.beforeEach) {
          logger.debug('✅ Router guard for tenant branding registered (app:mounted)')
          $router.beforeEach(async (to: any, from: any) => {
            logger.debug('🔄 beforeEach guard triggered (app:mounted):', to.path)
            await handleRouteChange(to)
          })
        } else {
          console.warn('⚠️ Router not available in app:mounted hook')
        }
      })
    }
  }

  // Also load branding initially for current route
  logger.debug('🎨 Loading initial branding on plugin load')
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
