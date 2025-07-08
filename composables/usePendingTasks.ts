// composables/usePendingTasks.ts
import { ref, computed, reactive } from 'vue'
import { getSupabase } from '~/utils/supabase'

// Typen für bessere Typsicherheit
interface PendingAppointment {
  id: string
  title: string
  start_time: string
  end_time: string
  user_id: string
  status: string
  users: {
    first_name: string
    last_name: string
  }
  notes: Array<{
    id: string
    staff_rating?: number
    staff_note?: string
  }>
}

// SINGLETON PATTERN - Globaler reaktiver State
const globalState = reactive({
  pendingAppointments: [] as PendingAppointment[],
  isLoading: false,
  error: null as string | null
})

// Computed values basierend auf globalem State
const pendingCount = computed(() => globalState.pendingAppointments.length)

const buttonClasses = computed(() =>
  `text-white font-bold px-4 py-2 rounded-xl shadow-lg transform active:scale-95 transition-all duration-200
  ${pendingCount.value > 0 ? 'bg-red-600 hover:bg-red-700' : 'bg-green-500 hover:bg-green-600'}`
)

const buttonText = computed(() => 
  `Pendenzen${pendingCount.value > 0 ? `(${pendingCount.value})` : '(0)'}`
)

// Hilfsfunktion für formatierte Anzeige
const getFormattedAppointment = (appointment: PendingAppointment) => {
  const startDate = new Date(appointment.start_time)
  const endDate = new Date(appointment.end_time)
  
  return {
    ...appointment,
    formattedDate: startDate.toLocaleDateString('de-CH'),
    formattedStartTime: startDate.toLocaleTimeString('de-CH', { 
      hour: '2-digit', 
      minute: '2-digit' 
    }),
    formattedEndTime: endDate.toLocaleTimeString('de-CH', { 
      hour: '2-digit', 
      minute: '2-digit' 
    }),
    studentName: `${appointment.users.first_name} ${appointment.users.last_name}`,
    duration: Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60)) // Minuten
  }
}

// Computed für direkt formatierte Appointments
const formattedAppointments = computed(() => {
  return globalState.pendingAppointments.map(appointment => getFormattedAppointment(appointment))
})

// SINGLETON FUNCTIONS - Funktionen operieren auf globalem State
const fetchPendingTasks = async (staffId: string) => {
  console.log('🔥 fetchPendingTasks starting for staff:', staffId)
  globalState.isLoading = true
  globalState.error = null

  try {
    const supabase = getSupabase()
    
    // Vergangene Termine des Fahrlehrers abrufen
    const { data, error: fetchError } = await supabase
      .from('appointments')
      .select(`
        id,
        title,
        start_time,
        end_time,
        user_id,
        status,
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
      .lt('end_time', new Date().toISOString()) // Nur vergangene Termine
      .eq('status', 'completed') // Nur abgeschlossene Termine
      .order('start_time', { ascending: false }) // Neueste zuerst

    if (fetchError) throw fetchError

    console.log('🔥 Fetched appointments:', data?.length)

    // Termine ohne Bewertung filtern
    const pending: PendingAppointment[] = (data || []).filter((appointment: any) => {
      // Prüfen ob eine gültige Bewertung vorhanden ist
      const hasValidRating = appointment.notes && 
        appointment.notes.length > 0 && 
        appointment.notes.some((note: any) => 
          note.staff_rating && 
          note.staff_rating >= 1 && 
          note.staff_rating <= 6 && // Entsprechend Ihrer Skala 1-6
          note.staff_note && 
          note.staff_note.trim().length > 0
        )

      console.log(`🔥 Appointment ${appointment.id}: hasValidRating=${hasValidRating}`)
      return !hasValidRating // Pending wenn keine gültige Bewertung
    }).map((appointment: any): PendingAppointment => ({
      id: appointment.id,
      title: appointment.title,
      start_time: appointment.start_time,
      end_time: appointment.end_time,
      user_id: appointment.user_id,
      status: appointment.status,
      users: appointment.users,
      notes: appointment.notes
    }))

    console.log('🔥 Filtered pending appointments:', pending.length)
    
    // WICHTIG: Globalen State komplett ersetzen (nicht mutieren)
    globalState.pendingAppointments.splice(0, globalState.pendingAppointments.length, ...pending)
    console.log('🔥 Global pending state updated, count:', pendingCount.value)
    
  } catch (err: any) {
    globalState.error = err?.message || 'Fehler beim Laden der Pendenzen'
    console.error('❌ Fehler beim Laden der Pendenzen:', err)
  } finally {
    globalState.isLoading = false
  }
}

const markAsCompleted = async (
  appointmentId: string, 
  rating: number, 
  note: string,
  currentUserId?: string
) => {
  try {
    // Validierung entsprechend Ihrer Skala
    if (rating < 1 || rating > 6) {
      throw new Error('Bewertung muss zwischen 1 und 6 liegen')
    }

    if (!note || note.trim().length === 0) {
      throw new Error('Eine Notiz ist erforderlich')
    }

    const supabase = getSupabase()
    
    const { error } = await supabase
      .from('notes')
      .upsert({
        appointment_id: appointmentId,
        staff_rating: rating,
        staff_note: note.trim(),
        last_updated_by_user_id: currentUserId || null,
        last_updated_at: new Date().toISOString()
      })

    if (error) throw error

    // Aus GLOBALEM State entfernen (splice verwenden statt filter)
    const index = globalState.pendingAppointments.findIndex(
      (appointment) => appointment.id === appointmentId
    )
    if (index > -1) {
      globalState.pendingAppointments.splice(index, 1)
    }

    console.log('✅ Bewertung erfolgreich gespeichert und aus globalem State entfernt:', appointmentId)
    console.log('🔥 New global pending count:', pendingCount.value)
    
  } catch (err: any) {
    globalState.error = err?.message || 'Fehler beim Speichern der Bewertung'
    console.error('❌ Fehler beim Speichern der Bewertung:', err)
    throw err
  }
}

const markMultipleAsCompleted = async (
  completions: Array<{
    appointmentId: string
    rating: number
    note: string
  }>,
  currentUserId?: string
) => {
  try {
    const supabase = getSupabase()
    
    const notesToInsert = completions.map(({ appointmentId, rating, note }) => ({
      appointment_id: appointmentId,
      staff_rating: rating,
      staff_note: note.trim(),
      last_updated_by_user_id: currentUserId || null,
      last_updated_at: new Date().toISOString()
    }))

    const { error } = await supabase
      .from('notes')
      .upsert(notesToInsert)

    if (error) throw error

    // Alle bewerteten Termine aus der GLOBALEN Liste entfernen (splice verwenden)
    const completedIds = completions.map(c => c.appointmentId)
    
    // Rückwärts durch das Array gehen, um Index-Probleme zu vermeiden
    for (let i = globalState.pendingAppointments.length - 1; i >= 0; i--) {
      if (completedIds.includes(globalState.pendingAppointments[i].id)) {
        globalState.pendingAppointments.splice(i, 1)
      }
    }

    console.log('✅ Mehrere Bewertungen erfolgreich gespeichert:', completedIds.length)
    console.log('🔥 New global pending count:', pendingCount.value)
    
  } catch (err: any) {
    globalState.error = err?.message || 'Fehler beim Speichern der Bewertungen'
    console.error('❌ Fehler beim Speichern der Bewertungen:', err)
    throw err
  }
}

const refreshPendingTasks = async (staffId: string) => {
  await fetchPendingTasks(staffId)
}

const clearError = () => {
  globalState.error = null
}

// SINGLETON EXPORT - Immer dieselbe Instanz zurückgeben
export const usePendingTasks = () => {
  console.log('🔄 usePendingTasks called - returning singleton instance')
  console.log('🔥 Current global pending count:', pendingCount.value)
  
  return {
    // Reactive state - direkte Referenzen auf reactive state
    pendingAppointments: computed(() => globalState.pendingAppointments),
    formattedAppointments,
    pendingCount,
    buttonClasses,
    buttonText,
    isLoading: computed(() => globalState.isLoading),
    error: computed(() => globalState.error),
    
    // Actions
    fetchPendingTasks,
    markAsCompleted,
    markMultipleAsCompleted,
    refreshPendingTasks,
    clearError,
    
    // Utilities
    getFormattedAppointment
  }
}