import { defineEventHandler } from 'h3'
import { getSupabase } from '~/utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const supabase = getSupabase()
    
    // Try to get tenants with RLS bypass
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select('*')
      .limit(10)

    // Also try with a different approach - using rpc
    const { data: tenantsRpc, error: tenantsRpcError } = await supabase
      .rpc('get_tenants_direct')

    return {
      success: true,
      debug: {
        tenants: tenants || [],
        tenantsError,
        tenantsRpc: tenantsRpc || [],
        tenantsRpcError,
        message: 'Direct tenant access test'
      }
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      debug: {
        message: 'Failed to access tenants directly'
      }
    }
  }
})
