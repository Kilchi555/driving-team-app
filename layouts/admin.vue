<template>
  <div class="admin-layout">
    <!-- Admin Header/Navigation -->
    <header class="admin-header bg-gray-800 text-white p-2">
      <div class="container mx-auto flex justify-between items-center">
        <div class="flex flex-col sm:flex-row sm:items-center sm:gap-4">
        <NuxtLink
          to="/admin"
          class="font-bold px-3 rounded-md text-lg transition-colors"
          :class="isActive('/admin') ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'"
        >
          Admin Dashboard
        </NuxtLink>        
          <!-- Responsive Datum -->
          <p class="text-sm sm:text-sm text-gray-300 px-3 py-1"> 
            {{ new Date().toLocaleDateString('de-CH', { 
              weekday: 'long', 
              year: 'numeric', 
              month: '2-digit', 
              day: '2-digit' 
            }) }}
          </p>  
          </div>      
        <!-- Desktop Navigation -->
        <nav class="hidden md:flex space-x-1">
          <NuxtLink
            to="/admin/payment-overview"
            class="px-3 py-2 rounded-md text-sm font-medium transition-colors"
            :class="isActive('/admin/payment-overview') ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'"
          >
            Zahlungen
          </NuxtLink>
          <NuxtLink
            to="/admin/invoices"
            class="px-3 py-2 rounded-md text-sm font-medium transition-colors"
            :class="isActive('/admin/invoices') ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'"
          >
            Rechnungen
          </NuxtLink>
          <NuxtLink
            to="/admin/student-credits"
            class="px-3 py-2 rounded-md text-sm font-medium transition-colors"
            :class="isActive('/admin/student-credits') ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'"
          >
            Guthaben
          </NuxtLink>
          <NuxtLink
            to="/admin/cash-control"
            class="px-3 py-2 rounded-md text-sm font-medium transition-colors"
            :class="isActive('/admin/cash-control') ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'"
          >
            Kassenkontrolle
          </NuxtLink>
        </nav>

        <!-- Mobile Menu Button -->
        <div class="md:hidden relative">
          <button
            @click="showMobileMenu = !showMobileMenu"
            class="p-2 rounded-md text-gray-300 hover:text-white hover:bg-gray-700 focus:outline-none transition-colors"
            type="button"
          >
            <svg 
              class="h-6 w-6" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                v-if="!showMobileMenu"
                stroke-linecap="round" 
                stroke-linejoin="round" 
                stroke-width="2" 
                d="M4 6h16M4 12h16M4 18h16" 
              />
              <path 
                v-else
                stroke-linecap="round" 
                stroke-linejoin="round" 
                stroke-width="2" 
                d="M6 18L18 6M6 6l12 12" 
              />
            </svg>
          </button>

          <!-- Mobile Dropdown Menu -->
          <div
            v-show="showMobileMenu"
            class="absolute right-0 top-full mt-2 w-64 bg-gray-800 rounded-lg shadow-xl border border-gray-700 z-50"
            @click.stop
          >
            <div class="py-2">
              <NuxtLink
                to="/admin/payment-overview"
                @click="showMobileMenu = false"
                class="block px-4 py-3 text-sm font-medium transition-colors hover:bg-gray-700"
                :class="isActive('/admin/payment-overview') ? 'bg-gray-900 text-white' : 'text-gray-300 hover:text-white'"
              >
                Zahlungen
              </NuxtLink>
              <NuxtLink
                to="/admin/invoices"
                @click="showMobileMenu = false"
                class="block px-4 py-3 text-sm font-medium transition-colors hover:bg-gray-700"
                :class="isActive('/admin/invoices') ? 'bg-gray-900 text-white' : 'text-gray-300 hover:text-white'"
              >
                Rechnungen
              </NuxtLink>
              <NuxtLink
                to="/admin/student-credits"
                @click="showMobileMenu = false"
                class="block px-4 py-3 text-sm font-medium transition-colors hover:bg-gray-700"
                :class="isActive('/admin/student-credits') ? 'bg-gray-900 text-white' : 'text-gray-300 hover:text-white'"
              >
                Guthaben
              </NuxtLink>
              <NuxtLink
                to="/admin/cash-control"
                @click="showMobileMenu = false"
                class="block px-4 py-3 text-sm font-medium transition-colors hover:bg-gray-700"
                :class="isActive('/admin/cash-control') ? 'bg-gray-900 text-white' : 'text-gray-300 hover:text-white'"
              >
                Kassenkontrolle
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="admin-main min-h-screen bg-gray-50">
      <slot />
    </main>

    <!-- Footer -->
    <footer class="admin-footer bg-gray-800 text-white py-6 mt-auto">
      <div class="container mx-auto px-4">
        <div class="flex flex-col md:flex-row justify-between items-center">
          <!-- Left side - Company info -->
          <div class="mb-4 md:mb-0">
            <div class="flex items-center space-x-2">
              <div class="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <span class="text-lg font-semibold">Driving Team</span>
            </div>
          </div>

          <!-- Center - Quick links -->
          <div class="flex flex-wrap justify-center space-x-6 mb-4 md:mb-0">
            <NuxtLink to="/admin/products" class="text-gray-300 hover:text-white transition-colors text-sm">
              Produkte
            </NuxtLink>
            <NuxtLink to="/admin/discounts" class="text-gray-300 hover:text-white transition-colors text-sm">
              Rabatte
            </NuxtLink>
            <NuxtLink to="/admin/exam-locations" class="text-gray-300 hover:text-white transition-colors text-sm">
              Prüfungsorte
            </NuxtLink>
            <NuxtLink to="/admin/categories" class="text-gray-300 hover:text-white transition-colors text-sm">
              Kategorien
            </NuxtLink>
            <NuxtLink to="/admin/examiners" class="text-gray-300 hover:text-white transition-colors text-sm">
              Experten
            </NuxtLink>
            <NuxtLink to="/admin/pricing" class="text-gray-300 hover:text-white transition-colors text-sm">
              Preise
            </NuxtLink>
            <NuxtLink to="/admin/users" class="text-gray-300 hover:text-white transition-colors text-sm">
              Benutzer
            </NuxtLink>
            <NuxtLink to="/admin/evaluation-system" class="text-gray-300 hover:text-white transition-colors text-sm">
              Bewertungssystem
            </NuxtLink>
          </div>

          <!-- Right side - Version & status -->
          <div class="text-center md:text-right">
            <div class="flex items-center space-x-2 mb-2">
              <div class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span class="text-sm text-gray-300">System Online</span>
            </div>
            <p class="text-xs text-gray-400">v1.0.0 • Admin Panel</p>
          </div>
        </div>

        <!-- Bottom border -->
        <div class="border-t border-gray-700 mt-6 pt-4">
          <div class="flex flex-col md:flex-row justify-between items-center text-sm text-gray-400">
            <span>&copy; 2025 Driving Team. Alle Rechte vorbehalten.</span>
            <div class="flex space-x-4 mt-2 md:mt-0">
              <span>Support: support@drivingteam.ch</span>
              <span>Tel: +41 44 123 45 67</span>
            </div>
          </div>
        </div>
      </div>
    </footer>

    <!-- Mobile Menu Backdrop -->
    <div
      v-if="showMobileMenu"
      @click="showMobileMenu = false"
      class="fixed inset-0 bg-black bg-opacity-25 z-40 md:hidden"
    ></div>
  </div>
</template>

<script setup>
import { ref, watch, watchEffect } from 'vue'
import { useRoute } from '#app'

const route = useRoute()
const showMobileMenu = ref(false)

// Check if current route matches
const isActive = (path) => {
  if (path === '/admin') {
    return route.path === '/admin'
  }
  return route.path.startsWith(path)
}

// Debug: Log when menu state changes
watch(() => showMobileMenu.value, (newValue) => {
  console.log('📱 Mobile menu state:', newValue)
})

// Simple watch for route changes
watchEffect(() => {
  // Close menu when route changes
  if (route.path) {
    showMobileMenu.value = false
  }
})
</script>

<style scoped>
.admin-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.admin-header {
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  position: sticky;
  top: 0;
  z-index: 50;
}

.admin-main {
  padding-top: 1rem;
  flex: 1;
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
</style>