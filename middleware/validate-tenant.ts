export default defineNuxtRouteMiddleware(async (to, from) => {
  // Routes that need tenant validation
  const protectedRoutes = ['/affiliate-dashboard']
  const needsValidation = protectedRoutes.some(route => to.path.startsWith(route))

  // /partner/[slug] pages handle their own tenant loading and error state in the component
  if (!needsValidation) return

  if (to.path === '/affiliate-dashboard') {
    // Affiliate dashboard doesn't have slug in URL — API handles auth validation
    return
  }
})
