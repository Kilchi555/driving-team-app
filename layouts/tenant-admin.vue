<template>
  <div class="tenant-admin-layout">
    <!-- Tenant Admin Header -->
    <header class="tenant-admin-header bg-blue-900 text-white p-4">
      <div class="container mx-auto flex justify-between items-center">
        <div class="flex items-center gap-4">
          <NuxtLink
            to="/tenant-admin"
            class="font-bold text-xl hover:text-blue-200 transition-colors"
          >
            Tenant Admin
          </NuxtLink>
          
          <!-- Navigation -->
          <nav class="hidden md:flex items-center gap-6 text-sm">
            <NuxtLink
              to="/tenant-admin/tenants"
              class="text-blue-200 hover:text-white transition-colors"
            >
              Tenants
            </NuxtLink>
            <NuxtLink
              to="/tenant-admin/analytics"
              class="text-blue-200 hover:text-white transition-colors"
            >
              Analytics
            </NuxtLink>
            <NuxtLink
              to="/tenant-admin/business-types"
              class="text-blue-200 hover:text-white transition-colors"
            >
              Business-Types
            </NuxtLink>
          </nav>
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-4">
          <!-- User Info with Dropdown -->
          <div class="relative group">
            <button class="flex items-center gap-2 hover:bg-blue-800 px-3 py-2 rounded-lg transition-colors">
              <div class="w-8 h-8 bg-blue-700 rounded-full flex items-center justify-center">
                <span class="text-sm font-medium">SA</span>
              </div>
              <span class="hidden md:block text-sm">Super Admin</span>
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
              </svg>
            </button>
            
            <!-- Dropdown Menu -->
            <div class="absolute right-0 mt-0 w-48 bg-white text-gray-900 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
              <button
                @click="handleLogout"
                class="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 text-red-600 rounded-lg"
              >
                Abmelden
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="tenant-admin-main min-h-screen bg-gray-50">
      <slot />
    </main>

    <!-- Footer -->
    <footer class="tenant-admin-footer bg-gray-800 text-white py-6">
      <div class="container mx-auto px-4">
        <div class="flex flex-col md:flex-row justify-between items-center">
          <div class="text-center md:text-left mb-4 md:mb-0">
            <p class="text-sm text-gray-300">
              Tenant Administration Dashboard
            </p>
            <p class="text-xs text-gray-400 mt-1">
              Verwalte alle Tenants und deren Konfigurationen
            </p>
          </div>
          
          <div class="flex items-center gap-4 text-sm text-gray-300">
            <span>Version 1.0.0</span>
            <span>•</span>
            <span>{{ new Date().getFullYear() }} Driving Team</span>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, navigateTo } from '#app'
import { useAuthStore } from '~/stores/auth'
import { useUIStore } from '~/stores/ui'

const route = useRoute()
const { logout } = useAuthStore()
const { showSuccess, showError } = useUIStore()

// Dynamic page title based on route
const currentPageTitle = computed(() => {
  const path = route.path
  
  if (path === '/tenant-admin') return 'Dashboard'
  if (path === '/tenant-admin/tenants') return 'Tenant Management'
  if (path === '/tenant-admin/tenants/create') return 'Neuer Tenant'
  if (path.startsWith('/tenant-admin/tenants/') && path.includes('/edit')) return 'Tenant bearbeiten'
  if (path.startsWith('/tenant-admin/tenants/') && !path.includes('/edit')) return 'Tenant Details'
  if (path === '/tenant-admin/settings') return 'System Settings'
  if (path === '/tenant-admin/analytics') return 'Analytics'
  
  return 'Tenant Admin'
})

// Logout function
const handleLogout = async () => {
  try {
    await logout()
    showSuccess('Erfolgreich abgemeldet')
    await navigateTo('/login')
  } catch (error) {
    showError('Fehler beim Abmelden: ' + (error?.message || 'Unbekannter Fehler'))
  }
}
</script>

<style scoped>
.tenant-admin-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.tenant-admin-header {
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  position: sticky;
  top: 0;
  z-index: 50;
}

.tenant-admin-main {
  flex: 1;
  padding-top: 1rem;
}

/* Smooth transitions */
.transition-colors {
  transition: background-color 0.2s ease, color 0.2s ease;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .container {
    padding-left: 1rem;
    padding-right: 1rem;
  }
  
  .tenant-admin-main {
    padding-top: 0.5rem;
  }
}
</style>
