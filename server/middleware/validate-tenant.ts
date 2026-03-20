export default defineEventHandler(async (event) => {
  const url = event.node.req.url || ''
  
  // List of routes that require tenant validation
  const protectedRoutes = ['/partner/', '/affiliate-dashboard', '/register']
  
  // Check if current route needs tenant validation
  const isProtectedRoute = protectedRoutes.some(r => url.includes(r))
  
  if (!isProtectedRoute) return
  
  // Extract tenant slug from URL
  let tenantSlug: string | null = null
  
  // Parse slug from /partner/[slug]
  if (url.includes('/partner/')) {
    const match = url.match(/\/partner\/([^/?]+)/)
    if (match) {
      tenantSlug = match[1]
    }
  }
  
  // If no tenant slug found and we're on protected route, may need login redirect
  if (!tenantSlug && url.includes('/affiliate-dashboard')) {
    // Affiliate dashboard doesn't require slug in URL for authenticated users
    // The API will handle auth validation
    return
  }
  
  if (!tenantSlug && url.includes('/register')) {
    // Register page doesn't require tenant slug
    return
  }
  
  // Validate tenant exists if we have a slug
  if (tenantSlug) {
    try {
      const tenant = await $fetch(`/api/tenants/branding`, {
        query: { slug: tenantSlug }
      })
      
      if (!tenant?.data) {
        throw createError({
          statusCode: 404,
          statusMessage: 'Tenant nicht gefunden',
          message: `Der Tenant "${tenantSlug}" existiert nicht.`
        })
      }
    } catch (error: any) {
      if (error.statusCode === 404 || !error.data) {
        throw createError({
          statusCode: 404,
          statusMessage: 'Tenant nicht gefunden',
          message: `Der Tenant "${tenantSlug}" existiert nicht. Bitte überprüfe die URL oder melde dich an.`
        })
      }
    }
  }
})
