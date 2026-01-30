// Composable for loading tenant-specific evaluation data
// This handles the fallback from tenant-specific to global defaults

import { ref, computed } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { getSupabase } from '~/utils/supabase'

const supabase = getSupabase()

// State
const categories = ref<any[]>([])
const criteria = ref<any[]>([])
const scale = ref<any[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)

// Computed
const categoriesByTenant = computed(() => {
  return categories.value.filter(cat => cat.tenant_id !== null)
})

const criteriaByTenant = computed(() => {
  return criteria.value.filter(crit => crit.tenant_id !== null)
})

const scaleByTenant = computed(() => {
  return scale.value.filter(s => s.tenant_id !== null)
})

const globalCategories = computed(() => {
  return categories.value.filter(cat => cat.tenant_id === null)
})

const globalCriteria = computed(() => {
  return criteria.value.filter(crit => crit.tenant_id === null)
})

const globalScale = computed(() => {
  return scale.value.filter(s => s.tenant_id === null)
})

// Methods
const loadEvaluationData = async (tenantId?: string) => {
  isLoading.value = true
  error.value = null
  
  try {
    // Get current user's tenant if not provided
    if (!tenantId) {
      const authStore = useAuthStore()
      const user = authStore.user
      const { data: userProfile } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('auth_user_id', user?.id)
        .single()
      
      tenantId = userProfile?.tenant_id
    }

    if (!tenantId) {
      throw new Error('No tenant ID available')
    }

    // Load tenant-specific data with fallback to global defaults
    const { data: evaluationData, error: evalError } = await supabase
      .rpc('get_evaluation_data_for_tenant', { tenant_uuid: tenantId })

    if (evalError) throw evalError

    // Process the data
    const categoriesData = evaluationData?.find(d => d.table_name === 'categories')?.data || []
    const criteriaData = evaluationData?.find(d => d.table_name === 'criteria')?.data || []
    const scaleData = evaluationData?.find(d => d.table_name === 'scale')?.data || []

    categories.value = categoriesData
    criteria.value = criteriaData
    scale.value = scaleData

    logger.debug('✅ Evaluation data loaded for tenant:', tenantId)
    logger.debug('- Categories:', categories.value.length)
    logger.debug('- Criteria:', criteria.value.length)
    logger.debug('- Scale:', scale.value.length)

  } catch (err: any) {
    error.value = err.message || 'Failed to load evaluation data'
    console.error('❌ Error loading evaluation data:', err)
  } finally {
    isLoading.value = false
  }
}

const copyDefaultsToTenant = async (tenantId: string) => {
  try {
    const { error } = await supabase
      .rpc('copy_default_evaluation_data_to_tenant', { target_tenant_id: tenantId })

    if (error) throw error

    logger.debug('✅ Default evaluation data copied to tenant:', tenantId)
    
    // Reload data after copying
    await loadEvaluationData(tenantId)
    
  } catch (err: any) {
    error.value = err.message || 'Failed to copy default data'
    console.error('❌ Error copying default data:', err)
  }
}

const getCriteriaForCategory = (categoryId: string) => {
  return criteria.value.filter(crit => crit.category_id === categoryId)
}

const getCriteriaForDrivingCategory = (drivingCategory: string) => {
  return criteria.value.filter(crit => 
    crit.driving_categories && 
    crit.driving_categories.includes(drivingCategory)
  )
}

// Export
export const useEvaluationData = () => {
  return {
    // State
    categories,
    criteria,
    scale,
    isLoading,
    error,
    
    // Computed
    categoriesByTenant,
    criteriaByTenant,
    scaleByTenant,
    globalCategories,
    globalCriteria,
    globalScale,
    
    // Methods
    loadEvaluationData,
    copyDefaultsToTenant,
    getCriteriaForCategory,
    getCriteriaForDrivingCategory
  }
}
