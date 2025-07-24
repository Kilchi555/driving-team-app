<template>
  <div class="admin-layout">
    <!-- Admin Header/Navigation -->
    <header class="admin-header bg-gray-800 text-white p-4">
      <div class="container mx-auto flex justify-between items-center">
        <h1 class="text-lg sm:text-xl font-bold">Admin Dashboard</h1>
        <p> {{ new Date().toLocaleDateString('de-CH', { weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit' }) }}</p>
        
        <!-- Desktop Navigation -->
        <nav class="hidden md:flex space-x-1">
          <NuxtLink
            to="/admin"
            class="px-3 py-2 rounded-md text-sm font-medium transition-colors"
            :class="isActive('/admin') ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'"
          >
            🏠 Dashboard
          </NuxtLink>
          <NuxtLink
            to="/admin/exam-locations"
            class="px-3 py-2 rounded-md text-sm font-medium transition-colors"
            :class="isActive('/admin/exam-locations') ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'"
          >
            🏛️ Prüfungsorte
          </NuxtLink>
          <NuxtLink
            to="/admin/pricing"
            class="px-3 py-2 rounded-md text-sm font-medium transition-colors"
            :class="isActive('/admin/pricing') ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'"
          >
            💰 Preise
          </NuxtLink>
          <NuxtLink
            to="/admin/payment-overview"
            class="px-3 py-2 rounded-md text-sm font-medium transition-colors"
            :class="isActive('/admin/payment-overview') ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'"
          >
            💳 Zahlungen
          </NuxtLink>
          <NuxtLink
            to="/admin/users"
            class="px-3 py-2 rounded-md text-sm font-medium transition-colors"
            :class="isActive('/admin/users') ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'"
          >
            👥 Benutzer
          </NuxtLink>
        </nav>

        <!-- Mobile Menu Button -->
        <div class="md:hidden relative">
          <button
            @click="showMobileMenu = !showMobileMenu"
            class="p-2 rounded-md text-gray-300 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-white"
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
            v-if="showMobileMenu"
            class="absolute right-0 top-full mt-2 w-48 bg-gray-800 rounded-lg shadow-lg border border-gray-700 z-50"
          >
            <div class="py-2">
              <NuxtLink
                to="/admin"
                @click="showMobileMenu = false"
                class="block px-4 py-2 text-sm font-medium transition-colors"
                :class="isActive('/admin') ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'"
              >
                🏠 Dashboard
              </NuxtLink>
              <NuxtLink
                to="/admin/exam-locations"
                @click="showMobileMenu = false"
                class="block px-4 py-2 text-sm font-medium transition-colors"
                :class="isActive('/admin/exam-locations') ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'"
              >
                🏛️ Prüfungsorte
              </NuxtLink>
              <NuxtLink
                to="/admin/pricing"
                @click="showMobileMenu = false"
                class="block px-4 py-2 text-sm font-medium transition-colors"
                :class="isActive('/admin/pricing') ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'"
              >
                💰 Preise
              </NuxtLink>
              <NuxtLink
                to="/admin/payment-overview"
                @click="showMobileMenu = false"
                class="block px-4 py-2 text-sm font-medium transition-colors"
                :class="isActive('/admin/payment-overview') ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'"
              >
                💳 Zahlungen
              </NuxtLink>
              <NuxtLink
                to="/admin/users"
                @click="showMobileMenu = false"
                class="block px-4 py-2 text-sm font-medium transition-colors"
                :class="isActive('/admin/users') ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'"
              >
                👥 Benutzer
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
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute } from '#app'

const route = useRoute()
const showMobileMenu = ref(false)

// Check if current route matches (with exact match for /admin)
const isActive = (path) => {
  if (path === '/admin') {
    return route.path === '/admin'
  }
  return route.path.startsWith(path)
}

// Close mobile menu when clicking outside
const handleClickOutside = (event) => {
  if (showMobileMenu.value && !event.target.closest('.mobile-menu')) {
    showMobileMenu.value = false
  }
}

// Close mobile menu on route change
watch(() => route.path, () => {
  showMobileMenu.value = false
})

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
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

/* Active link styles */
nav a {
  text-decoration: none;
}

nav a:hover {
  transform: translateY(-1px);
  transition: all 0.2s ease;
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

/* Ensure dropdown is above other content */
.z-50 {
  z-index: 50;
}

.z-40 {
  z-index: 40;
}

/* Mobile dropdown animation */
.mobile-dropdown-enter-active,
.mobile-dropdown-leave-active {
  transition: all 0.2s ease;
}

.mobile-dropdown-enter-from,
.mobile-dropdown-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>