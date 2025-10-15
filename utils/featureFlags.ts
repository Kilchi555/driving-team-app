// utils/featureFlags.ts
import { getSupabaseAdmin } from '~/utils/supabase'

export interface FeatureCheckResult {
  enabled: boolean
  metadata?: any
  message: string
}

// Feature to route mapping
export const FEATURE_ROUTE_MAP: Record<string, string[]> = {
  'invoices_enabled': [
    '/admin/payment-overview',
    '/admin/invoices',
    '/api/payments',
    '/api/invoices'
  ],
  'data_management_enabled': [
    '/admin/data-management',
    '/api/imports'
  ],
  'cash_management_enabled': [
    '/admin/cash-management',
    '/admin/office-cash',
    '/api/admin/cash'
  ],
  'cancellation_management_enabled': [
    '/admin/cancellation-management',
    '/api/admin/cancellation'
  ],
  'staff_hours_enabled': [
    '/admin/staff-hours',
    '/api/admin/staff-hours'
  ],
  'reminders_enabled': [
    '/api/reminder'
  ],
  'exams_enabled': [
    '/admin/examiners',
    '/admin/exam-statistics',
    '/api/admin/exams'
  ],
  'evaluations_enabled': [
    '/admin/evaluation-system',
    '/api/admin/evaluations'
  ],
  'experts_enabled': [
    '/admin/examiners',
    '/api/admin/experts'
  ],
  'courses_enabled': [
    '/admin/courses',
    '/api/admin/courses'
  ],
  'categories_enabled': [
    '/admin/categories',
    '/api/admin/categories'
  ],
  'discounts_enabled': [
    '/admin/discounts',
    '/api/admin/discounts'
  ],
  'product_sales_enabled': [
    '/admin/products',
    '/admin/product-sales',
    '/api/admin/products'
  ]
}

// Server-side feature check
export async function checkFeatureFlag(tenantId: string, featureKey: string): Promise<FeatureCheckResult> {
  try {
    if (!tenantId || !featureKey) {
      return {
        enabled: false,
        message: 'Missing tenantId or featureKey'
      }
    }

    // Only use getSupabaseAdmin on server
    if (process.server) {
      const supabaseAdmin = getSupabaseAdmin()

      // Check feature flag from database
      const { data, error } = await supabaseAdmin
        .from('tenant_settings')
        .select('setting_value')
        .eq('tenant_id', tenantId)
        .eq('category', 'features')
        .eq('setting_key', featureKey)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error checking feature flag:', error)
        return {
          enabled: false,
          message: `Failed to check feature flag: ${error.message}`
        }
      }

      // If no data found, feature is disabled
      if (!data) {
        return {
          enabled: false,
          message: `Feature ${featureKey} not found or disabled`
        }
      }

      try {
        // Parse JSON metadata
        const metadata = JSON.parse(data.setting_value)
        const isEnabled = metadata.enabled || false

        return {
          enabled: isEnabled,
          metadata: metadata,
          message: isEnabled ? `Feature ${featureKey} is enabled` : `Feature ${featureKey} is disabled`
        }
      } catch (parseError) {
        // Fallback for boolean values
        const isEnabled = data.setting_value === 'true'
        
        return {
          enabled: isEnabled,
          metadata: { enabled: isEnabled },
          message: isEnabled ? `Feature ${featureKey} is enabled` : `Feature ${featureKey} is disabled`
        }
      }
    } else {
      // Client-side: Use regular supabase client
      const { getSupabase } = await import('~/utils/supabase')
      const supabase = getSupabase()

      // Check feature flag from database
      const { data, error } = await supabase
        .from('tenant_settings')
        .select('setting_value')
        .eq('tenant_id', tenantId)
        .eq('category', 'features')
        .eq('setting_key', featureKey)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error checking feature flag:', error)
        return {
          enabled: false,
          message: `Failed to check feature flag: ${error.message}`
        }
      }

      // If no data found, feature is disabled
      if (!data) {
        return {
          enabled: false,
          message: `Feature ${featureKey} not found or disabled`
        }
      }

      try {
        // Parse JSON metadata
        const metadata = JSON.parse(data.setting_value)
        const isEnabled = metadata.enabled || false

        return {
          enabled: isEnabled,
          metadata: metadata,
          message: isEnabled ? `Feature ${featureKey} is enabled` : `Feature ${featureKey} is disabled`
        }
      } catch (parseError) {
        // Fallback for boolean values
        const isEnabled = data.setting_value === 'true'
        
        return {
          enabled: isEnabled,
          metadata: { enabled: isEnabled },
          message: isEnabled ? `Feature ${featureKey} is enabled` : `Feature ${featureKey} is disabled`
        }
      }
    }

  } catch (error: any) {
    console.error('Feature check failed:', error)
    return {
      enabled: false,
      message: `Feature check failed: ${error.message}`
    }
  }
}

// Get required feature for a route
export function getRequiredFeatureForRoute(route: string): string | null {
  for (const [featureKey, routes] of Object.entries(FEATURE_ROUTE_MAP)) {
    if (routes.some(r => route.startsWith(r))) {
      return featureKey
    }
  }
  return null
}

// Check if route requires feature flag
export function routeRequiresFeatureFlag(route: string): boolean {
  return getRequiredFeatureForRoute(route) !== null
}

// Validate feature access for route
export async function validateFeatureAccess(tenantId: string, route: string): Promise<FeatureCheckResult> {
  const requiredFeature = getRequiredFeatureForRoute(route)
  
  if (!requiredFeature) {
    return {
      enabled: true,
      message: 'Route does not require feature flag'
    }
  }

  return await checkFeatureFlag(tenantId, requiredFeature)
}
