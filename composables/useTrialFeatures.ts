// composables/useTrialFeatures.ts
export const useTrialFeatures = () => {
  const { tenant } = useAuth()
  
  const isTrialExpired = computed(() => {
    if (!tenant.value?.is_trial) return false
    const trialEndsAt = new Date(tenant.value.trial_ends_at)
    const now = new Date()
    return now > trialEndsAt
  })
  
  const trialDaysLeft = computed(() => {
    if (!tenant.value?.is_trial) return null
    const trialEndsAt = new Date(tenant.value.trial_ends_at)
    const now = new Date()
    const daysLeft = Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return Math.max(0, daysLeft)
  })
  
  const showTrialWarning = computed(() => {
    return tenant.value?.is_trial && trialDaysLeft.value !== null && trialDaysLeft.value <= 7
  })
  
  const canUseFeature = (feature: string) => {
    if (!tenant.value?.is_trial) return true // Nicht im Trial = alle Features verfügbar
    if (!isTrialExpired.value) return true // Trial noch aktiv = alle Features verfügbar
    
    // Trial abgelaufen - nur Basis-Features erlauben
    const trialFeatures = [
      'basic_appointments',
      'basic_customers', 
      'basic_calendar',
      'view_profile'
    ]
    
    return trialFeatures.includes(feature)
  }
  
  const getTrialStatus = () => {
    if (!tenant.value?.is_trial) {
      return { status: 'active', message: 'Vollzugriff verfügbar' }
    }
    
    if (isTrialExpired.value) {
      return { 
        status: 'expired', 
        message: 'Trial abgelaufen - Upgrade erforderlich',
        daysLeft: 0
      }
    }
    
    const days = trialDaysLeft.value || 0
    if (days <= 7) {
      return { 
        status: 'warning', 
        message: `Trial endet in ${days} Tagen`,
        daysLeft: days
      }
    }
    
    return { 
      status: 'active', 
      message: `Trial läuft noch ${days} Tage`,
      daysLeft: days
    }
  }
  
  return {
    isTrialExpired,
    trialDaysLeft,
    showTrialWarning,
    canUseFeature,
    getTrialStatus
  }
}


