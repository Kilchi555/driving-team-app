export default defineRouteMiddleware(async (to, from) => {
  const authStore = useAuthStore()
  
  if (!authStore.isLoggedIn) {
    const { getLoginPath } = await import('~/utils/redirect-to-login')
    return navigateTo(getLoginPath())
  }
  
  // Check if user is super_admin
  if (authStore.userRole !== 'super_admin') {
    console.warn('❌ Unauthorized: User is not a super_admin')
    return navigateTo('/dashboard')
  }
})

