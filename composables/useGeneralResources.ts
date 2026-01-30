import { ref, computed, readonly } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { getSupabase } from '~/utils/supabase'

export interface GeneralResource {
  id: string
  tenant_id: string
  name: string
  description?: string
  resource_type: string
  is_active: boolean
  is_available: boolean
  location?: string
  properties: Record<string, any>
  created_at: string
  updated_at: string
  created_by?: string
  updated_by?: string
}

export interface CreateGeneralResourceData {
  name: string
  description?: string
  resource_type: string
  location?: string
  properties?: Record<string, any>
  is_active?: boolean
  is_available?: boolean
}

export interface UpdateGeneralResourceData {
  name?: string
  description?: string
  resource_type?: string
  location?: string
  properties?: Record<string, any>
  is_active?: boolean
  is_available?: boolean
}

export function useGeneralResources() {
  const supabase = getSupabase()
  const resources = ref<GeneralResource[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Resource types for dropdown
  const resourceTypes = [
    { value: 'equipment', label: 'Ausrüstung', icon: '🔧' },
    { value: 'material', label: 'Material', icon: '📦' },
    { value: 'tool', label: 'Werkzeug', icon: '🛠️' },
    { value: 'service', label: 'Service', icon: '⚙️' },
    { value: 'technology', label: 'Technologie', icon: '💻' },
    { value: 'other', label: 'Sonstiges', icon: '📋' }
  ]

  // Computed
  const activeResources = computed(() => 
    resources.value.filter(r => r.is_active)
  )

  const availableResources = computed(() => 
    resources.value.filter(r => r.is_active && r.is_available)
  )

  const resourcesByType = computed(() => {
    const grouped = resources.value.reduce((acc, resource) => {
      if (!acc[resource.resource_type]) {
        acc[resource.resource_type] = []
      }
      acc[resource.resource_type].push(resource)
      return acc
    }, {} as Record<string, GeneralResource[]>)

    return Object.entries(grouped).map(([type, resourcesList]) => ({
      type,
      typeInfo: resourceTypes.find(t => t.value === type) || { value: type, label: type, icon: '📋' },
      resources: resourcesList
    }))
  })

  // Methods
  const loadResources = async () => {
    if (isLoading.value) return
    
    isLoading.value = true
    error.value = null

    try {
      // Get current user's tenant_id
      const authStore = useAuthStore()
    if (!authStore.user) throw new Error('Not authenticated')

      const { data: userProfile } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('auth_user_id', user.id)
        .single()

      if (!userProfile?.tenant_id) throw new Error('Kein Tenant zugewiesen')

      const { data, error: fetchError } = await supabase
        .from('general_resources')
        .select('*')
        .eq('tenant_id', userProfile.tenant_id)
        .eq('is_active', true)
        .order('resource_type, name')

      if (fetchError) throw fetchError

      resources.value = data || []
    } catch (err: any) {
      error.value = err.message
      console.error('Error loading general resources:', err)
    } finally {
      isLoading.value = false
    }
  }

  const createResource = async (resourceData: CreateGeneralResourceData) => {
    try {
      // Get current user's tenant_id
      const authStore = useAuthStore()
    if (!authStore.user) throw new Error('Not authenticated')

      const { data: userProfile } = await supabase
        .from('users')
        .select('tenant_id, id')
        .eq('auth_user_id', user.id)
        .single()

      if (!userProfile?.tenant_id) throw new Error('Kein Tenant zugewiesen')

      const { data: createdResource, error: createError } = await supabase
        .from('general_resources')
        .insert({
          ...resourceData,
          tenant_id: userProfile.tenant_id,
          created_by: userProfile.id
        })
        .select()
        .single()

      if (createError) throw createError

      // Refresh resources list
      await loadResources()

      return createdResource
    } catch (err: any) {
      error.value = err.message
      console.error('Error creating general resource:', err)
      throw err
    }
  }

  const updateResource = async (id: string, resourceData: UpdateGeneralResourceData) => {
    try {
      // Get current user's tenant_id
      const authStore = useAuthStore()
    if (!authStore.user) throw new Error('Not authenticated')

      const { data: userProfile } = await supabase
        .from('users')
        .select('id, tenant_id')
        .eq('auth_user_id', user.id)
        .single()

      if (!userProfile?.tenant_id) throw new Error('Kein Tenant zugewiesen')

      const { data: updatedResource, error: updateError } = await supabase
        .from('general_resources')
        .update({
          ...resourceData,
          updated_by: userProfile.id
        })
        .eq('id', id)
        .eq('tenant_id', userProfile.tenant_id)
        .select()
        .single()

      if (updateError) throw updateError

      // Update local resources
      const index = resources.value.findIndex(r => r.id === id)
      if (index !== -1) {
        resources.value[index] = updatedResource
      }

      return updatedResource
    } catch (err: any) {
      error.value = err.message
      console.error('Error updating general resource:', err)
      throw err
    }
  }

  const deleteResource = async (id: string) => {
    try {
      // Get current user's tenant_id
      const authStore = useAuthStore()
    if (!authStore.user) throw new Error('Not authenticated')

      const { data: userProfile } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('auth_user_id', user.id)
        .single()

      if (!userProfile?.tenant_id) throw new Error('Kein Tenant zugewiesen')

      const { error: deleteError } = await supabase
        .from('general_resources')
        .delete()
        .eq('id', id)
        .eq('tenant_id', userProfile.tenant_id)

      if (deleteError) throw deleteError

      // Remove from local resources
      resources.value = resources.value.filter(r => r.id !== id)

      return true
    } catch (err: any) {
      error.value = err.message
      console.error('Error deleting general resource:', err)
      throw err
    }
  }

  const toggleAvailability = async (id: string) => {
    try {
      const resource = resources.value.find(r => r.id === id)
      if (!resource) throw new Error('Ressource nicht gefunden')

      return await updateResource(id, { 
        is_available: !resource.is_available 
      })
    } catch (err: any) {
      error.value = err.message
      console.error('Error toggling resource availability:', err)
      throw err
    }
  }

  return {
    // State
    resources: readonly(resources),
    isLoading: readonly(isLoading),
    error: readonly(error),
    
    // Computed
    activeResources,
    availableResources,
    resourcesByType,
    
    // Data
    resourceTypes,
    
    // Methods
    loadResources,
    createResource,
    updateResource,
    deleteResource,
    toggleAvailability
  }
}
