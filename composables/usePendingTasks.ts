// composables/usePendingTasks.ts
import { ref, computed, reactive } from 'vue'
import { toLocalTimeString } from '~/utils/dateUtils'
import { logger } from '~/utils/logger'

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
  created_by?: string
  users: {
    first_name: string
    last_name: string
    category?: string // ✅ Kategorie des Schülers
  }
  created_by_user?: {
    first_name: string
    last_name: string
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

// Fälligkeits-Status für unbestätigte Termine
export type DueStatus = 'overdue_past' | 'overdue_24h' | 'due' | 'upcoming'

// SINGLETON PATTERN - Globaler reaktiver State
const globalState = reactive({
  pendingAppointments: [] as PendingAppointment[],
  unconfirmedNext24h: [] as PendingAppointment[],
  appointmentsWithoutPayment: [] as PendingAppointment[],
  isLoading: false,
  error: null as string | null
})

// Computed values basierend auf globalem State
const pendingCount = computed(() => globalState.pendingAppointments.length)
const unconfirmedNext24hCount = computed(() => globalState.unconfirmedNext24h.length)
const appointmentsWithoutPaymentCount = computed(() => globalState.appointmentsWithoutPayment.length)

const buttonClasses = computed(() => {
  const totalPending = pendingCount.value + unconfirmedNext24hCount.value + appointmentsWithoutPaymentCount.value
  return `text-white font-bold px-4 py-2 rounded-xl shadow-lg transform active:scale-95 transition-all duration-200
  ${totalPending > 0 ? 'bg-red-600 hover:bg-red-700' : 'bg-green-500 hover:bg-green-600'}`
})

const buttonText = computed(() => {
  const total = pendingCount.value + unconfirmedNext24hCount.value + appointmentsWithoutPaymentCount.value
  return total > 0 ? `Pendenzen (${total})` : 'Pendenzen (0)'
})

// ✅ Hilfsfunktion: Berechne Fälligkeits-Status für unbestätigte Termine
const calculateDueStatus = (appointment: PendingAppointment, authorizationWindowDays: number = 7): DueStatus => {
  const now = new Date()
  const startTime = parseLocalDateTime(appointment.start_time)
  const authDeadline = new Date(startTime.getTime() - (authorizationWindowDays * 24 * 60 * 60 * 1000))
  const hoursUntilStart = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60)
  
  // Termin ist bereits vorbei
  if (startTime < now) {
    return 'overdue_past'
  }
  
  // Weniger als 24h bis zum Termin
  if (hoursUntilStart < 24) {
    return 'overdue_24h'
  }
  
  // Autorisierungs-Deadline ist abgelaufen (z.B. 1 Woche vor Termin)
  if (now > authDeadline) {
    return 'due'
  }
  
  // Noch Zeit bis zur Deadline
  return 'upcoming'
}

// ✅ Computed: Unbestätigte Termine mit Fälligkeits-Status und sortiert
const unconfirmedWithStatus = computed(() => {
  const withStatus = globalState.unconfirmedNext24h.map(apt => {
    try {
      const status = calculateDueStatus(apt)
      return {
        ...apt,
        dueStatus: status
      }
    } catch (error) {
      console.error(`❌ Error calculating status for appointment ${apt.id}:`, error)
      return {
        ...apt,
        dueStatus: 'upcoming' as DueStatus
      }
    }
  }).sort((a, b) => {
    // Sortierung: Überfälligste zuerst
    const statusOrder: Record<DueStatus, number> = {
      'overdue_past': 0,    // Termin vorbei (höchste Priorität)
      'overdue_24h': 1,     // < 24h bis Termin
      'due': 2,             // Autorisierungs-Deadline überschritten
      'upcoming': 3         // Noch Zeit
    }
    
    const orderDiff = statusOrder[a.dueStatus] - statusOrder[b.dueStatus]
    if (orderDiff !== 0) return orderDiff
    
    // Bei gleichem Status: Ältere Termine zuerst
    return new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  })
  
  return withStatus
})

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

// ✅ Hilfsfunktion: Parse UTC DateTime-String und konvertiere zu Europe/Zurich
const parseLocalDateTime = (dateTimeStr: string): Date => {
  // Normalize format: convert space format to ISO if needed
  let timeStr = dateTimeStr
  if (timeStr.includes(' ') && !timeStr.includes('T')) {
    timeStr = timeStr.replace(' ', 'T')
  }
  // Ensure timezone suffix is properly formatted
  if (timeStr.includes('+00') && !timeStr.includes('+00:00')) {
    timeStr = timeStr.replace('+00', '+00:00')
  }
  if (!timeStr.includes('+') && !timeStr.includes('Z')) {
    timeStr += '+00:00'
  }
  
  const utcDate = new Date(timeStr)
  // Use toLocaleString to convert UTC to local timezone (Europe/Zurich)
  const localDateStr = utcDate.toLocaleString('sv-SE', { timeZone: 'Europe/Zurich' })
  const localDate = new Date(localDateStr)
  
  return localDate
}

// Computed für direkt formatierte Appointments
const formattedAppointments = computed(() => {
  return globalState.pendingAppointments.map(appointment => getFormattedAppointment(appointment))
})

// SINGLETON FUNCTIONS - Funktionen operieren auf globalem State
const fetchPendingTasks = async (userId: string, userRole?: string) => {
  logger.debug('🔥 fetchPendingTasks starting for user:', userId, 'with role:', userRole)
  globalState.isLoading = true
  globalState.error = null

  try {
    // Use the backend API endpoint that bypasses RLS
    // Authentication is handled via HTTP-Only cookies (sent automatically)
    logger.debug('🚀 Fetching pending appointments via backend API...')
    const { getOrFetch } = useCalendarCache()
    const response = await getOrFetch(
      '/api/admin/get-pending-appointments',
      () => $fetch('/api/admin/get-pending-appointments', { method: 'GET' }),
      undefined,
      30 * 1000 // 30s TTL – matches server-side Cache-Control
    ) as any

    if (!response?.success || !response?.data) {
      throw new Error('Failed to load pending appointments from API')
    }

    logger.debug('✅ Pending appointments loaded successfully via API')

    const { pending, unconfirmed, withoutPayment } = response.data
    
    // Process pending appointments
    const formattedPending = (pending || []).map((apt: any) => {
      try {
        return getFormattedAppointment(apt)
      } catch (error) {
        console.error('❌ Error formatting pending appointment:', error, apt)
        return apt
      }
    }) as any

    globalState.pendingAppointments = formattedPending

    // Process unconfirmed appointments
    const formattedUnconfirmed = (unconfirmed || []).map((apt: any) => {
      try {
        return getFormattedAppointment(apt)
      } catch (error) {
        console.error('❌ Error formatting unconfirmed appointment:', error, apt)
        return apt
      }
    }) as any

    globalState.unconfirmedNext24h = formattedUnconfirmed

    // Process appointments without payment
    const formattedWithoutPayment = (withoutPayment || []).map((apt: any) => {
      try {
        return getFormattedAppointment(apt)
      } catch (error) {
        console.error('❌ Error formatting appointment without payment:', error, apt)
        return apt
      }
    }) as any

    globalState.appointmentsWithoutPayment = formattedWithoutPayment

    logger.debug(`✅ Pending tasks loaded:`, {
      pending: formattedPending.length,
      unconfirmed: formattedUnconfirmed.length,
      withoutPayment: formattedWithoutPayment.length
    })
    logger.debug('🔥 Global pending state updated, count:', pendingCount.value)
    

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
    // Validierung der übergebenen Daten
    if (!evaluations || evaluations.length === 0) {
      throw new Error('Es müssen Bewertungen für mindestens ein Kriterium angegeben werden.');
    }

    const notesToInsert = evaluations
      .map(evalData => {
        // Validierung für jede einzelne Kriterienbewertung
        if (evalData.rating < 1 || evalData.rating > 6) {
          throw new Error(`Bewertung für Kriterium ${evalData.criteria_id} muss zwischen 1 und 6 liegen.`);
        }
        if (typeof evalData.note !== 'string') {
          evalData.note = String(evalData.note);
        }
        if (evalData.note.trim().length === 0) {
          evalData.note = '';
        }

        return {
          evaluation_criteria_id: evalData.criteria_id,
          rating: evalData.rating,
          notes: evalData.note.trim()
        };
      })

    logger.debug('Saving criteria evaluations via backend API:', { appointmentId, count: notesToInsert.length });

    // ✅ Call secure backend endpoint instead of direct Supabase
    const response = await $fetch('/api/staff/save-criteria-evaluations', {
      method: 'POST',
      body: {
        appointment_id: appointmentId,
        evaluations: notesToInsert
      }
    }) as any

    logger.debug('✅ Kriterien-Bewertungen erfolgreich gespeichert:', appointmentId);

    // ✅ Invalidate calendar cache after saving evaluations
    const { invalidate } = useCalendarCache()
    invalidate('/api/calendar/get-appointments')
    invalidate('/api/admin/get-pending-appointments')
    invalidate('/api/staff/get-working-hours')
    logger.debug('✅ Calendar cache invalidated after evaluation save')

    // Aktualisiere die Pendenzen nach dem Speichern
    await fetchPendingTasks(currentUserId || '', 'staff')

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
  logger.debug('🔄 usePendingTasks called - returning singleton instance')
  logger.debug('🔥 Current global pending count:', pendingCount.value)
  
  return {
    // Reactive state - direkte Referenzen auf reactive state
    pendingAppointments: computed(() => globalState.pendingAppointments),
    formattedAppointments,
    pendingCount,
    unconfirmedNext24h: computed(() => globalState.unconfirmedNext24h),
    unconfirmedNext24hCount,
    appointmentsWithoutPayment: computed(() => globalState.appointmentsWithoutPayment),
    appointmentsWithoutPaymentCount,
    unconfirmedWithStatus, // ✅ NEU: Mit Fälligkeits-Status
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
    getFormattedAppointment,
    calculateDueStatus // ✅ NEU: Export für manuelle Berechnung
  }
}