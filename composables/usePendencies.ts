import { ref, computed } from 'vue'
import { getSupabase } from '~/utils/supabase'

export interface Pendency {
  id: string
  tenant_id: string
  title: string
  description?: string
  status: 'pendent' | 'überfällig' | 'in_bearbeitung' | 'abgeschlossen' | 'gelöscht'
  priority: 'niedrig' | 'mittel' | 'hoch' | 'kritisch'
  category: string
  due_date: string
  assigned_to?: string
  recurrence_type: 'keine' | 'täglich' | 'wöchentlich' | 'monatlich' | 'jährlich'
  recurrence_end_date?: string
  created_at: string
  created_by?: string
  updated_at: string
  completed_at?: string
  deleted_at?: string
  tags: string[]
  attachments: any[]
  notes?: string
}

export const usePendencies = () => {
  const supabase = getSupabase()
  const pendencies = ref<Pendency[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Computed properties
  const pendentCount = computed(() => 
    pendencies.value.filter(p => p.status === 'pendent').length
  )

  const overdueCount = computed(() => 
    pendencies.value.filter(p => p.status === 'überfällig').length
  )

  const inProgressCount = computed(() => 
    pendencies.value.filter(p => p.status === 'in_bearbeitung').length
  )

  const completedCount = computed(() => 
    pendencies.value.filter(p => p.status === 'abgeschlossen').length
  )

  const sortedPendencies = computed(() => {
    return [...pendencies.value].sort((a, b) => {
      // Sort by priority first
      const priorityOrder = { 'kritisch': 0, 'hoch': 1, 'mittel': 2, 'niedrig': 3 }
      const priorityDiff = priorityOrder[a.priority as keyof typeof priorityOrder] - 
                           priorityOrder[b.priority as keyof typeof priorityOrder]
      if (priorityDiff !== 0) return priorityDiff
      
      // Then by due date
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
    })
  })

  // Load pendencies
  const loadPendencies = async (tenantId: string) => {
    isLoading.value = true
    error.value = null
    try {
      const { data, error: err } = await supabase
        .from('pendencies')
        .select('*')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .order('due_date', { ascending: true })

      if (err) throw err
      pendencies.value = data || []
    } catch (err: any) {
      error.value = err.message
      console.error('❌ Error loading pendencies:', err)
    } finally {
      isLoading.value = false
    }
  }

  // Create pendency
  const createPendency = async (pendency: Omit<Pendency, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error: err } = await supabase
        .from('pendencies')
        .insert([{
          ...pendency,
          tags: pendency.tags || [],
          attachments: pendency.attachments || []
        }])
        .select()
        .single()

      if (err) throw err
      pendencies.value.push(data)
      return data
    } catch (err: any) {
      error.value = err.message
      console.error('❌ Error creating pendency:', err)
      throw err
    }
  }

  // Update pendency
  const updatePendency = async (id: string, updates: Partial<Pendency>) => {
    try {
      const { data, error: err } = await supabase
        .from('pendencies')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (err) throw err
      
      // Update local state
      const index = pendencies.value.findIndex(p => p.id === id)
      if (index >= 0) {
        pendencies.value[index] = data
      }
      return data
    } catch (err: any) {
      error.value = err.message
      console.error('❌ Error updating pendency:', err)
      throw err
    }
  }

  // Change status
  const changeStatus = async (id: string, newStatus: Pendency['status']) => {
    const updates: any = { status: newStatus }
    if (newStatus === 'abgeschlossen') {
      updates.completed_at = new Date().toISOString()
    }
    return updatePendency(id, updates)
  }

  // Soft delete
  const deletePendency = async (id: string) => {
    return updatePendency(id, { 
      deleted_at: new Date().toISOString(),
      status: 'gelöscht'
    })
  }

  // Handle recurring pendencies
  const handleRecurrence = async (pendency: Pendency) => {
    if (pendency.recurrence_type === 'keine') return

    try {
      const dueDate = new Date(pendency.due_date)
      let newDueDate: Date

      switch (pendency.recurrence_type) {
        case 'täglich':
          newDueDate = new Date(dueDate.setDate(dueDate.getDate() + 1))
          break
        case 'wöchentlich':
          newDueDate = new Date(dueDate.setDate(dueDate.getDate() + 7))
          break
        case 'monatlich':
          newDueDate = new Date(dueDate.setMonth(dueDate.getMonth() + 1))
          break
        case 'jährlich':
          newDueDate = new Date(dueDate.setFullYear(dueDate.getFullYear() + 1))
          break
        default:
          return
      }

      // Check if we're past recurrence end date
      if (pendency.recurrence_end_date && newDueDate > new Date(pendency.recurrence_end_date)) {
        return
      }

      // Create new recurring pendency
      await createPendency({
        ...pendency,
        due_date: newDueDate.toISOString(),
        status: 'pendent',
        completed_at: undefined,
        created_by: pendency.created_by
      })
    } catch (err: any) {
      console.error('❌ Error handling recurrence:', err)
    }
  }

  // Get overdued pendencies
  const getOverduePendencies = () => {
    const now = new Date()
    return pendencies.value.filter(p => 
      (p.status === 'pendent' || p.status === 'in_bearbeitung') &&
      new Date(p.due_date) < now
    )
  }

  // Update overdued status
  const updateOverdueStatus = async (tenantId: string) => {
    const now = new Date().toISOString()
    const overdue = getOverduePendencies()

    for (const p of overdue) {
      if (p.status !== 'überfällig') {
        await updatePendency(p.id, { status: 'überfällig' })
      }
    }
  }

  return {
    // State
    pendencies,
    isLoading,
    error,

    // Computed
    pendentCount,
    overdueCount,
    inProgressCount,
    completedCount,
    sortedPendencies,

    // Methods
    loadPendencies,
    createPendency,
    updatePendency,
    changeStatus,
    deletePendency,
    handleRecurrence,
    getOverduePendencies,
    updateOverdueStatus
  }
}

