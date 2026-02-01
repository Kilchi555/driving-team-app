import { ref, computed } from 'vue'
import { useAuthStore } from '~/stores/auth'

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

      logger.debug('🔍 Cancellation Policies - Fetching policies...')

      const response = await $fetch('/api/cancellation-policies/manage', {
        method: 'POST',
        body: {
          action: 'list',
          appliesTo
        }
      }) as any

      if (!response?.success) {
        throw new Error('Failed to fetch policies')
      }

      const policiesWithRulesData = response?.data || []
      
      // Extract just policies (without rules) for policies.value
      const policiesOnly = policiesWithRulesData.map((p: any) => {
        const { rules, ...policy } = p
        return policy
      })
      
      policies.value = policiesOnly
      policiesWithRules.value = policiesWithRulesData

      // Set default policy
      const defaultPol = policiesWithRulesData.find((p: any) => p.is_default)
      if (defaultPol) {
        defaultPolicy.value = defaultPol
      }
      
      logger.debug('📋 Policies loaded via API:', {
        totalPolicies: policiesWithRulesData.length,
        defaultPolicy: defaultPolicy.value?.name || 'NOT SET'
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

      logger.debug('📋 Fetching ALL cancellation policies...')

      const response = await $fetch('/api/cancellation-policies/manage', {
        method: 'POST',
        body: {
          action: 'fetch-all'
        }
      }) as any

      if (!response?.success) {
        throw new Error('Failed to fetch all policies')
      }

      const policiesWithRulesData = response?.data || []
      
      // Extract just policies (without rules) for policies.value
      const policiesOnly = policiesWithRulesData.map((p: any) => {
        const { rules, ...policy } = p
        return policy
      })
      
      policies.value = policiesOnly
      policiesWithRules.value = policiesWithRulesData

      // Set default policy
      const defaultPol = policiesWithRulesData.find((p: any) => p.is_default)
      if (defaultPol) {
        defaultPolicy.value = defaultPol
      }

      logger.debug('📋 All policies loaded via API:', {
        totalPolicies: policiesWithRulesData.length
      })
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

      logger.debug('➕ Creating new cancellation policy...')

      // Ensure applies_to is set (default to 'appointments' for backward compatibility)
      const policyWithAppliesTo = {
        ...policyData,
        applies_to: policyData.applies_to || 'appointments'
      }

      const response = await $fetch('/api/cancellation-policies/manage', {
        method: 'POST',
        body: {
          action: 'create-policy',
          policyData: policyWithAppliesTo
        }
      }) as any

      if (!response?.success) {
        throw new Error('Failed to create policy')
      }

      logger.debug('✅ Policy created')

      // Refresh the list
      await fetchAllPolicies()
      return response?.data
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

      const response = await $fetch('/api/cancellation-policies/manage', {
        method: 'POST',
        body: {
          action: 'update-policy',
          policyId: id,
          updates
        }
      }) as any

      if (!response?.success) {
        throw new Error('Failed to update policy')
      }

      // Refresh the list
      await fetchAllPolicies()
      return response?.data
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

      const response = await $fetch('/api/cancellation-policies/manage', {
        method: 'POST',
        body: {
          action: 'delete-policy',
          policyId: id
        }
      }) as any

      if (!response?.success) {
        throw new Error('Failed to delete policy')
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

      const response = await $fetch('/api/cancellation-policies/manage', {
        method: 'POST',
        body: {
          action: 'create-rule',
          ruleData
        }
      }) as any

      if (!response?.success) {
        throw new Error('Failed to create rule')
      }

      // Refresh the list
      await fetchAllPolicies()
      return response?.data
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

      const response = await $fetch('/api/cancellation-policies/manage', {
        method: 'POST',
        body: {
          action: 'update-rule',
          ruleId: id,
          updates
        }
      }) as any

      if (!response?.success) {
        throw new Error('Failed to update rule')
      }

      // Refresh the list
      await fetchAllPolicies()
      return response?.data
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

      const response = await $fetch('/api/cancellation-policies/manage', {
        method: 'POST',
        body: {
          action: 'delete-rule',
          ruleId: id
        }
      }) as any

      if (!response?.success) {
        throw new Error('Failed to delete rule')
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

      const response = await $fetch('/api/cancellation-policies/manage', {
        method: 'POST',
        body: {
          action: 'set-default',
          policyId
        }
      }) as any

      if (!response?.success) {
        throw new Error('Failed to set default policy')
      }

      // Refresh the list
      await fetchAllPolicies()
      return response?.data
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
