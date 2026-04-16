// composables/useTrialFeatures.ts
import { ref, computed, watch } from 'vue'
import { getSupabase } from '~/utils/supabase'
import { useAuthStore } from '~/stores/auth'

interface TenantTrialInfo {
  is_trial?: boolean
  trial_ends_at?: string | null
  subscription_plan?: string | null
  current_period_end?: string | null
}

export const useTrialFeatures = () => {
  const supabase = getSupabase()
  const auth = useAuthStore()

  const tenant = ref<TenantTrialInfo | null>(null)

  const loadTenantTrial = async (tenantId?: string | null) => {
    if (!tenantId) {
      tenant.value = null
      return
    }
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('is_trial, trial_ends_at, subscription_plan, current_period_end')
        .eq('id', tenantId)
        .maybeSingle()

      if (error) throw error
      tenant.value = data || null
    } catch (e) {
      console.error('Failed to load tenant trial info:', e)
      tenant.value = null
    }
  }

  // Beim Start und wenn sich das Profil ändert, neu laden
  watch(
    () => auth.userProfile?.tenant_id,
    (tid) => { loadTenantTrial(tid || null) },
    { immediate: true }
  )

  // True if the tenant has an active paid subscription (regardless of trial)
  const hasActiveSubscription = computed(() => {
    const plan = tenant.value?.subscription_plan
    if (!plan || plan === 'trial') return false
    const periodEnd = tenant.value?.current_period_end
    if (!periodEnd) return false
    return new Date() <= new Date(periodEnd)
  })

  const isTrialExpired = computed(() => {
    // If they have a paid subscription they're never "expired"
    if (hasActiveSubscription.value) return false
    if (!tenant.value?.is_trial || !tenant.value?.trial_ends_at) return false
    const trialEndsAt = new Date(tenant.value.trial_ends_at)
    return new Date() > trialEndsAt
  })

  const trialDaysLeft = computed(() => {
    if (!tenant.value?.is_trial || !tenant.value?.trial_ends_at) return null
    const trialEndsAt = new Date(tenant.value.trial_ends_at)
    const now = new Date()
    const daysLeft = Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return Math.max(0, daysLeft)
  })

  const showTrialWarning = computed(() => {
    return !!(tenant.value?.is_trial && (trialDaysLeft.value ?? 0) <= 7)
  })

  const canUseFeature = (feature: string) => {
    if (!tenant.value?.is_trial) return true
    if (!isTrialExpired.value) return true

    const trialFeatures = ['basic_appointments', 'basic_customers', 'basic_calendar', 'view_profile']
    return trialFeatures.includes(feature)
  }

  const getTrialStatus = () => {
    if (hasActiveSubscription.value) {
      return { status: 'active', message: 'Aktives Abonnement' }
    }

    if (!tenant.value?.is_trial) {
      return { status: 'active', message: 'Vollzugriff verfügbar' }
    }

    if (isTrialExpired.value) {
      return { status: 'expired', message: 'Trial abgelaufen – Upgrade erforderlich', daysLeft: 0 }
    }

    const days = trialDaysLeft.value || 0
    if (days <= 7) {
      return { status: 'warning', message: `Trial endet in ${days} Tagen`, daysLeft: days }
    }

    return { status: 'active', message: `Trial läuft noch ${days} Tage`, daysLeft: days }
  }

  return {
    isTrialExpired,
    trialDaysLeft,
    showTrialWarning,
    canUseFeature,
    getTrialStatus,
    hasActiveSubscription,
    subscriptionPlan: computed(() => tenant.value?.subscription_plan ?? null),
  }
}


