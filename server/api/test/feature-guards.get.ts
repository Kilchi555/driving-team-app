// server/api/test/feature-guards.get.ts
import { routeRequiresFeatureFlag, validateFeatureAccess } from '~/utils/featureFlags'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const { tenantId, testRoute } = query

    if (!tenantId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'tenantId is required'
      })
    }

    const testRoutes = [
      '/admin/payment-overview',
      '/admin/data-management',
      '/admin/cash-management',
      '/admin/cancellation-management',
      '/admin/staff-hours',
      '/admin/products',
      '/admin/discounts',
      '/admin/categories',
      '/admin/courses',
      '/admin/evaluation-system',
      '/admin/examiners',
      '/api/payments',
      '/api/imports'
    ]

    const results: any[] = []

    for (const route of testRoutes) {
      const requiresFeature = routeRequiresFeatureFlag(route)
      
      if (requiresFeature) {
        const featureCheck = await validateFeatureAccess(tenantId, route)
        results.push({
          route,
          requiresFeature: true,
          enabled: featureCheck.enabled,
          message: featureCheck.message,
          requiredFeature: getRequiredFeatureForRoute(route)
        })
      } else {
        results.push({
          route,
          requiresFeature: false,
          enabled: true,
          message: 'Route does not require feature flag'
        })
      }
    }

    return {
      success: true,
      tenantId,
      results,
      summary: {
        total: results.length,
        featureProtected: results.filter(r => r.requiresFeature).length,
        enabled: results.filter(r => r.enabled).length,
        disabled: results.filter(r => !r.enabled).length
      }
    }

  } catch (error: any) {
    console.error('Feature guards test failed:', error)
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Feature guards test failed'
    })
  }
})

function getRequiredFeatureForRoute(route: string): string | null {
  const featureMap: Record<string, string[]> = {
    'invoices_enabled': ['/admin/payment-overview', '/admin/invoices', '/api/payments'],
    'data_management_enabled': ['/admin/data-management', '/api/imports'],
    'cash_management_enabled': ['/admin/cash-management', '/admin/office-cash', '/api/admin/cash'],
    'cancellation_management_enabled': ['/admin/cancellation-management', '/api/admin/cancellation'],
    'staff_hours_enabled': ['/admin/staff-hours', '/api/admin/staff-hours'],
    'product_sales_enabled': ['/admin/products', '/admin/product-sales', '/api/admin/products'],
    'discounts_enabled': ['/admin/discounts', '/api/admin/discounts'],
    'categories_enabled': ['/admin/categories', '/api/admin/categories'],
    'courses_enabled': ['/admin/courses', '/api/admin/courses'],
    'evaluations_enabled': ['/admin/evaluation-system', '/api/admin/evaluations'],
    'experts_enabled': ['/admin/examiners', '/api/admin/experts']
  }

  for (const [featureKey, routes] of Object.entries(featureMap)) {
    if (routes.some(r => route.startsWith(r))) {
      return featureKey
    }
  }
  return null
}
