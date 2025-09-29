// composables/useOfficeCashRegisters.ts
// Verwaltung von mehreren Bürokassen mit Staff-Zuweisungen

import { ref, computed } from 'vue'
import { getSupabase } from '~/utils/supabase'

export interface OfficeCashRegister {
  id: string
  tenant_id: string
  name: string
  description: string | null
  location: string | null
  register_type: 'office' | 'reception' | 'exam' | 'emergency'
  is_active: boolean
  is_main_register: boolean
  created_by: string
  created_at: string
  current_balance_rappen: number
  assigned_staff: StaffAssignment[]
  last_activity: string | null
}

export interface StaffAssignment {
  staff_id: string
  staff_name: string
  access_level: 'manager' | 'operator' | 'viewer'
  is_active: boolean
  time_restrictions?: any
}

export interface CashMovement {
  id: string
  movement_type: 'deposit' | 'withdrawal' | 'transfer' | 'adjustment'
  amount_rappen: number
  balance_before_rappen: number
  balance_after_rappen: number
  performed_by: string
  performer_name: string
  notes: string | null
  created_at: string
  office_cash_register_id: string | null
}

export const useOfficeCashRegisters = () => {
  const supabase = getSupabase()
  
  // State
  const officeRegisters = ref<OfficeCashRegister[]>([])
  const currentRegister = ref<OfficeCashRegister | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  
  // Get current user's tenant_id
  const getCurrentTenantId = async (): Promise<string | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null

      const { data: userProfile } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('auth_user_id', user.id)
        .single()

      return userProfile?.tenant_id || null
    } catch (err) {
      console.error('Error getting tenant_id:', err)
      return null
    }
  }
  
  // Load all office cash registers for current tenant
  const loadOfficeRegisters = async () => {
    isLoading.value = true
    error.value = null
    
    try {
      const tenantId = await getCurrentTenantId()
      if (!tenantId) throw new Error('No tenant_id found')

      console.log('🔍 Loading office registers for tenant:', tenantId)

      // Use direct table query (simpler and more reliable)
      const { data, error: queryError } = await supabase
        .from('office_cash_registers')
        .select(`
          id,
          name,
          description,
          location,
          register_type,
          is_main_register,
          tenant_id,
          created_at
        `)
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('is_main_register', { ascending: false })
        .order('name')
      
      if (queryError) throw queryError
      
      // Load balances for each register
      const registerIds = (data || []).map(r => r.id)
      let balances = []
      
      if (registerIds.length > 0) {
        const { data: balanceData } = await supabase
          .from('cash_balances')
          .select('office_cash_register_id, current_balance_rappen')
          .in('office_cash_register_id', registerIds)
        
        balances = balanceData || []
      }
      
      // Transform to expected format with real balances
      const transformedData = (data || []).map(register => {
        const balance = balances.find(b => b.office_cash_register_id === register.id)
        return {
          ...register,
          current_balance_rappen: balance?.current_balance_rappen || 0,
          assigned_staff: [], // TODO: Load from assignments
          last_activity: null
        }
      })

      officeRegisters.value = transformedData
      console.log('✅ Office cash registers loaded:', officeRegisters.value.length)
      
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load office registers'
      console.error('❌ Error loading office registers:', err)
      
      // Set empty array on error to prevent UI issues
      officeRegisters.value = []
    } finally {
      isLoading.value = false
    }
  }
  
  // Create new office cash register
  const createOfficeRegister = async (
    name: string,
    description: string,
    location: string,
    registerType: 'office' | 'reception' | 'exam' | 'emergency'
  ): Promise<string | null> => {
    try {
      const tenantId = await getCurrentTenantId()
      if (!tenantId) throw new Error('No tenant_id found')

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: userProfile } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single()

      if (!userProfile) throw new Error('User profile not found')

      const { data, error } = await supabase
        .rpc('create_office_cash_register', {
          p_tenant_id: tenantId,
          p_name: name,
          p_description: description,
          p_location: location,
          p_register_type: registerType,
          p_created_by: userProfile.id
        })

      if (error) throw error
      
      console.log('✅ Office cash register created:', data)
      await loadOfficeRegisters() // Reload list
      
      return data
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create office register'
      console.error('❌ Error creating office register:', err)
      return null
    }
  }
  
  // Assign staff to office cash register
  const assignStaffToRegister = async (
    registerId: string,
    staffId: string,
    accessLevel: 'manager' | 'operator' | 'viewer',
    timeRestrictions?: any
  ): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: userProfile } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single()

      if (!userProfile) throw new Error('User profile not found')

      const { error } = await supabase
        .rpc('assign_staff_to_office_cash', {
          p_cash_register_id: registerId,
          p_staff_id: staffId,
          p_access_level: accessLevel,
          p_assigned_by: userProfile.id,
          p_time_restrictions: timeRestrictions
        })

      if (error) throw error
      
      console.log('✅ Staff assigned to office cash register')
      await loadOfficeRegisters() // Reload to show new assignment
      
      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to assign staff'
      console.error('❌ Error assigning staff:', err)
      return false
    }
  }
  
  // Get cash movements for a specific office register
  const getRegisterMovements = async (registerId: string): Promise<CashMovement[]> => {
    try {
      const { data, error } = await supabase
        .from('cash_movements')
        .select(`
          id, movement_type, amount_rappen, balance_before_rappen, balance_after_rappen,
          notes, created_at, office_cash_register_id,
          performer:performed_by(first_name, last_name)
        `)
        .eq('office_cash_register_id', registerId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error

      return (data || []).map((movement: any) => ({
        ...movement,
        performer_name: `${movement.performer?.first_name || ''} ${movement.performer?.last_name || ''}`.trim()
      }))
    } catch (err) {
      console.error('❌ Error loading register movements:', err)
      return []
    }
  }
  
  // Check if current user can access a register
  const canAccessRegister = async (registerId: string, requiredLevel: 'manager' | 'operator' | 'viewer' = 'viewer'): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return false

      const { data: userProfile } = await supabase
        .from('users')
        .select('id, role')
        .eq('auth_user_id', user.id)
        .single()

      if (!userProfile) return false

      // Admins have full access
      if (userProfile.role === 'admin') return true

      // Check staff assignment
      const { data: assignment } = await supabase
        .from('office_cash_staff_assignments')
        .select('access_level')
        .eq('cash_register_id', registerId)
        .eq('staff_id', userProfile.id)
        .eq('is_active', true)
        .single()

      if (!assignment) return false

      // Check access level hierarchy
      const levels = { viewer: 1, operator: 2, manager: 3 }
      return levels[assignment.access_level] >= levels[requiredLevel]

    } catch (err) {
      console.error('❌ Error checking register access:', err)
      return false
    }
  }
  
  // Computed
  const mainRegister = computed(() => 
    officeRegisters.value.find(r => r.is_main_register) || null
  )
  
  const additionalRegisters = computed(() => 
    officeRegisters.value.filter(r => !r.is_main_register)
  )
  
  const totalBalance = computed(() => 
    officeRegisters.value.reduce((sum, r) => sum + r.current_balance_rappen, 0)
  )
  
  return {
    // State
    officeRegisters: readonly(officeRegisters),
    currentRegister: readonly(currentRegister),
    isLoading: readonly(isLoading),
    error: readonly(error),
    
    // Computed
    mainRegister,
    additionalRegisters,
    totalBalance,
    
    // Methods
    loadOfficeRegisters,
    createOfficeRegister,
    assignStaffToRegister,
    getRegisterMovements,
    canAccessRegister,
    getCurrentTenantId
  }
}
