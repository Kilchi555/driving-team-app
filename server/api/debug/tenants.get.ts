import { getSupabase } from '~/utils/supabase'

interface DebugTenantsResponse {
  success: boolean
  data?: {
    tenants_count: number
    users_with_tenant: number
    appointments_with_tenant: number
    payments_with_tenant: number
    products_with_tenant: number
    rls_enabled_tables: number
  }
  error?: string
}

export default defineEventHandler(async (event): Promise<DebugTenantsResponse> => {
  try {
    logger.debug('🔍 Debug tenants API called')
    
    const supabase = getSupabase()
    
    // Get tenant count
    const { count: tenantsCount } = await supabase
      .from('tenants')
      .select('*', { count: 'exact', head: true })
    
    // Get users with tenant_id
    const { count: usersWithTenant } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .not('tenant_id', 'is', null)
    
    // Get appointments with tenant_id
    const { count: appointmentsWithTenant } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .not('tenant_id', 'is', null)
    
    // Get payments with tenant_id
    const { count: paymentsWithTenant } = await supabase
      .from('payments')
      .select('*', { count: 'exact', head: true })
      .not('tenant_id', 'is', null)
    
    // Get products with tenant_id
    const { count: productsWithTenant } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .not('tenant_id', 'is', null)
    
    // Check RLS enabled tables
    const { data: rlsTables } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_type', 'BASE TABLE')
    
    const rlsEnabledTables = rlsTables?.length || 0
    
    logger.debug('✅ Debug data collected:', {
      tenants: tenantsCount,
      users: usersWithTenant,
      appointments: appointmentsWithTenant,
      payments: paymentsWithTenant,
      products: productsWithTenant,
      rlsTables: rlsEnabledTables
    })
    
    return {
      success: true,
      data: {
        tenants_count: tenantsCount || 0,
        users_with_tenant: usersWithTenant || 0,
        appointments_with_tenant: appointmentsWithTenant || 0,
        payments_with_tenant: paymentsWithTenant || 0,
        products_with_tenant: productsWithTenant || 0,
        rls_enabled_tables: rlsEnabledTables
      }
    }
    
  } catch (err: any) {
    console.error('❌ Debug tenants API error:', err)
    
    return {
      success: false,
      error: err.message || 'Unknown error'
    }
  }
})