// composables/useCourseCategories.ts
import { ref, computed } from 'vue'
import { useCurrentUser } from '~/composables/useCurrentUser'

interface CourseCategory {
  id: string
  tenant_id: string
  code: string
  name: string
  description: string | null
  sari_category_code: string | null
  requires_sari_sync: boolean
  default_max_participants: number
  default_price_rappen: number
  default_requires_room: boolean
  default_requires_vehicle: boolean
  color: string
  icon: string
  is_active: boolean
  sort_order: number
  // New duration fields
  total_duration_hours: number
  session_count: number
  hours_per_session: number
  session_structure: any
  created_at: string
  updated_at: string
  created_by: string | null
}

export const useCourseCategories = () => {
  const { currentUser } = useCurrentUser()
  
  const categories = ref<CourseCategory[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Computed
  const activeCategories = computed(() => 
    categories.value.filter(cat => cat.is_active).sort((a, b) => a.sort_order - b.sort_order)
  )

  const sariCategories = computed(() => 
    activeCategories.value.filter(cat => cat.requires_sari_sync)
  )

  const privatCategories = computed(() => 
    activeCategories.value.filter(cat => !cat.requires_sari_sync)
  )

  // Methods
  const loadCategories = async (forceTenantId?: string) => {
    logger.debug('🔄 loadCategories called (via server API)')

    isLoading.value = true
    error.value = null

    try {
      const response = await $fetch<{ categories: CourseCategory[] }>('/api/admin/course-categories')
      logger.debug('✅ Categories loaded:', response.categories?.length || 0, 'items')
      categories.value = response.categories || []
    } catch (err: any) {
      console.error('❌ Error loading course categories:', err)
      error.value = 'Fehler beim Laden der Kurskategorien'
    } finally {
      isLoading.value = false
    }
  }

  const createCategory = async (categoryData: Partial<CourseCategory>, tenantId?: string, userId?: string) => {
    logger.debug('🔍 createCategory called (via server API)')
    const { data } = await $fetch<{ success: boolean; data: CourseCategory }>('/api/admin/course-categories/save', {
      method: 'POST',
      body: categoryData
    })
    await loadCategories()
    return data
  }

  const updateCategory = async (id: string, updates: Partial<CourseCategory>, forceTenantId?: string) => {
    logger.debug('🔍 updateCategory called (via server API)', { id })
    const { data } = await $fetch<{ success: boolean; data: CourseCategory }>('/api/admin/course-categories/save', {
      method: 'POST',
      body: { categoryId: id, ...updates }
    })
    await loadCategories()
    return data
  }

  const deleteCategory = async (id: string, forceTenantId?: string) => {
    await updateCategory(id, { is_active: false }, forceTenantId)
  }

  const getCategoryByCode = (code: string) => {
    return categories.value.find(cat => cat.code === code && cat.is_active)
  }

  const getCategoryDefaults = (categoryId: string) => {
    const category = categories.value.find(cat => cat.id === categoryId)
    if (!category) return null

    return {
      max_participants: category.default_max_participants,
      price_rappen: category.default_price_rappen,
      requires_room: category.default_requires_room,
      requires_vehicle: category.default_requires_vehicle,
      default_room_id: category.default_room_id,
      default_vehicle_id: category.default_vehicle_id
    }
  }

  const formatCategoryForSelect = (category: CourseCategory) => ({
    value: category.id,
    label: `${category.icon} ${category.name}`,
    code: category.code,
    description: category.description,
    color: category.color,
    sari: category.requires_sari_sync,
    duration: formatCourseDuration(category)
  })

  const formatCourseDuration = (category: CourseCategory) => {
    if (!category.session_count || !category.hours_per_session) return 'Dauer nicht definiert'
    
    if (category.session_count === 1) {
      return `${category.total_duration_hours}h (1 Termin)`
    } else {
      return `${category.session_count} x ${category.hours_per_session}h (${category.total_duration_hours}h total)`
    }
  }

  const getSessionStructureDescription = (category: CourseCategory) => {
    return category.session_structure?.description || formatCourseDuration(category)
  }

  const getDurationDefaults = (categoryId: string) => {
    const category = categories.value.find(cat => cat.id === categoryId)
    if (!category) return null

    return {
      total_duration_hours: category.total_duration_hours,
      session_count: category.session_count,
      hours_per_session: category.hours_per_session,
      session_structure: category.session_structure,
      formatted_duration: formatCourseDuration(category)
    }
  }

  // Note: Categories are loaded manually from the consuming component
  // to ensure proper timing with currentUser availability

  return {
    categories,
    activeCategories,
    sariCategories,
    privatCategories,
    isLoading,
    error,
    loadCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    getCategoryByCode,
    getCategoryDefaults,
    formatCategoryForSelect
  }
}
