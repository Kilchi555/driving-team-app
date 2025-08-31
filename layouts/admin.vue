<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Navigation Header -->
    <nav class="bg-white shadow-sm border-b border-gray-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
          <!-- Logo und Navigation -->
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <img class="h-8 w-auto" src="/images/Driving_Team_ch.jpg" alt="Driving Team">
            </div>
            <div class="hidden md:ml-6 md:flex md:space-x-8">
              <NuxtLink to="/admin" 
                        class="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                Dashboard
              </NuxtLink>
              <NuxtLink to="/admin/users" 
                        class="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                Benutzer
              </NuxtLink>
              <NuxtLink to="/admin/payment-overview" 
                        class="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                Zahlungen
              </NuxtLink>
              <NuxtLink to="/admin/invoices" 
                        class="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                Rechnungen
              </NuxtLink>
            </div>
          </div>

          <!-- User Menu -->
          <div class="flex items-center">
            <div class="relative">
              <button @click="showUserMenu = !showUserMenu" 
                      class="bg-gray-800 flex text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                <span class="sr-only">Open user menu</span>
                <div class="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                  <span class="text-gray-600 font-medium text-sm">{{ userInitials }}</span>
                </div>
              </button>
              
              <!-- Dropdown Menu -->
              <div v-if="showUserMenu" 
                   class="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                <div class="py-1">
                  <div class="px-4 py-2 text-xs text-gray-500 border-b">
                    Angemeldet als: {{ currentUser?.first_name }} {{ currentUser?.last_name }}
                  </div>
                  <NuxtLink to="/dashboard" 
                            class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    Zum Staff Dashboard
                  </NuxtLink>
                  <button @click="logout" 
                          class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    Abmelden
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>

    <!-- Page Content -->
    <main class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { storeToRefs } from 'pinia'
import { navigateTo } from '#app'

const authStore = useAuthStore()
const { user: currentUser } = storeToRefs(authStore)

const showUserMenu = ref(false)

const userInitials = computed(() => {
  if (!currentUser.value) return '?'
  const first = currentUser.value.first_name?.charAt(0) || ''
  const last = currentUser.value.last_name?.charAt(0) || ''
  return (first + last).toUpperCase()
})

const logout = async () => {
  await authStore.logout()
  navigateTo('/')
}

// Close dropdown when clicking outside
onMounted(() => {
  document.addEventListener('click', (e) => {
    const target = e.target as Element
    if (!target.closest('.relative')) {
      showUserMenu.value = false
    }
  })
})
</script>