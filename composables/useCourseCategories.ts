// composables/useCourseCategories.ts
import { ref, computed, watch } from 'vue'
import { getSupabase } from '~/utils/supabase'
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
  const supabase = getSupabase()
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
    const tenantId = forceTenantId || currentUser.value?.tenant_id
    
    console.log('🔄 loadCategories called', {
      currentUser: currentUser.value,
      forceTenantId,
      effectiveTenantId: tenantId
    })
    
    if (!tenantId) {
      console.warn('⚠️ No tenant_id available, skipping category load')
      return
    }

    console.log('📥 Loading categories for tenant:', tenantId)
    isLoading.value = true
    error.value = null

    try {
      const { data, error: loadError } = await supabase
        .from('course_categories')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('sort_order', { ascending: true })

      if (loadError) throw loadError
      
      console.log('✅ Categories loaded:', data?.length || 0, 'items')
      console.log('📋 Categories data:', data)
      
      categories.value = data || []

    } catch (err: any) {
      console.error('❌ Error loading course categories:', err)
      error.value = 'Fehler beim Laden der Kurskategorien'
    } finally {
      isLoading.value = false
    }
  }

  const createCategory = async (categoryData: Partial<CourseCategory>, tenantId?: string, userId?: string) => {
    // Debug logging
    console.log('🔍 createCategory called with:', {
      categoryData,
      tenantId,
      userId,
      currentUser: currentUser.value
    })
    
    const effectiveTenantId = tenantId || currentUser.value?.tenant_id
    const effectiveUserId = userId || currentUser.value?.id
    
    console.log('🔍 Effective IDs:', {
      effectiveTenantId,
      effectiveUserId
    })
    
    if (!effectiveTenantId) {
      console.error('❌ No tenant ID available:', {
        tenantId,
        currentUserTenantId: currentUser.value?.tenant_id,
        currentUser: currentUser.value
      })
      throw new Error('Kein Tenant verfügbar')
    }

    const { data, error: createError } = await supabase
      .from('course_categories')
      .insert({
        ...categoryData,
        tenant_id: effectiveTenantId,
        created_by: effectiveUserId
      })
      .select()
      .single()

    if (createError) throw createError
    
    // Reload categories
    await loadCategories()
    return data
  }

  const updateCategory = async (id: string, updates: Partial<CourseCategory>, forceTenantId?: string) => {
    const tenantId = forceTenantId || currentUser.value?.tenant_id
    
    console.log('🔍 updateCategory called', {
      id,
      updates,
      currentUser: currentUser.value,
      forceTenantId,
      effectiveTenantId: tenantId
    })
    
    if (!tenantId) {
      console.error('❌ No tenant ID available for update')
      throw new Error('Kein Tenant verfügbar')
    }

    const { data, error: updateError } = await supabase
      .from('course_categories')
      .update(updates)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (updateError) throw updateError
    
    // Reload categories with explicit tenant ID
    await loadCategories(tenantId)
    return data
  }

  const deleteCategory = async (id: string, forceTenantId?: string) => {
    // Soft delete by setting is_active to false
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
      requires_vehicle: category.default_requires_vehicle
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
