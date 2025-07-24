<template>
  <div class="admin-layout">
    <!-- Admin Header/Navigation -->
    <header class="admin-header bg-gray-800 text-white p-4">
      <div class="container mx-auto flex justify-between items-center">
        <h1 class="text-xl font-bold">Admin Dashboard</h1>
        <nav class="flex space-x-1">
          <NuxtLink 
            to="/admin" 
            class="px-3 py-2 rounded-md text-sm font-medium transition-colors"
            :class="isActive('/admin') ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'"
          >
            🏠 Dashboard
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
      </div>
    </header>

    <!-- Main Content -->
    <main class="admin-main min-h-screen bg-gray-50">
      <slot />
    </main>
  </div>
</template>

<script setup>
import { useRoute } from '#app'

const route = useRoute()

// Check if current route matches (with exact match for /admin)
const isActive = (path) => {
  if (path === '/admin') {
    return route.path === '/admin'
  }
  return route.path.startsWith(path)
}
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
</style>