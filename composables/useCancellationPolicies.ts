import { ref, computed } from 'vue'
import { getSupabase } from '~/utils/supabase'

const supabase = getSupabase()

export interface CancellationPolicy {
  id: string
  name: string
  description?: string
  is_active: boolean
  is_default: boolean
  created_at: string
  updated_at: string
  created_by?: string
}

export interface CancellationRule {
  id: string
  policy_id: string
  hours_before_appointment: number
  charge_percentage: number
  credit_hours_to_instructor: boolean
  description?: string
  created_at: string
  updated_at: string
}

export interface PolicyWithRules extends CancellationPolicy {
  rules: CancellationRule[]
}

export interface CancellationCalculation {
  applicableRule: CancellationRule | null
  chargePercentage: number
  creditHours: boolean
  hoursBeforeAppointment: number
  description: string
}

export const useCancellationPolicies = () => {
  const policies = ref<CancellationPolicy[]>([])
  const policiesWithRules = ref<PolicyWithRules[]>([])
  const defaultPolicy = ref<PolicyWithRules | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Fetch all active policies with their rules
  const fetchPolicies = async () => {
    try {
      isLoading.value = true
      error.value = null

      // Get current user's tenant_id
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      const { data: userProfile } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('auth_user_id', currentUser?.id)
        .single()
      const tenantId = userProfile?.tenant_id
      
      if (!tenantId) {
        throw new Error('User has no tenant assigned')
      }

      console.log('🔍 Cancellation Policies - Current tenant_id:', tenantId)

      // Fetch policies (nur aktive - das sollte für alle Benutzer funktionieren)
      const { data: policiesData, error: policiesError } = await supabase
        .from('cancellation_policies')
        .select('*')
        .eq('is_active', true)
        .eq('tenant_id', tenantId) // Filter by current tenant
        .order('created_at', { ascending: false })

      if (policiesError) {
        console.error('Error fetching policies:', policiesError)
        throw policiesError
      }

      policies.value = policiesData || []

      // Fetch rules for each policy
      const policiesWithRulesData: PolicyWithRules[] = []
      
      for (const policy of policies.value) {
        const { data: rulesData, error: rulesError } = await supabase
          .from('cancellation_rules')
          .select('*')
          .eq('policy_id', policy.id)
          .order('hours_before_appointment', { ascending: false })

        if (rulesError) {
          console.warn(`Error fetching rules for policy ${policy.id}:`, rulesError)
        }

        policiesWithRulesData.push({
          ...policy,
          rules: rulesData || []
        })

        // Set default policy
        if (policy.is_default) {
          defaultPolicy.value = {
            ...policy,
            rules: rulesData || []
          }
        }
      }

      policiesWithRules.value = policiesWithRulesData
    } catch (err) {
      console.error('Error fetching cancellation policies:', err)
      error.value = err instanceof Error ? err.message : 'Failed to fetch cancellation policies'
    } finally {
      isLoading.value = false
    }
  }

  // Fetch all policies (including inactive) for admin management
  const fetchAllPolicies = async () => {
    try {
      isLoading.value = true
      error.value = null

      // Prüfe zuerst, ob der Benutzer Admin-Rechte hat
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('Benutzer nicht authentifiziert')
      }

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role, tenant_id')
        .eq('auth_user_id', user.id)
        .single()

      if (userError || userData?.role !== 'admin') {
        throw new Error('Keine Admin-Berechtigung für Policy-Management')
      }

      if (!userData?.tenant_id) {
        throw new Error('User has no tenant assigned')
      }

      console.log('🔍 All Cancellation Policies - Current tenant_id:', userData.tenant_id)

      const { data: policiesData, error: policiesError } = await supabase
        .from('cancellation_policies')
        .select('*')
        .eq('tenant_id', userData.tenant_id) // Filter by current tenant
        .order('created_at', { ascending: false })

      if (policiesError) {
        throw policiesError
      }

      policies.value = policiesData || []

      // Fetch rules for each policy
      const policiesWithRulesData: PolicyWithRules[] = []
      
      for (const policy of policies.value) {
        const { data: rulesData, error: rulesError } = await supabase
          .from('cancellation_rules')
          .select('*')
          .eq('policy_id', policy.id)
          .order('hours_before_appointment', { ascending: false })

        if (rulesError) {
          console.warn(`Error fetching rules for policy ${policy.id}:`, rulesError)
        }

        policiesWithRulesData.push({
          ...policy,
          rules: rulesData || []
        })

        // Set default policy
        if (policy.is_default) {
          defaultPolicy.value = {
            ...policy,
            rules: rulesData || []
          }
        }
      }

      policiesWithRules.value = policiesWithRulesData
    } catch (err) {
      console.error('Error fetching all cancellation policies:', err)
      error.value = err instanceof Error ? err.message : 'Failed to fetch cancellation policies'
    } finally {
      isLoading.value = false
    }
  }

  // Create new policy
  const createPolicy = async (policyData: Omit<CancellationPolicy, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      isLoading.value = true
      error.value = null

      // Get current user's tenant_id
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      const { data: userProfile } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('auth_user_id', currentUser?.id)
        .single()
      const tenantId = userProfile?.tenant_id
      
      if (!tenantId) {
        throw new Error('User has no tenant assigned')
      }

      const { data, error: createError } = await supabase
        .from('cancellation_policies')
        .insert([{ ...policyData, tenant_id: tenantId }])
        .select()
        .single()

      if (createError) {
        throw createError
      }

      // Refresh the list
      await fetchAllPolicies()
      return data
    } catch (err) {
      console.error('Error creating cancellation policy:', err)
      error.value = err instanceof Error ? err.message : 'Failed to create cancellation policy'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Update policy
  const updatePolicy = async (id: string, updates: Partial<Omit<CancellationPolicy, 'id' | 'created_at' | 'updated_at'>>) => {
    try {
      isLoading.value = true
      error.value = null

      const { data, error: updateError } = await supabase
        .from('cancellation_policies')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (updateError) {
        throw updateError
      }

      // Refresh the list
      await fetchAllPolicies()
      return data
    } catch (err) {
      console.error('Error updating cancellation policy:', err)
      error.value = err instanceof Error ? err.message : 'Failed to update cancellation policy'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Delete policy (soft delete by setting is_active to false)
  const deletePolicy = async (id: string) => {
    try {
      isLoading.value = true
      error.value = null

      const { error: deleteError } = await supabase
        .from('cancellation_policies')
        .update({ is_active: false })
        .eq('id', id)

      if (deleteError) {
        throw deleteError
      }

      // Refresh the list
      await fetchAllPolicies()
    } catch (err) {
      console.error('Error deleting cancellation policy:', err)
      error.value = err instanceof Error ? err.message : 'Failed to delete cancellation policy'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Create cancellation rule
  const createRule = async (ruleData: Omit<CancellationRule, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      isLoading.value = true
      error.value = null

      const { data, error: createError } = await supabase
        .from('cancellation_rules')
        .insert([ruleData])
        .select()
        .single()

      if (createError) {
        throw createError
      }

      // Refresh the list
      await fetchAllPolicies()
      return data
    } catch (err) {
      console.error('Error creating cancellation rule:', err)
      error.value = err instanceof Error ? err.message : 'Failed to create cancellation rule'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Update cancellation rule
  const updateRule = async (id: string, updates: Partial<Omit<CancellationRule, 'id' | 'created_at' | 'updated_at'>>) => {
    try {
      isLoading.value = true
      error.value = null

      const { data, error: updateError } = await supabase
        .from('cancellation_rules')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (updateError) {
        throw updateError
      }

      // Refresh the list
      await fetchAllPolicies()
      return data
    } catch (err) {
      console.error('Error updating cancellation rule:', err)
      error.value = err instanceof Error ? err.message : 'Failed to update cancellation rule'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Delete cancellation rule
  const deleteRule = async (id: string) => {
    try {
      isLoading.value = true
      error.value = null

      const { error: deleteError } = await supabase
        .from('cancellation_rules')
        .delete()
        .eq('id', id)

      if (deleteError) {
        throw deleteError
      }

      // Refresh the list
      await fetchAllPolicies()
    } catch (err) {
      console.error('Error deleting cancellation rule:', err)
      error.value = err instanceof Error ? err.message : 'Failed to delete cancellation rule'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Set default policy (only one can be default)
  const setDefaultPolicy = async (policyId: string) => {
    try {
      isLoading.value = true
      error.value = null

      // First, unset all other default policies
      const { error: unsetError } = await supabase
        .from('cancellation_policies')
        .update({ is_default: false })
        .neq('id', policyId)

      if (unsetError) {
        throw unsetError
      }

      // Then set the selected policy as default
      const { data, error: setError } = await supabase
        .from('cancellation_policies')
        .update({ is_default: true })
        .eq('id', policyId)
        .select()
        .single()

      if (setError) {
        throw setError
      }

      // Refresh the list
      await fetchAllPolicies()
      return data
    } catch (err) {
      console.error('Error setting default policy:', err)
      error.value = err instanceof Error ? err.message : 'Failed to set default policy'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Calculate cancellation charges based on policy and timing
  const calculateCancellationCharges = (
    policy: PolicyWithRules,
    appointmentDate: Date,
    cancellationDate: Date = new Date()
  ): CancellationCalculation => {
    const hoursBeforeAppointment = Math.floor(
      (appointmentDate.getTime() - cancellationDate.getTime()) / (1000 * 60 * 60)
    )

    // Find the applicable rule (first rule where hours_before_appointment <= hoursBeforeAppointment)
    const applicableRule = policy.rules.find(rule => 
      hoursBeforeAppointment >= rule.hours_before_appointment
    ) || policy.rules[policy.rules.length - 1] // Fallback to last rule

    return {
      applicableRule,
      chargePercentage: applicableRule?.charge_percentage || 0,
      creditHours: applicableRule?.credit_hours_to_instructor || false,
      hoursBeforeAppointment,
      description: applicableRule?.description || 'Keine Regel gefunden'
    }
  }

  // Get policy by ID
  const getPolicyById = (id: string): PolicyWithRules | null => {
    return policiesWithRules.value.find(policy => policy.id === id) || null
  }

  // Computed properties
  const activePolicies = computed(() => {
    return policiesWithRules.value.filter(policy => policy.is_active)
  })

  const inactivePolicies = computed(() => {
    return policiesWithRules.value.filter(policy => !policy.is_active)
  })

  return {
    // Data
    policies,
    policiesWithRules,
    defaultPolicy,
    activePolicies,
    inactivePolicies,
    
    // State
    isLoading,
    error,
    
    // Actions
    fetchPolicies,
    fetchAllPolicies,
    createPolicy,
    updatePolicy,
    deletePolicy,
    createRule,
    updateRule,
    deleteRule,
    setDefaultPolicy,
    calculateCancellationCharges,
    getPolicyById
  }
}
