<template>
  <div class="admin-layout min-h-screen flex flex-col">
    <!-- Trial Banner -->
    <TrialBanner />

    <!-- ═══ HEADER ═══ -->
    <header
      class="sticky top-0 z-50 text-white"
      :style="{ background: `linear-gradient(135deg, ${primaryColor || '#1e293b'} 0%, ${secondaryColor || '#334155'} 100%)` }"
    >
      <div class="mx-auto px-3 sm:px-5 h-14 flex items-center justify-between gap-3">

        <!-- Hamburger (always left) -->
        <button @click="showMobileMenu = !showMobileMenu"
          class="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-white/20 transition-colors flex-shrink-0"
          type="button">
          <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path v-if="!showMobileMenu" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
            <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>

        <!-- Brand -->
        <NuxtLink to="/admin" class="flex items-center gap-2.5 flex-shrink-0 min-w-0 group">
          <div class="w-7 h-7 rounded-lg overflow-hidden flex-shrink-0 bg-white/20 flex items-center justify-center">
            <img v-if="tenantLogo" :src="tenantLogo" :alt="tenantName" class="w-full h-full object-cover" />
            <svg v-else class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3z"/>
            </svg>
          </div>
          <span class="font-bold text-sm text-white leading-tight truncate max-w-[140px] sm:max-w-[200px] group-hover:opacity-80 transition-opacity">
            <span v-if="tenantName && !isLoading">{{ tenantName }}</span>
            <span v-else-if="isLoading" class="opacity-60 animate-pulse">Lade…</span>
            <span v-else class="opacity-80">Admin</span>
          </span>
        </NuxtLink>

        <!-- Spacer -->
        <div class="flex-1"></div>

        <!-- Right: Date + Logout + Mobile Trigger -->
        <div class="flex items-center gap-2 flex-shrink-0">
          <!-- Date (only large screens) -->
          <span class="hidden xl:block text-xs text-white/60 font-medium pr-1">
            {{ new Date().toLocaleDateString('de-CH', { weekday: 'short', day: '2-digit', month: '2-digit' }) }}
          </span>

          <!-- Settings shortcut -->
          <NuxtLink to="/admin/profile" title="Einstellungen"
            class="flex w-8 h-8 rounded-lg items-center justify-center hover:bg-white/20 transition-colors"
            :class="isActive('/admin/profile') ? 'bg-white/30' : ''">
            <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
          </NuxtLink>

          <!-- Logout -->
          <button @click="handleLogout" title="Abmelden"
            class="flex w-8 h-8 rounded-lg items-center justify-center hover:bg-red-500/60 transition-colors text-white">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
            </svg>
          </button>

        </div>
      </div>
    </header>

    <!-- ═══ MOBILE DRAWER ═══ -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="showMobileMenu" class="fixed inset-0 z-40" @click="showMobileMenu = false">
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
      </div>
    </Transition>

    <Transition
      enter-active-class="transition-transform duration-250 ease-out"
      enter-from-class="-translate-x-full"
      enter-to-class="translate-x-0"
      leave-active-class="transition-transform duration-200 ease-in"
      leave-from-class="translate-x-0"
      leave-to-class="-translate-x-full"
    >
      <div v-if="showMobileMenu"
        class="fixed top-0 left-0 bottom-0 z-50 w-72 flex flex-col shadow-2xl"
        :style="{ background: `linear-gradient(180deg, ${primaryColor || '#1e293b'} 0%, ${secondaryColor || '#334155'} 100%)` }"
        @click.stop
      >
        <!-- Drawer Header -->
        <div class="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-xl overflow-hidden bg-white/20 flex items-center justify-center flex-shrink-0">
              <img v-if="tenantLogo" :src="tenantLogo" :alt="tenantName" class="w-full h-full object-cover" />
              <svg v-else class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3z"/>
              </svg>
            </div>
            <div>
              <p class="text-sm font-bold text-white">{{ tenantName }}</p>
              <p class="text-xs text-white/50">Admin Panel</p>
            </div>
          </div>
          <button @click="showMobileMenu = false" class="w-8 h-8 rounded-lg hover:bg-white/20 flex items-center justify-center text-white/70 transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <!-- Drawer Nav -->
        <nav class="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
          <template v-if="!featuresLoading">
            <p class="text-xs font-bold text-white/40 uppercase tracking-widest px-3 pt-2 pb-1">Hauptbereich</p>
            <NuxtLink to="/admin" @click="showMobileMenu = false"
              class="drawer-link" :class="isActive('/admin') && !isActive('/admin/') ? '' : (route.path === '/admin' ? 'drawer-active' : '')">
              Dashboard
            </NuxtLink>
            <NuxtLink v-if="shouldShowNavLink('invoices_enabled')" to="/admin/payment-overview" @click="showMobileMenu = false"
              class="drawer-link" :class="isActive('/admin/payment-overview') ? 'drawer-active' : ''">Zahlungen</NuxtLink>
            <NuxtLink v-if="shouldShowNavLink('invoices_enabled')" to="/admin/invoices" @click="showMobileMenu = false"
              class="drawer-link" :class="isActive('/admin/invoices') ? 'drawer-active' : ''">Rechnungen</NuxtLink>
            <NuxtLink to="/admin/users" @click="showMobileMenu = false"
              class="drawer-link" :class="isActive('/admin/users') ? 'drawer-active' : ''">Schüler</NuxtLink>

            <NuxtLink to="/admin/student-credits" @click="showMobileMenu = false"
              class="drawer-link" :class="isActive('/admin/student-credits') ? 'drawer-active' : ''">Guthaben</NuxtLink>

            <p class="text-xs font-bold text-white/40 uppercase tracking-widest px-3 pt-4 pb-1">Verwaltung</p>
            <NuxtLink v-if="shouldShowNavLink('courses_enabled')" to="/admin/courses" @click="showMobileMenu = false"
              class="drawer-link" :class="isActive('/admin/courses') ? 'drawer-active' : ''">Kurse</NuxtLink>
            <NuxtLink v-if="shouldShowNavLink('cash_management_enabled')" to="/admin/cash-management" @click="showMobileMenu = false"
              class="drawer-link" :class="isActive('/admin/cash-management') ? 'drawer-active' : ''">Kassen</NuxtLink>
            <NuxtLink v-if="shouldShowNavLink('cancellation_management_enabled')" to="/admin/cancellation-management" @click="showMobileMenu = false"
              class="drawer-link" :class="isActive('/admin/cancellation-management') ? 'drawer-active' : ''">Absagen</NuxtLink>
            <NuxtLink v-if="shouldShowNavLink('staff_hours_enabled')" to="/admin/staff-hours" @click="showMobileMenu = false"
              class="drawer-link" :class="isActive('/admin/staff-hours') ? 'drawer-active' : ''">Stunden</NuxtLink>
            <NuxtLink to="/admin/payment-reminders" @click="showMobileMenu = false"
              class="drawer-link" :class="isActive('/admin/payment-reminders') ? 'drawer-active' : ''">Erinnerungen</NuxtLink>

            <p class="text-xs font-bold text-white/40 uppercase tracking-widest px-3 pt-4 pb-1">Weitere</p>
            <NuxtLink v-if="shouldShowNavLink('product_sales_enabled')" to="/admin/products" @click="showMobileMenu = false"
              class="drawer-link" :class="isActive('/admin/products') ? 'drawer-active' : ''">Produkte</NuxtLink>
            <NuxtLink v-if="shouldShowNavLink('data_management_enabled')" to="/admin/data-management" @click="showMobileMenu = false"
              class="drawer-link" :class="isActive('/admin/data-management') ? 'drawer-active' : ''">Datenverwaltung</NuxtLink>
            <NuxtLink v-if="shouldShowNavLink('discounts_enabled')" to="/admin/discounts" @click="showMobileMenu = false"
              class="drawer-link" :class="isActive('/admin/discounts') ? 'drawer-active' : ''">Rabatte</NuxtLink>
            <NuxtLink v-if="shouldShowNavLink('discounts_enabled')" to="/admin/packages" @click="showMobileMenu = false"
              class="drawer-link" :class="isActive('/admin/packages') ? 'drawer-active' : ''">Pakete</NuxtLink>
            <NuxtLink v-if="shouldShowNavLink('categories_enabled')" to="/admin/categories" @click="showMobileMenu = false"
              class="drawer-link" :class="isActive('/admin/categories') ? 'drawer-active' : ''">Kategorien</NuxtLink>
            <NuxtLink v-if="shouldShowNavLink('examiners_enabled')" to="/admin/examiners" @click="showMobileMenu = false"
              class="drawer-link" :class="isActive('/admin/examiners') ? 'drawer-active' : ''">Experten</NuxtLink>
            <NuxtLink v-if="shouldShowNavLink('evaluations_enabled')" to="/admin/evaluation-system" @click="showMobileMenu = false"
              class="drawer-link" :class="isActive('/admin/evaluation-system') ? 'drawer-active' : ''">Bewertungen</NuxtLink>
            <NuxtLink v-if="shouldShowNavLink('exams_enabled')" to="/admin/exam-statistics" @click="showMobileMenu = false"
              class="drawer-link" :class="isActive('/admin/exam-statistics') ? 'drawer-active' : ''">Prüfungen</NuxtLink>
            <NuxtLink v-if="shouldShowNavLink('affiliate_enabled')" to="/admin/affiliate" @click="showMobileMenu = false"
              class="drawer-link" :class="isActive('/admin/affiliate') ? 'drawer-active' : ''">Affiliate</NuxtLink>
            <NuxtLink to="/admin/pricing" @click="showMobileMenu = false"
              class="drawer-link" :class="isActive('/admin/pricing') ? 'drawer-active' : ''">Preise</NuxtLink>
            <NuxtLink to="/admin/cron-status" @click="showMobileMenu = false; onNav('/admin/cron-status')"
              class="drawer-link" :class="isActive('/admin/cron-status') ? 'drawer-active' : ''">Cron Status</NuxtLink>
          </template>
          <div v-else class="flex items-center justify-center py-8 text-white/50 text-sm gap-2">
            <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
            Lade Navigation…
          </div>
        </nav>

        <!-- Drawer Footer -->
        <div class="border-t border-white/10 p-3 space-y-1">
          <NuxtLink to="/admin/profile" @click="showMobileMenu = false"
            class="drawer-link" :class="isActive('/admin/profile') ? 'drawer-active' : ''">
            <svg class="w-4 h-4 mr-2 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/></svg>
            Einstellungen
          </NuxtLink>
          <button @click="handleLogout"
            class="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-red-300 hover:bg-red-500/20 hover:text-red-200 transition-colors text-left">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
            Abmelden
          </button>
        </div>
      </div>
    </Transition>

    <!-- ═══ MAIN CONTENT ═══ -->
    <main class="flex-1 bg-gray-50/60">
      <slot />
    </main>

    <!-- ═══ FOOTER ═══ -->
    <footer class="border-t border-white/10 py-3"
      :style="{ background: `linear-gradient(135deg, ${primaryColor || '#1e293b'} 0%, ${secondaryColor || '#334155'} 100%)` }">
      <div class="mx-auto px-4 sm:px-6">
        <div class="text-center text-xs text-white/50">
          <span>Powered by <a href="https://simy.ch" target="_blank" rel="noopener" class="hover:text-white/80 transition-colors">Simy.ch</a></span>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, watch, watchEffect, nextTick } from 'vue'
import { useRoute } from '#app'

const route = useRoute()
const showMobileMenu = ref(false)
const showFooterDropdown = ref(false)

// Auth Store für Logout
const { logout } = useAuthStore()
const { showSuccess, showError } = useUIStore()
const supabase = getSupabase()

// Current User für Tenant-Info
const { currentUser } = useCurrentUser()

// Features für dynamische Navigation
const { isEnabled, isLoading: featuresLoading, load: loadFeatures } = useFeatures()

// Tenant Branding
const { 
  currentTenantBranding, 
  brandName, 
  primaryColor, 
  secondaryColor,
  getLogo,
  loadTenantBrandingById,
  isLoading: isTenantLoading
} = useTenantBranding()

// Loading State für UI - nur während tatsächlichem Laden
const isLoading = computed(() => isTenantLoading.value && !currentTenantBranding.value)

// Computed für Tenant-Daten mit Fallbacks
const tenantName = computed(() => {
  // Versuche verschiedene Quellen für den Tenant-Namen
  return currentTenantBranding.value?.name || 
         currentTenantBranding.value?.meta?.brandName ||
         brandName.value || 
         currentUser.value?.tenant_name ||  // Falls direkt im User gespeichert
         'Admin Dashboard'  // Generischer Fallback
})

const tenantLogo = computed(() => getLogo('square'))

const tenantContact = computed(() => ({
  email: currentTenantBranding.value?.contact?.email || 
         currentUser.value?.tenant_email ||  // Falls im User gespeichert
         'support@example.com',
  phone: currentTenantBranding.value?.contact?.phone || 
         currentUser.value?.tenant_phone ||  // Falls im User gespeichert
         '+41 44 123 45 67',
  address: currentTenantBranding.value?.contact?.address
}))

const tenantWebsite = computed(() => currentTenantBranding.value?.social?.website)
const tenantSocial = computed(() => currentTenantBranding.value?.social || {})

// Tenant-Branding und Logo preloading laden wenn User verfügbar ist
watch(() => currentUser.value?.tenant_id, async (tenantId) => {
  if (tenantId && (!currentTenantBranding.value || currentTenantBranding.value.id !== tenantId)) {
    logger.debug('🎨 Loading tenant branding for user tenant_id:', tenantId)
    try {
      await loadTenantBrandingById(tenantId)
      logger.debug('✅ Tenant branding loaded:', currentTenantBranding.value?.name)
      
      // Preload tenant logo for instant loading in components
      const { getTenantLogo } = useLoadingLogo()
      try {
        const logoUrl = await getTenantLogo(tenantId)
        logger.debug('⚡ Admin layout: Preloaded tenant logo:', logoUrl)
      } catch (err) {
        console.warn('⚠️ Admin layout: Failed to preload logo:', err)
      }
    } catch (error) {
      console.error('❌ Failed to load tenant branding:', error)
    }
  }
}, { immediate: true })

// Watch für Branding-Änderungen - Header und Footer automatisch aktualisieren
watch(() => currentTenantBranding.value, (newBranding) => {
  if (newBranding) {
    logger.debug('🔄 Tenant branding updated, refreshing layout colors:', newBranding.name)
    logger.debug('🎨 Raw branding colors:', newBranding.colors)
    // Trigger reactivity für computed properties
    nextTick(() => {
      logger.debug('✨ Layout colors updated:', {
        primary: primaryColor.value,
        secondary: secondaryColor.value,
        rawPrimary: newBranding.colors?.primary,
        rawSecondary: newBranding.colors?.secondary
      })
    })
  }
}, { deep: true })

// Watch für Farb-Änderungen separat (für bessere Reaktivität)
watch([primaryColor, secondaryColor], ([newPrimary, newSecondary]) => {
  logger.debug('🎨 Layout colors changed:', {
    primary: newPrimary,
    secondary: newSecondary,
    tenant: currentTenantBranding.value?.name
  })
}, { immediate: true })

// Check if current route matches
const isActive = (path) => {
  if (path === '/admin') {
    return route.path === '/admin'
  }
  return route.path.startsWith(path)
}

// Feature-based navigation visibility
const shouldShowNavLink = (featureKey) => {
  // Don't show links while features are loading
  if (featuresLoading.value) {
    return false
  }
  
  // For all features, use feature flags with default to true
  // The useFeatures composable already handles business_type filtering
  return isEnabled(featureKey, true)
}

// Force navigation helper (avoids rare NuxtLink preventions/overlays)
const onNav = async (to) => {
  try {
    showMobileMenu.value = false
    await navigateTo(to)
  } catch (e) {
    console.error('Nav error:', e)
  }
}

const onFooterNav = async (to) => {
  try {
    showFooterDropdown.value = false
    await navigateTo(to)
  } catch (e) {
    console.error('Footer nav error:', e)
  }
}

// Debug: Log when menu state changes
watch(() => showMobileMenu.value, (newValue) => {
  logger.debug('📱 Mobile menu state:', newValue)
})

// Simple watch for route changes
watchEffect(() => {
  // Close menus when route changes
  if (route.path) {
    showMobileMenu.value = false
    showFooterDropdown.value = false
  }
})

// Load features when user is available
watchEffect(async () => {
  if (currentUser.value?.tenant_id) {
    logger.debug('🔧 Loading features for navigation')
    await loadFeatures()
  }
})

// Logout function
const handleLogout = async () => {
  try {
    logger.debug('🚪 Logging out user...')
    await logout()
    showSuccess('Abgemeldet', 'Sie wurden erfolgreich abgemeldet.')
    
    // Weiterleitung zur Tenant-Login-Seite (immer tenant-spezifisch)
    const { getLoginPath } = await import('~/utils/redirect-to-login')
    const slug = currentTenantBranding.value?.slug
    await navigateTo(getLoginPath(slug))
  } catch (error) {
    console.error('❌ Logout error:', error)
    showError('Fehler', 'Fehler beim Abmelden. Bitte versuchen Sie es erneut.')
    // Trotzdem weiterleiten (Tenant falls verfügbar)
    const { getLoginPath } = await import('~/utils/redirect-to-login')
    const slug = currentTenantBranding.value?.slug
    await navigateTo(getLoginPath(slug))
  }
}

</script>

<style scoped>
.admin-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* Desktop nav links */
.nav-link {
  @apply px-3 py-1.5 rounded-lg text-sm font-medium text-white/80 hover:text-white hover:bg-white/15 transition-all duration-150 whitespace-nowrap;
}
.nav-active {
  @apply bg-white/25 text-white;
}

/* Mobile drawer links */
.drawer-link {
  @apply flex items-center w-full px-3 py-2.5 rounded-xl text-sm font-medium text-white/75 hover:text-white hover:bg-white/15 transition-all duration-150;
}
.drawer-active {
  @apply bg-white/20 text-white;
}

/* Footer secondary links */
.footer-link {
  @apply text-xs text-white/50 hover:text-white/80 transition-colors font-medium;
}

.admin-footer {
  box-shadow: 0 -2px 4px rgba(0,0,0,0.1);
  backdrop-filter: blur(8px);
}

/* Smooth transitions */
.transition-colors {
  transition: background-color 0.2s ease, color 0.2s ease;
}

/* Mobile menu specific styles */
@media (max-width: 768px) {
  .container {
    padding-left: 1rem;
    padding-right: 1rem;
  }
  
  .admin-main {
    padding-top: 0.5rem;
  }
}

/* Z-index layers */
.z-50 {
  z-index: 50;
}

.z-40 {
  z-index: 40;
}

/* ✅ NUR INPUT-FELDER UND DROPDOWNS: Weiße Schrift, normale Texte bleiben unverändert */
input[type="text"],
input[type="email"], 
input[type="password"],
input[type="number"],
input[type="tel"],
input[type="url"],
input[type="search"],
input[type="date"],
input[type="time"],
input[type="datetime-local"],
select,
textarea {
  color: white !important;
  background-color: #374151 !important;
  border-color: #6b7280 !important;
}

/* Placeholder-Texte bleiben grau */
input::placeholder,
textarea::placeholder {
  color: #9ca3af !important;
}

/* Select-Optionen */
select option {
  color: white !important;
  background-color: #374151 !important;
}

/* Custom Select-Styling */
select {
  -webkit-appearance: none !important;
  -moz-appearance: none !important;
  appearance: none !important;
  background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6,9 12,15 18,9'%3e%3c/polyline%3e%3c/svg%3e") !important;
  background-repeat: no-repeat !important;
  background-position: right 12px center !important;
  background-size: 16px !important;
  padding-right: 40px !important;
}

/* Focus States */
input:focus,
select:focus,
textarea:focus {
  outline: none !important;
  border-color: #10b981 !important;
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2) !important;
  color: white !important;
  background-color: #374151 !important;
}

/* Spezielle Behandlung für disabled Felder */
.admin-layout input:disabled,
.admin-layout select:disabled,
.admin-layout textarea:disabled,
.admin-main input:disabled,
.admin-main select:disabled,
.admin-main textarea:disabled,
input:disabled,
select:disabled,
textarea:disabled {
  background-color: #4b5563 !important; /* gray-600 */
  color: #9ca3af !important; /* gray-400 */
  border-color: #6b7280 !important;
}

/* Focus States - Weiße Schrift beim Fokus */
.admin-layout input:focus,
.admin-layout select:focus,
.admin-layout textarea:focus,
.admin-main input:focus,
.admin-main select:focus,
.admin-main textarea:focus,
input:focus,
select:focus,
textarea:focus {
  outline: none !important;
  border-color: #10b981 !important; /* green-500 */
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2) !important;
  color: white !important;
  background-color: #374151 !important;
}

/* ✅ SPEZIFISCHE REGELN FÜR ADMIN-MODALS - HÖHERE SPEZIFITÄT */
/* Diese Regeln gelten für alle Modals in Admin-Seiten */
.admin-layout div[class*="fixed inset-0"] input[type="text"],
.admin-layout div[class*="fixed inset-0"] input[type="email"], 
.admin-layout div[class*="fixed inset-0"] input[type="password"],
.admin-layout div[class*="fixed inset-0"] input[type="number"],
.admin-layout div[class*="fixed inset-0"] input[type="tel"],
.admin-layout div[class*="fixed inset-0"] input[type="url"],
.admin-layout div[class*="fixed inset-0"] input[type="search"],
.admin-layout div[class*="fixed inset-0"] input[type="date"],
.admin-layout div[class*="fixed inset-0"] input[type="time"],
.admin-layout div[class*="fixed inset-0"] input[type="datetime-local"],
.admin-layout div[class*="fixed inset-0"] select,
.admin-layout div[class*="fixed inset-0"] textarea,
.admin-layout div[class*="fixed inset-0"] input,
div.admin-modal input[type="text"],
div.admin-modal input[type="email"], 
div.admin-modal input[type="password"],
div.admin-modal input[type="number"],
div.admin-modal input[type="tel"],
div.admin-modal input[type="url"],
div.admin-modal input[type="search"],
div.admin-modal input[type="date"],
div.admin-modal input[type="time"],
div.admin-modal input[type="datetime-local"],
div.admin-modal select,
div.admin-modal textarea,
div.admin-modal input {
  color: white !important;
  background-color: #374151 !important; /* gray-700 */
  border-color: #6b7280 !important; /* gray-500 */
}

/* Noch höhere Spezifität für hartnäckige Inputs */
body .admin-layout div[class*="fixed inset-0"] input,
body .admin-layout div[class*="fixed inset-0"] select,
body .admin-layout div[class*="fixed inset-0"] textarea,
body div.admin-modal input,
body div.admin-modal select,
body div.admin-modal textarea {
  color: white !important;
  background-color: #374151 !important; /* gray-700 */
  border-color: #6b7280 !important; /* gray-500 */
}

/* Placeholder-Texte bleiben grau - in Admin-Modals */
.admin-layout div[class*="fixed inset-0"] input::placeholder,
.admin-layout div[class*="fixed inset-0"] textarea::placeholder,
div.admin-modal input::placeholder,
div.admin-modal textarea::placeholder,
body .admin-layout div[class*="fixed inset-0"] input::placeholder,
body .admin-layout div[class*="fixed inset-0"] textarea::placeholder,
body div.admin-modal input::placeholder,
body div.admin-modal textarea::placeholder {
  color: #9ca3af !important; /* gray-400 */
}

/* Select-Optionen - in Admin-Modals */
.admin-layout div[class*="fixed inset-0"] select option,
div.admin-modal select option,
body .admin-layout div[class*="fixed inset-0"] select option,
body div.admin-modal select option {
  color: white !important;
  background-color: #374151 !important; /* gray-700 */
}

/* Custom Select-Styling - in Admin-Modals */
.admin-layout div[class*="fixed inset-0"] select,
div.admin-modal select,
body .admin-layout div[class*="fixed inset-0"] select,
body div.admin-modal select {
  -webkit-appearance: none !important;
  -moz-appearance: none !important;
  appearance: none !important;
  background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6,9 12,15 18,9'%3e%3c/polyline%3e%3c/svg%3e") !important;
  background-repeat: no-repeat !important;
  background-position: right 12px center !important;
  background-size: 16px !important;
  padding-right: 40px !important;
}

/* Focus States - in Admin-Modals */
.admin-layout div[class*="fixed inset-0"] input:focus,
.admin-layout div[class*="fixed inset-0"] select:focus,
.admin-layout div[class*="fixed inset-0"] textarea:focus,
div.admin-modal input:focus,
div.admin-modal select:focus,
div.admin-modal textarea:focus,
body .admin-layout div[class*="fixed inset-0"] input:focus,
body .admin-layout div[class*="fixed inset-0"] select:focus,
body .admin-layout div[class*="fixed inset-0"] textarea:focus,
body div.admin-modal input:focus,
body div.admin-modal select:focus,
body div.admin-modal textarea:focus {
  outline: none !important;
  border-color: #10b981 !important; /* green-500 */
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2) !important;
  color: white !important;
  background-color: #374151 !important;
}

/* ✅ ULTIMATIVE REGEL FÜR ALLE ADMIN-INPUTS */
/* Fängt alle Inputs in Admin-Seiten ab, die andere Regeln übersehen haben */
.admin-layout input,
.admin-layout select,
.admin-layout textarea {
  color: white !important;
  background-color: #374151 !important; /* gray-700 */
  border-color: #6b7280 !important; /* gray-500 */
}

/* Spezielle Regel für weiße Modal-Hintergründe */
.admin-layout .bg-white input,
.admin-layout .bg-white select,
.admin-layout .bg-white textarea {
  color: white !important;
  background-color: #374151 !important; /* gray-700 */
  border-color: #6b7280 !important; /* gray-500 */
}

/* Override für alle möglichen Tailwind-Klassen */
.admin-layout input[class*="text-gray"],
.admin-layout select[class*="text-gray"],
.admin-layout textarea[class*="text-gray"],
.admin-layout input[class*="bg-gray"],
.admin-layout select[class*="bg-gray"],
.admin-layout textarea[class*="bg-gray"],
.admin-layout input[class*="bg-white"],
.admin-layout select[class*="bg-white"],
.admin-layout textarea[class*="bg-white"] {
  color: white !important;
  background-color: #374151 !important; /* gray-700 */
  border-color: #6b7280 !important; /* gray-500 */
}

/* ✅ NUCLEAR OPTION - Überschreibt ALLES */
/* Für hartnäckige Modals, die andere Regeln ignorieren */
html .admin-layout input,
html .admin-layout select, 
html .admin-layout textarea,
html body .admin-layout input,
html body .admin-layout select,
html body .admin-layout textarea {
  color: white !important;
  background-color: #374151 !important; /* gray-700 */
  border-color: #6b7280 !important; /* gray-500 */
}

/* Spezielle Behandlung für Modals */
html .admin-layout div[class*="fixed"] input,
html .admin-layout div[class*="fixed"] select,
html .admin-layout div[class*="fixed"] textarea {
  color: white !important;
  background-color: #374151 !important; /* gray-700 */
  border-color: #6b7280 !important; /* gray-500 */
}

/* Absolute ultimative Regel für alle Eingabefelder */
div.admin-layout input,
div.admin-layout select,
div.admin-layout textarea,
.admin-layout input,
.admin-layout select,
.admin-layout textarea {
  color: white !important;
  background-color: #374151 !important; /* gray-700 */
  border-color: #6b7280 !important; /* gray-500 */
}

</style>