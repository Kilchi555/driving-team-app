// middleware/auth.ts
import { defineNuxtRouteMiddleware, navigateTo } from '#app'
import { useAuthStore } from '~/stores/auth'

export default defineNuxtRouteMiddleware(async (to, from) => {
  console.log('🔥 Auth middleware for:', to.path)
  
  // Skip auf Server
  if (process.server) return

  const authStore = useAuthStore()

  // Warte kurz auf Store-Initialisierung
  let attempts = 0
  while (!authStore.isInitialized && attempts < 50) {
    await new Promise(resolve => setTimeout(resolve, 100))
    attempts++
  }

  // Prüfe ob User eingeloggt ist
  if (!authStore.isLoggedIn) {
    console.log('❌ Not logged in, redirecting to /')
    if (to.path !== '/') {
      return navigateTo('/')
    }
    return
  }

  // Prüfe ob User ein Profil hat
  if (!authStore.hasProfile && to.path !== '/profile-setup') {
    console.log('📝 No profile found, redirecting to setup')
    return navigateTo('/profile-setup')
  }

  // Wenn User Profil hat aber auf Setup-Seite ist
  if (authStore.hasProfile && to.path === '/profile-setup') {
    console.log('✅ Profile exists, redirecting to dashboard')
    return navigateTo('/dashboard')
  }

  console.log('✅ Auth check passed for role:', authStore.userRole)
})

// middleware/admin.ts
export const adminMiddleware = defineNuxtRouteMiddleware((to, from) => {
  console.log('🔐 Admin middleware for:', to.path)
  
  if (process.server) return

  const authStore = useAuthStore()

  // Basis-Auth prüfen
  if (!authStore.isLoggedIn) {
    console.log('❌ Not authenticated')
    return navigateTo('/')
  }

  // Admin/Staff Berechtigung prüfen
  if (!authStore.isAdmin && !authStore.isStaff) {
    console.log('❌ Insufficient permissions. Role:', authStore.userRole)
    return navigateTo('/dashboard')
  }

  console.log('✅ Admin access granted for role:', authStore.userRole)
})

// middleware/staff.ts
export const staffMiddleware = defineNuxtRouteMiddleware((to, from) => {
  console.log('👨‍🏫 Staff middleware for:', to.path)
  
  if (process.server) return

  const authStore = useAuthStore()

  if (!authStore.isLoggedIn) {
    console.log('❌ Not authenticated')
    return navigateTo('/')
  }

  if (!authStore.isStaff && !authStore.isAdmin) {
    console.log('❌ Staff access denied. Role:', authStore.userRole)
    return navigateTo('/dashboard')
  }

  console.log('✅ Staff access granted for role:', authStore.userRole)
})

// middleware/client.ts  
export const clientMiddleware = defineNuxtRouteMiddleware((to, from) => {
  console.log('👤 Client middleware for:', to.path)
  
  if (process.server) return

  const authStore = useAuthStore()

  if (!authStore.isLoggedIn) {
    console.log('❌ Not authenticated')
    return navigateTo('/')
  }

  // Clients können nur auf ihre eigenen Daten zugreifen
  if (authStore.isClient) {
    // Zusätzliche Client-spezifische Checks hier
    console.log('✅ Client access granted')
  }
})