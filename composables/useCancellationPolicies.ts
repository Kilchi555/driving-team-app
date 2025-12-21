import { ref, computed } from 'vue'
import { getSupabase } from '~/utils/supabase'

const supabase = getSupabase()

export interface CancellationPolicy {
  id: string
  name: string
  description?: string
  is_active: boolean
  is_default: boolean
  applies_to: 'appointments' | 'courses' // 'appointments' = einzelne Termine, 'courses' = Kurstermine
  created_at: string
  updated_at: string
  created_by?: string
}

export interface CancellationRule {
  id: string
  policy_id: string
  hours_before_appointment: number
  comparison_type?: 'more_than' | 'less_than' // 'more_than' = mehr als X Stunden, 'less_than' = weniger als X Stunden
  exclude_sundays?: boolean // If true, Sundays are excluded from time calculation
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
  const fetchPolicies = async (appliesTo?: 'appointments' | 'courses') => {
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

      logger.debug('🔍 Cancellation Policies - Current tenant_id:', tenantId, 'appliesTo:', appliesTo)

      // Build query
      // ✅ IMPORTANT: Load both tenant-specific policies AND global policies (tenant_id = NULL)
      let query = supabase
        .from('cancellation_policies')
        .select('*')
      
      // Filter by applies_to if specified
      if (appliesTo) {
        query = query.eq('applies_to', appliesTo)
      }
      
      // ✅ IMPORTANT: Don't filter by is_active - load all policies
      // The is_active column might be stored as text 'true'/'false' instead of boolean
      // We'll check is_active in the code below
      
      // Order: tenant-specific policies first (non-NULL tenant_id), then global policies
      query = query.order('tenant_id', { ascending: false })
      
      const { data: policiesData, error: policiesError } = await query
        .order('created_at', { ascending: false })

      if (policiesError) {
        logger.debug('❌ Error fetching policies:', policiesError)
        console.error('Error fetching policies:', policiesError)
        throw policiesError
      }

      logger.debug('✅ Raw policies data loaded:', { count: policiesData?.length || 0, policies: policiesData })

      // Filter to get:
      // 1. Active policies (is_active = true)
      // 2. Both tenant-specific AND global policies
      // Tenant-specific policies take precedence over global
      const filteredPolicies = (policiesData || []).filter(p => {
        // Check if policy is active (handle both boolean and string 'true'/'false')
        const isActive = p.is_active === true || p.is_active === 'true'
        
        // Include if active AND (tenant-specific OR global)
        return isActive && (p.tenant_id === null || p.tenant_id === tenantId)
      })
      
      policies.value = filteredPolicies

      // Fetch rules for each policy
      const policiesWithRulesData: PolicyWithRules[] = []
      
      for (const policy of policies.value) {
        let rulesQuery = supabase
          .from('cancellation_rules')
          .select('*')
          .eq('policy_id', policy.id)
        
        // ✅ IMPORTANT: Don't filter by tenant_id for rules
        // Rules always belong to their policy via policy_id
        // The tenant_id on rules is just metadata
        
        const { data: rulesData, error: rulesError } = await rulesQuery
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
      
      logger.debug('📋 Policies loaded:', {
        totalPolicies: policiesWithRulesData.length,
        defaultPolicy: defaultPolicy.value?.name || 'NOT SET',
        defaultPolicyRules: defaultPolicy.value?.rules?.length || 0
      })
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

      logger.debug('🔍 All Cancellation Policies - Current tenant_id:', userData.tenant_id)

      // ✅ IMPORTANT: Load both tenant-specific policies AND global policies (tenant_id = NULL)
      // This allows admins to see and manage both their tenant policies and the global fallback policies
      const { data: policiesData, error: policiesError } = await supabase
        .from('cancellation_policies')
        .select('*')
        .or(`tenant_id.eq.${userData.tenant_id},tenant_id.is.null`) // Load tenant-specific OR global policies
        .order('tenant_id', { ascending: false }) // Tenant-specific policies first
        .order('created_at', { ascending: false })

      if (policiesError) {
        throw policiesError
      }

      policies.value = policiesData || []

      // Fetch rules for each policy
      const policiesWithRulesData: PolicyWithRules[] = []
      
      for (const policy of policies.value) {
        let rulesQuery = supabase
          .from('cancellation_rules')
          .select('*')
          .eq('policy_id', policy.id)
        
        // ✅ IMPORTANT: Don't filter by tenant_id for rules
        // Rules always belong to their policy via policy_id
        // The tenant_id on rules is just metadata
        
        const { data: rulesData, error: rulesError } = await rulesQuery
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

      // Ensure applies_to is set (default to 'appointments' for backward compatibility)
      const policyWithAppliesTo = {
        ...policyData,
        applies_to: policyData.applies_to || 'appointments'
      }

      const { data, error: createError } = await supabase
        .from('cancellation_policies')
        .insert([{ ...policyWithAppliesTo, tenant_id: tenantId }])
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
        .from('cancellation_rules')
        .insert([{ ...ruleData, tenant_id: tenantId }])
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

  // Helper function to calculate hours excluding Sundays
  const calculateHoursExcludingSundays = (startDate: Date, endDate: Date): number => {
    let totalHours = 0
    let currentDate = new Date(startDate)
    
    while (currentDate < endDate) {
      const dayOfWeek = currentDate.getDay() // 0 = Sunday, 1 = Monday, etc.
      
      // Skip Sundays
      if (dayOfWeek === 0) {
        // Move to next day (Monday) at 00:00
        currentDate.setDate(currentDate.getDate() + 1)
        currentDate.setHours(0, 0, 0, 0)
        continue
      }
      
      // Calculate hours until end of day or endDate, whichever comes first
      const endOfDay = new Date(currentDate)
      endOfDay.setHours(23, 59, 59, 999)
      const effectiveEnd = endDate < endOfDay ? endDate : endOfDay
      
      const hoursInThisPeriod = (effectiveEnd.getTime() - currentDate.getTime()) / (1000 * 60 * 60)
      totalHours += hoursInThisPeriod
      
      // Move to next day at 00:00
      currentDate.setDate(currentDate.getDate() + 1)
      currentDate.setHours(0, 0, 0, 0)
    }
    
    return Math.floor(totalHours)
  }

  // Calculate cancellation charges based on policy and timing
  const calculateCancellationCharges = (
    policy: PolicyWithRules,
    appointmentDate: Date,
    cancellationDate: Date = new Date(),
    cancellationType?: 'staff' | 'student'
  ): CancellationCalculation => {
    // ✅ NEW: Handle appointments in the past
    // If appointment is in the past, apply fixed rules:
    // - Staff cancellation (reason): 0% charge (free)
    // - Student/Client cancellation (reason): 100% charge
    const isPast = appointmentDate <= cancellationDate
    
    if (isPast) {
      logger.debug('⏰ Appointment is in the past - applying past appointment rules:', {
        appointmentDate: appointmentDate.toISOString(),
        cancellationDate: cancellationDate.toISOString(),
        cancellationType
      })
      
      const chargePercentageForPast = cancellationType === 'staff' ? 0 : 100
      const lastRule = policy.rules[policy.rules.length - 1]
      
      return {
        applicableRule: lastRule || null,
        chargePercentage: chargePercentageForPast,
        creditHours: cancellationType === 'staff',
        hoursBeforeAppointment: 0,
        description: cancellationType === 'staff' 
          ? 'Kostenlose Stornierung durch Fahrlehrer (Termin in der Vergangenheit)' 
          : 'Volle Gebühr - Termin liegt in der Vergangenheit'
      }
    }
    
    // Check if any rule has exclude_sundays enabled
    const hasExcludeSundays = policy.rules.some(rule => rule.exclude_sundays === true)
    
    let hoursBeforeAppointment: number
    if (hasExcludeSundays) {
      // Use calculation that excludes Sundays
      hoursBeforeAppointment = calculateHoursExcludingSundays(cancellationDate, appointmentDate)
    } else {
      // Standard calculation
      hoursBeforeAppointment = Math.floor(
        (appointmentDate.getTime() - cancellationDate.getTime()) / (1000 * 60 * 60)
      )
    }

    // Find the applicable rule based on comparison_type
    // For 'more_than': rule applies if hoursBeforeAppointment >= rule.hours_before_appointment
    // For 'less_than': rule applies if hoursBeforeAppointment <= rule.hours_before_appointment
    // If rule has exclude_sundays, we need to recalculate hours for that specific rule
    const applicableRule = policy.rules.find(rule => {
      let ruleHours = hoursBeforeAppointment
      
      // If this specific rule excludes Sundays, recalculate for this rule
      if (rule.exclude_sundays && !hasExcludeSundays) {
        ruleHours = calculateHoursExcludingSundays(cancellationDate, appointmentDate)
      }
      
      const comparisonType = rule.comparison_type || 'more_than' // Default to 'more_than' for backward compatibility
      if (comparisonType === 'more_than') {
        return ruleHours >= rule.hours_before_appointment
      } else {
        return ruleHours <= rule.hours_before_appointment
      }
    }) || policy.rules[policy.rules.length - 1] // Fallback to last rule

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
