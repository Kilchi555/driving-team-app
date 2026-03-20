export default defineNuxtRouteMiddleware(async (to, from) => {
  // Routes that need tenant validation
  const protectedRoutes = ['/partner/', '/affiliate-dashboard']
  const needsValidation = protectedRoutes.some(route => to.path.startsWith(route))
  
  if (!needsValidation) return
  
  // Extract tenant slug
  let tenantSlug: string | null = null
  
  if (to.path.startsWith('/partner/')) {
    tenantSlug = to.params.slug as string
  }
  
  if (!tenantSlug && to.path === '/affiliate-dashboard') {
    // Affiliate dashboard doesn't have slug in URL, but validate via API
    // This will be handled by the API call itself
    return
  }
  
  if (!tenantSlug) return
  
  // Validate tenant exists
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
})
