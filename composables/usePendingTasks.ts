// composables/usePendingTasks.ts
import { ref, computed } from 'vue'
import { getSupabase } from '~/utils/supabase'

export const usePendingTasks = () => {
  const pendingTasks = ref<any[]>([])  // Verwende any[] für Supabase
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const pendingCount = computed(() => pendingTasks.value.length)

  const buttonClasses = computed(() => 
    `text-white font-bold px-4 py-2 rounded-xl shadow-lg transform active:scale-95 transition-all duration-200
     ${pendingCount.value > 0 ? 'bg-red-600 hover:bg-red-700' : 'bg-green-500 hover:bg-green-600'}`
  )

  const fetchPendingTasks = async (staffId: string) => {
    isLoading.value = true
    error.value = null
    
    try {
      const supabase = getSupabase()
      
      const { data, error: fetchError } = await supabase
        .from('appointments')
        .select(`
          id,
          title,
          start_time,
          end_time,
          user_id,
          users!appointments_user_id_fkey (
            first_name,
            last_name
          ),
          notes (
            id,
            staff_rating,
            staff_note
          )
        `)
        .eq('staff_id', staffId)
        .lt('end_time', new Date().toISOString())
        .eq('status', 'completed')
        
      if (fetchError) throw fetchError

      const pending = (data || []).filter((appointment: any) => {
        const hasNote = appointment.notes && appointment.notes.length > 0
        const hasRating = hasNote && appointment.notes.some((note: any) => note.staff_rating !== null)
        const hasText = hasNote && appointment.notes.some((note: any) => note.staff_note && note.staff_note.trim() !== '')
        
        return !hasRating || !hasText
      })

      pendingTasks.value = pending
      
    } catch (err: any) {
      error.value = err?.message || 'Unbekannter Fehler'
      console.error('Fehler beim Laden der Pendenzen:', err)
    } finally {
      isLoading.value = false
    }
  }

  const markAsCompleted = async (appointmentId: string, rating: number, note: string) => {
    try {
      const supabase = getSupabase()
      
      const { error } = await supabase
        .from('notes')
        .upsert({
          appointment_id: appointmentId,
          staff_rating: rating,
          staff_note: note,
          last_updated_at: new Date().toISOString()
        })
        
      if (error) throw error
      
      // Remove from pending list
      pendingTasks.value = pendingTasks.value.filter((task: any) => task.id !== appointmentId)
      
    } catch (err: any) {
      error.value = err?.message || 'Unbekannter Fehler'
      throw err
    }
  }

  return {
    pendingTasks,
    pendingCount,
    buttonClasses,
    isLoading,
    error,
    fetchPendingTasks,
    markAsCompleted
  }
}