// composables/useAppointmentStatus.ts - Status-Workflow Management
import { ref } from 'vue'
import { getSupabase } from '~/utils/supabase'
import { toLocalTimeString } from '~/utils/dateUtils'

export const useAppointmentStatus = () => {
  const supabase = getSupabase()
  const isUpdating = ref(false)
  const updateError = ref<string | null>(null)

  /**
   * Update appointments from 'confirmed' to 'completed' after end_time
   * Läuft automatisch und updated alle überfälligen Termine
   */
const updateOverdueAppointments = async () => {
  isUpdating.value = true
  updateError.value = null
  try {
    console.log('🔄 Checking for overdue appointments...')
    
    const now = toLocalTimeString(new Date())
    
    // 🆕 ERWEITERT: Finde ALLE Termine die bereits beendet sind
    const { data: overdueAppointments, error: findError } = await supabase
      .from('appointments')
      .select('id, title, start_time, end_time, staff_id, status')
      .in('status', ['confirmed', 'scheduled', 'booked']) // 🆕 Alle relevanten Status
      .lt('end_time', now) // Termine die bereits vorbei sind
    
    if (findError) {
      throw new Error(`Error finding overdue appointments: ${findError.message}`)
    }
    
    if (!overdueAppointments || overdueAppointments.length === 0) {
      console.log('✅ No overdue appointments found')
      return { updated: 0, appointments: [] }
    }
    
    console.log(`📅 Found ${overdueAppointments.length} overdue appointments:`, overdueAppointments)
    
    // Update alle überfälligen Termine auf 'completed'
    const appointmentIds = overdueAppointments.map(apt => apt.id)
    
    const { data: updatedAppointments, error: updateError } = await supabase
      .from('appointments')
      .update({ 
        status: 'completed',
        updated_at: toLocalTimeString(new Date())
      })
      .in('id', appointmentIds)
      .select('id, title, status')
    
    if (updateError) {
      throw new Error(`Error updating appointments: ${updateError.message}`)
    }
    
    console.log(`✅ Successfully updated ${updatedAppointments?.length || 0} appointments to 'completed'`)
    
    return {
      updated: updatedAppointments?.length || 0,
      appointments: updatedAppointments || []
    }
  } catch (err: any) {
    console.error('❌ Error updating overdue appointments:', err)
    updateError.value = err.message
    throw err
  } finally {
    isUpdating.value = false
  }
}

  /**
   * Update specific appointment to 'completed' status
   * Für manuelles Update einzelner Termine
   */
  const markAppointmentCompleted = async (appointmentId: string) => {
    isUpdating.value = true
    updateError.value = null

    try {
      console.log(`🔄 Marking appointment ${appointmentId} as completed...`)

      const { data, error } = await supabase
        .from('appointments')
        .update({ 
          status: 'completed',
          updated_at: toLocalTimeString(new Date())
        })
        .eq('id', appointmentId)
        .select('id, title, status')
        .single()

      if (error) {
        throw new Error(`Error updating appointment: ${error.message}`)
      }

      console.log('✅ Appointment marked as completed:', data)
      return data

    } catch (err: any) {
      console.error('❌ Error marking appointment completed:', err)
      updateError.value = err.message
      throw err
    } finally {
      isUpdating.value = false
    }
  }

  /**
   * Update appointment to 'evaluated' status after rating
   * Nach dem Speichern einer Bewertung
   */
  const markAppointmentEvaluated = async (appointmentId: string) => {
    isUpdating.value = true
    updateError.value = null

    try {
      console.log(`🔄 Marking appointment ${appointmentId} as evaluated...`)

      const { data, error } = await supabase
        .from('appointments')
        .update({ 
          status: 'evaluated',
          updated_at: toLocalTimeString(new Date())
        })
        .eq('id', appointmentId)
        .select('id, title, status')
        .single()

      if (error) {
        throw new Error(`Error updating appointment: ${error.message}`)
      }

      console.log('✅ Appointment marked as evaluated:', data)
      return data

    } catch (err: any) {
      console.error('❌ Error marking appointment evaluated:', err)
      updateError.value = err.message
      throw err
    } finally {
      isUpdating.value = false
    }
  }

  /**
   * Get appointment status statistics
   * Für Dashboard/Debugging
   */
  const getStatusStatistics = async (staffId?: string) => {
    try {
      let query = supabase
        .from('appointments')
        .select('status')

      if (staffId) {
        query = query.eq('staff_id', staffId)
      }

      const { data, error } = await query

      if (error) throw error

      const stats = data?.reduce((acc: Record<string, number>, appointment) => {
        const status = appointment.status || 'unknown'
        acc[status] = (acc[status] || 0) + 1
        return acc
      }, {}) || {}

      console.log('📊 Appointment status statistics:', stats)
      return stats

    } catch (err: any) {
      console.error('❌ Error getting status statistics:', err)
      return {}
    }
  }

  /**
   * Batch status update with filters
   * Erweiterte Update-Funktionen
   */
  const batchUpdateStatus = async (filters: {
    fromStatus: string
    toStatus: string
    staffId?: string
    beforeDate?: string
    afterDate?: string
  }) => {
    isUpdating.value = true
    updateError.value = null

    try {
      console.log('🔄 Batch updating appointment status...', filters)

      let query = supabase
        .from('appointments')
        .update({ 
          status: filters.toStatus,
          updated_at: toLocalTimeString(new Date())
        })
        .eq('status', filters.fromStatus)

      if (filters.staffId) {
        query = query.eq('staff_id', filters.staffId)
      }

      if (filters.beforeDate) {
        query = query.lt('end_time', filters.beforeDate)
      }

      if (filters.afterDate) {
        query = query.gt('start_time', filters.afterDate)
      }

      const { data, error } = await query.select('id, title, status')

      if (error) {
        throw new Error(`Batch update error: ${error.message}`)
      }

      console.log(`✅ Batch updated ${data?.length || 0} appointments from '${filters.fromStatus}' to '${filters.toStatus}'`)
      
      return {
        updated: data?.length || 0,
        appointments: data || []
      }

    } catch (err: any) {
      console.error('❌ Error in batch status update:', err)
      updateError.value = err.message
      throw err
    } finally {
      isUpdating.value = false
    }
  }

  return {
    // State
    isUpdating,
    updateError,
    
    // Core Functions
    updateOverdueAppointments,
    markAppointmentCompleted,
    markAppointmentEvaluated,
    
    // Utility Functions
    getStatusStatistics,
    batchUpdateStatus
  }
}