// composables/usePendingTasks.ts
import { ref, computed, reactive } from 'vue'
import { getSupabase } from '~/utils/supabase'
import { toLocalTimeString } from '~/utils/dateUtils'

// Typen für bessere Typsicherheit
interface PendingAppointment {
  id: string
  title: string
  start_time: string
  end_time: string
  user_id: string
  status: string
  type: string // ✅ Kategorie des Termins (A, B, etc.)
  event_type_code: string
  users: {
    first_name: string
    last_name: string
    category?: string // ✅ Kategorie des Schülers
  }
  // Da wir nur Kriterien-Bewertungen wollen, passen wir den Typ an
  // Die notes Property sollte hier nur die Kriterien-spezifischen Notizen halten
  notes: Array<{
    id: string
    criteria_rating?: number
    criteria_note?: string
    evaluation_criteria_id?: string
  }>
  // Neue Zahlungsinformationen
  payments?: Array<{
    id: string
    payment_method: string
    payment_status: string
    total_amount_rappen: number
    metadata?: any
  }>
}

// Typ für die Daten, die von saveCriteriaEvaluations erwartet werden
export interface CriteriaEvaluationData {
  criteria_id: string; // evaluation_criteria_id
  rating: number;     // criteria_rating
  note: string;       // criteria_note
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
  // ✅ WICHTIG: Zeiten als lokale Zeiten behandeln (nicht UTC)
  // Die Zeiten werden in der DB als lokale Zeiten gespeichert
  // JavaScript interpretiert sie standardmäßig als UTC, daher müssen wir sie korrekt parsen
  
  // Parse start_time als lokale Zeit
  const startDate = parseLocalDateTime(appointment.start_time)
  
  // Parse end_time als lokale Zeit  
  const endDate = parseLocalDateTime(appointment.end_time)
  
  // Zahlungsinformationen verarbeiten
  const paymentInfo = appointment.payments && appointment.payments.length > 0 
    ? appointment.payments[0] // Nehme den ersten Payment (sollte nur einer sein)
    : null
  
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
    duration: Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60)), // Minuten
    // Neue Zahlungsinformationen
    paymentMethod: paymentInfo?.payment_method || 'keine',
    paymentStatus: paymentInfo?.payment_status || 'keine',
    paymentAmount: paymentInfo?.total_amount_rappen ? (paymentInfo.total_amount_rappen / 100).toFixed(2) : '0.00',
    hasPayment: !!paymentInfo
  }
}

// ✅ Hilfsfunktion: Parse DateTime-String als lokale Zeit
const parseLocalDateTime = (dateTimeStr: string): Date => {
  // Entferne 'Z' falls vorhanden (UTC-Indikator)
  const cleanStr = dateTimeStr.replace('Z', '')
  
  // Parse als lokale Zeit
  const [datePart, timePart] = cleanStr.split('T')
  const [year, month, day] = datePart.split('-').map(Number)
  const [hour, minute, second] = timePart.split(':').map(Number)
  
  // Erstelle Date-Objekt in lokaler Zeitzone
  return new Date(year, month - 1, day, hour, minute, second || 0)
}

// Computed für direkt formatierte Appointments
const formattedAppointments = computed(() => {
  return globalState.pendingAppointments.map(appointment => getFormattedAppointment(appointment))
})

// SINGLETON FUNCTIONS - Funktionen operieren auf globalem State
const fetchPendingTasks = async (userId: string, userRole?: string) => {
  console.log('🔥 fetchPendingTasks starting for user:', userId, 'with role:', userRole)
  globalState.isLoading = true
  globalState.error = null

  try {
    const supabase = getSupabase()
    
    // Je nach User-Rolle unterschiedliche Abfragen
    let query = supabase
      .from('appointments')
      .select(`
        id,
        title,
        start_time,
        end_time,
        user_id,
        status,
        event_type_code,
        type,
        users!appointments_user_id_fkey (
          first_name,
          last_name,
          category
        ),
        notes (
          evaluation_criteria_id,
          criteria_rating
        ),
        exam_results (
          id,
          passed
        ),
        payments (
          id,
          payment_method,
          payment_status,
          total_amount_rappen,
          metadata
        )
      `)
    
    // Für Staff/Admin: Nach staff_id filtern (ihre eigenen Termine)
    // Für Client: Nach user_id filtern (ihre eigenen Termine)
    if (userRole === 'client') {
      console.log('🔥 Client detected - filtering by user_id')
      query = query.eq('user_id', userId)
    } else {
      console.log('🔥 Staff/Admin detected - filtering by staff_id')
      query = query.eq('staff_id', userId)
    }
    
    // Debug: Zeige die aktuelle Query
    console.log('🔥 Query filter:', userRole === 'client' ? 'user_id' : 'staff_id', '=', userId)
    
    // Rest der Abfrage
    const { data, error: fetchError } = await query
      .lt('end_time', toLocalTimeString(new Date)) // ✅ Nur Termine in der Vergangenheit
      .in('status', ['completed', 'confirmed', 'scheduled']) // Alle relevanten Status für Pendenzen
      .is('deleted_at', null) // ✅ Soft Delete Filter - nur nicht gelöschte Termine
      .order('start_time', { ascending: true }) // Neueste zuerst

    if (fetchError) throw fetchError

    console.log('🔥 Fetched appointments (raw data):', data?.length)
    console.log('🔥 Raw appointments data:', data)
    console.log('🔥 Current time for comparison:', toLocalTimeString(new Date()))
    console.log('🔥 User ID being searched:', userId)

    // Termine ohne Kriterienbewertung oder Prüfungsergebnis filtern
    const pending: PendingAppointment[] = (data || []).filter((appointment: any) => {
      // ✅ Zusätzlicher Filter: Stelle sicher, dass nur nicht gelöschte Termine angezeigt werden
      console.log(`🔥 Checking appointment ${appointment.id}: deleted_at = "${appointment.deleted_at}" (type: ${typeof appointment.deleted_at})`)
      
      if (appointment.deleted_at !== null && appointment.deleted_at !== undefined) {
        console.log(`🔥 Skipping deleted appointment: ${appointment.id} (${appointment.title})`)
        return false
      }
      
      // Ein Termin ist "pending", wenn er KEINE Kriterien-Bewertung UND KEIN Prüfungsergebnis hat.
      
      // Prüfe auf Kriterien-Bewertung
      const hasCriteriaEvaluation = appointment.notes && 
        appointment.notes.some((note: any) => 
          note.evaluation_criteria_id !== null && 
          note.criteria_rating !== null
        );

      // Prüfe auf Prüfungsergebnis
      const hasExamResult = appointment.exam_results && 
        appointment.exam_results.length > 0;

      // Termin ist erledigt, wenn er entweder eine Kriterien-Bewertung ODER ein Prüfungsergebnis hat
      const isCompleted = hasCriteriaEvaluation || hasExamResult;

      console.log(`🔥 Appointment ${appointment.id} (${appointment.title}):`, {
        status: appointment.status,
        start_time: appointment.start_time,
        end_time: appointment.end_time,
        deleted_at: appointment.deleted_at,
        hasCriteriaEvaluation,
        hasExamResult,
        isCompleted,
        notes: appointment.notes,
        exam_results: appointment.exam_results
      })

      return !isCompleted; // Pending, wenn weder Kriterien-Bewertung noch Prüfungsergebnis vorhanden ist
    }).map((appointment: any): PendingAppointment => ({
      id: appointment.id,
      title: appointment.title,
      start_time: appointment.start_time,
      end_time: appointment.end_time,
      user_id: appointment.user_id,
      status: appointment.status,
      type: appointment.type, // ✅ Explizit type übertragen
      event_type_code: appointment.event_type_code || appointment.type || 'lesson',
      users: appointment.users,
      // Wichtig: Filtere hier die notes, damit nur relevante Kriterien-notes enthalten sind
      notes: appointment.notes.filter((note: any) => note.evaluation_criteria_id !== null),
      // Neue Zahlungsinformationen
      payments: appointment.payments || []
    }))

    console.log('🔥 Filtered pending appointments:', pending.length)
    
    // WICHTIG: Globalen State komplett ersetzen (nicht mutieren)
    globalState.pendingAppointments = [...pending]
    console.log('🔥 Global pending state updated, count:', pendingCount.value)
    
  } catch (err: any) {
    globalState.error = err?.message || 'Fehler beim Laden der Pendenzen'
    console.error('❌ Fehler beim Laden der Pendenzen:', err)
  } finally {
    globalState.isLoading = false
  }
}

// NEUE Funktion zum Speichern der Kriterien-Bewertungen
const saveCriteriaEvaluations = async (
  appointmentId: string,
  evaluations: CriteriaEvaluationData[], // Array von Kriterien-Bewertungen
  currentUserId?: string
) => {
  try {
    const supabase = getSupabase();
    
    // Validierung der übergebenen Daten
    if (!evaluations || evaluations.length === 0) {
      throw new Error('Es müssen Bewertungen für mindestens ein Kriterium angegeben werden.');
    }

    const notesToInsert = evaluations.map(evalData => {
      // Validierung für jede einzelne Kriterienbewertung
      if (evalData.rating < 1 || evalData.rating > 6) {
        throw new Error(`Bewertung für Kriterium ${evalData.criteria_id} muss zwischen 1 und 6 liegen.`);
      }
      if (typeof evalData.note !== 'string') { // Stellen Sie sicher, dass note ein String ist
        evalData.note = String(evalData.note);
      }
      if (evalData.note.trim().length === 0) { // Eine Notiz ist nicht mehr zwingend
        evalData.note = ''; // Sicherstellen, dass es ein leerer String ist
      }

      return {
        appointment_id: appointmentId,
        evaluation_criteria_id: evalData.criteria_id,
        criteria_rating: evalData.rating,
        criteria_note: evalData.note.trim(),
        // staff_rating und staff_note bleiben NULL, da nicht mehr verwendet
        staff_rating: null,
        staff_note: '',
        last_updated_by_user_id: currentUserId || null,
        last_updated_at: toLocalTimeString(new Date)
      };
    });

    console.log('Attempting to upsert notes:', notesToInsert);

    // Verwende upsert für mehrere Einträge
    const { error: upsertError } = await supabase
      .from('notes')
      .upsert(notesToInsert, { onConflict: 'appointment_id,evaluation_criteria_id' }); // Conflict auf diesen beiden Spalten
                                                                                        // um Updates zu ermöglichen
    if (upsertError) throw upsertError;

    // Nach erfolgreichem Speichern: Aktualisiere die Pendenzen
    // Ein Termin ist NICHT mehr pending, wenn er mindestens eine Kriterien-Bewertung hat.
    // Die fetchPendingTasks Funktion wird das übernehmen.
    // TODO: Hier müsste die User-Rolle übergeben werden
    await fetchPendingTasks(currentUserId || '', 'staff'); // Aktualisiere die Liste nach dem Speichern

    console.log('✅ Kriterien-Bewertungen erfolgreich gespeichert und Pendenzen aktualisiert:', appointmentId);

  } catch (err: any) {
    globalState.error = err?.message || 'Fehler beim Speichern der Kriterien-Bewertungen';
    console.error('❌ Fehler beim Speichern der Kriterien-Bewertungen:', err);
    throw err;
  }
};


// Die markAsCompleted und markMultipleAsCompleted Funktionen sind obsolet,
// da wir keine Gesamtbewertungen mehr speichern.
// Ich habe sie hier entfernt, damit sie nicht mehr versehentlich aufgerufen werden.
// Wenn du sie noch irgendwo im Code hast, wo sie aufgerufen werden, musst du diese Aufrufe ändern.

const refreshPendingTasks = async (userId: string, userRole?: string) => {
  await fetchPendingTasks(userId, userRole)
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
    saveCriteriaEvaluations, // Die neue Funktion zum Export hinzufügen
    refreshPendingTasks,
    clearError,
    
    // Utilities
    getFormattedAppointment
  }
}