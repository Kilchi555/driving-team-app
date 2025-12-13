export default defineRouteMiddleware((to, from) => {
  const authStore = useAuthStore()
  
  if (!authStore.isLoggedIn) {
    return navigateTo('/login')
  }
  
  // Check if user is super_admin
  if (authStore.userRole !== 'super_admin') {
    console.warn('❌ Unauthorized: User is not a super_admin')
    return navigateTo('/dashboard')
  }
})

