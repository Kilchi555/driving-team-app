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
    
    // These paths don't contain tenant slugs in the URL — skip slug extraction,
    // but still fall through to the auth-store tenant_id lookup below.
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
      '/shop',
      '/learning',
      '/users',
      '/customers',
      '/upgrade',
      '/affiliate-dashboard',
    ]
    
    const isNonTenantPath = !!(currentRoute?.path && nonTenantPaths.includes(currentRoute.path))

    if (!isNonTenantPath) {
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
    }
    
    // 2. Für alle Seiten (inkl. nonTenantPaths): Verwende Tenant-ID des eingeloggten Users
    if (process.client) {
      try {
        // useCurrentUser() creates a new ref(null) instance each time and requires
        // fetchCurrentUser() to be called explicitly — use the auth store directly instead
        const authStore = useAuthStore()
        const tenantId = authStore.userProfile?.tenant_id
        if (tenantId) {
          logger.debug('🎨 Using tenant_id from auth store:', tenantId)
          return { type: 'id', value: tenantId }
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
    const { currentTenantBranding, applyBrandingStyles } = useTenantBranding()
    const currentBranding = currentTenantBranding.value
    
    logger.debug('🔄 Tenant info detected:', newTenantInfo)
    
    if (newTenantInfo) {
      const tenantChanged = !currentBranding ||
        (newTenantInfo.type === 'id' && currentBranding.id !== newTenantInfo.value) ||
        (newTenantInfo.type === 'slug' && currentBranding.slug !== newTenantInfo.value)

      if (tenantChanged) {
        logger.debug('🔄 Tenant changed, updating branding:', newTenantInfo)
        if (newTenantInfo.type === 'id') {
          await loadTenantBrandingById(newTenantInfo.value)
        } else {
          await loadTenantBranding(newTenantInfo.value)
        }
      } else {
        // Branding already correct — re-apply CSS variables to ensure they are
        // present after navigation (e.g. dashboard ↔ customers round-trip).
        logger.debug('🔄 Tenant unchanged, re-applying CSS vars')
        await applyBrandingStyles()
      }
    }
  }

  // Router-Hooks registrieren in app:mounted hook when router is ready
  if (process.client) {
    nuxtApp.hook('app:mounted', () => {
      const $router = nuxtApp.$router
      
      if ($router && $router.beforeEach) {
        logger.debug('✅ Router guard for tenant branding registered (app:mounted)')
        $router.beforeEach(async (to: any, from: any) => {
          logger.debug('🔄 beforeEach guard triggered:', to.path)
          await handleRouteChange(to)
        })
      } else {
        logger.warn('⚠️ Router not available in app:mounted hook')
      }
    })
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
