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
            to="/admin/products"
            class="px-3 py-2 rounded-md text-sm font-medium transition-colors"
            :class="isActive('/admin/products') ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'"
          >
            Produkte
          </NuxtLink>
          <NuxtLink
            to="/admin/exam-locations"
            class="px-3 py-2 rounded-md text-sm font-medium transition-colors"
            :class="isActive('/admin/exam-locations') ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'"
          >
            Prüfungsorte
          </NuxtLink>
          <NuxtLink
            to="/admin/pricing"
            class="px-3 py-2 rounded-md text-sm font-medium transition-colors"
            :class="isActive('/admin/pricing') ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'"
          >
            Preise
          </NuxtLink>
          <NuxtLink
            to="/admin/payment-overview"
            class="px-3 py-2 rounded-md text-sm font-medium transition-colors"
            :class="isActive('/admin/payment-overview') ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'"
          >
            Zahlungen
          </NuxtLink>
          <NuxtLink
            to="/admin/users"
            class="px-3 py-2 rounded-md text-sm font-medium transition-colors"
            :class="isActive('/admin/users') ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'"
          >
            Benutzer
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
                to="/admin/products"
                @click="showMobileMenu = false"
                class="block px-4 py-3 text-sm font-medium transition-colors hover:bg-gray-700"
                :class="isActive('/admin/products') ? 'bg-gray-900 text-white' : 'text-gray-300 hover:text-white'"
              >
                Produkte
              </NuxtLink>
              <NuxtLink
                to="/admin/exam-locations"
                @click="showMobileMenu = false"
                class="block px-4 py-3 text-sm font-medium transition-colors hover:bg-gray-700"
                :class="isActive('/admin/exam-locations') ? 'bg-gray-900 text-white' : 'text-gray-300 hover:text-white'"
              >
                Prüfungsorte
              </NuxtLink>
              <NuxtLink
                to="/admin/pricing"
                @click="showMobileMenu = false"
                class="block px-4 py-3 text-sm font-medium transition-colors hover:bg-gray-700"
                :class="isActive('/admin/pricing') ? 'bg-gray-900 text-white' : 'text-gray-300 hover:text-white'"
              >
                Preise
              </NuxtLink>
              <NuxtLink
                to="/admin/payment-overview"
                @click="showMobileMenu = false"
                class="block px-4 py-3 text-sm font-medium transition-colors hover:bg-gray-700"
                :class="isActive('/admin/payment-overview') ? 'bg-gray-900 text-white' : 'text-gray-300 hover:text-white'"
              >
                Zahlungen
              </NuxtLink>
              <NuxtLink
                to="/admin/users"
                @click="showMobileMenu = false"
                class="block px-4 py-3 text-sm font-medium transition-colors hover:bg-gray-700"
                :class="isActive('/admin/users') ? 'bg-gray-900 text-white' : 'text-gray-300 hover:text-white'"
              >
                Benutzer
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

    <!-- Mobile Menu Backdrop -->
    <div
      v-if="showMobileMenu"
      @click="showMobileMenu = false"
      class="fixed inset-0 bg-black bg-opacity-25 z-40 md:hidden"
    ></div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
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
}

.admin-header {
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  position: sticky;
  top: 0;
  z-index: 50;
}

.admin-main {
  padding-top: 1rem;
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