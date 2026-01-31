// composables/useAppointmentStatus.ts - Status-Workflow Management
import { ref } from 'vue'
import logger from '~/utils/logger'

export const useAppointmentStatus = () => {
  const isUpdating = ref(false)
  const updateError = ref<string | null>(null)

  /**
   * ✅ MIGRATED: Update appointments from 'confirmed' to 'completed' after end_time
   * Läuft automatisch und updated alle überfälligen Termine
   * Now uses secure backend endpoint instead of direct Supabase
   */
  const updateOverdueAppointments = async () => {
    isUpdating.value = true
    updateError.value = null
    try {
      logger.debug('🔄 Checking for overdue appointments via backend API...')
      
      const response = await $fetch('/api/staff/update-overdue-appointments', {
        method: 'POST'
      }) as any
      
      logger.debug('✅ Overdue appointments updated:', response.message)
      
      return {
        updated: response.data?.length || 0,
        appointments: response.data || []
      }
    } catch (err: any) {
      console.error('❌ Error updating overdue appointments:', err)
      updateError.value = err.message || 'Failed to update overdue appointments'
      throw err
    } finally {
      isUpdating.value = false
    }
  }

  /**
   * ✅ MIGRATED: Update specific appointment to 'completed' status
   * Für manuelles Update einzelner Termine
   * Now uses secure backend endpoint
   */
  const markAppointmentCompleted = async (appointmentId: string) => {
    isUpdating.value = true
    updateError.value = null

    try {
      logger.debug(`🔄 Marking appointment ${appointmentId} as completed via backend API...`)

      const response = await $fetch('/api/staff/batch-update-appointment-status', {
        method: 'POST',
        body: {
          appointment_ids: [appointmentId],
          status: 'completed'
        }
      }) as any

      logger.debug('✅ Appointment marked as completed:', response.data?.[0])
      return response.data?.[0]

    } catch (err: any) {
      console.error('❌ Error marking appointment completed:', err)
      updateError.value = err.message || 'Failed to mark appointment as completed'
      throw err
    } finally {
      isUpdating.value = false
    }
  }

  /**
   * ✅ MIGRATED: Update appointment to 'evaluated' status after rating
   * Nach dem Speichern einer Bewertung
   * Now uses secure backend endpoint
   */
  const markAppointmentEvaluated = async (appointmentId: string) => {
    isUpdating.value = true
    updateError.value = null

    try {
      logger.debug(`🔄 Marking appointment ${appointmentId} as evaluated via backend API...`)

      const response = await $fetch('/api/staff/batch-update-appointment-status', {
        method: 'POST',
        body: {
          appointment_ids: [appointmentId],
          status: 'evaluated'
        }
      }) as any

      logger.debug('✅ Appointment marked as evaluated:', response.data?.[0])
      return response.data?.[0]

    } catch (err: any) {
      console.error('❌ Error marking appointment evaluated:', err)
      updateError.value = err.message || 'Failed to mark appointment as evaluated'
      throw err
    } finally {
      isUpdating.value = false
    }
  }

  /**
   * ✅ MIGRATED: Get appointment status statistics
   * Für Dashboard/Debugging
   * Now uses secure backend endpoint
   */
  const getStatusStatistics = async (staffId?: string) => {
    try {
      logger.debug('📊 Fetching appointment statistics via backend API...')
      
      const response = await $fetch('/api/staff/get-appointment-statistics') as any

      logger.debug('📊 Appointment status statistics:', response.data?.breakdown)
      return response.data?.breakdown || {}

    } catch (err: any) {
      console.error('❌ Error getting status statistics:', err)
      return {}
    }
  }

  /**
   * ✅ MIGRATED: Batch status update with filters
   * Erweiterte Update-Funktionen
   * Now uses secure backend endpoint
   */
  const batchUpdateStatus = async (filters: {
    appointmentIds: string[]
    toStatus: string
  }) => {
    isUpdating.value = true
    updateError.value = null

    try {
      logger.debug('🔄 Batch updating appointment status via backend API...', filters)

      const response = await $fetch('/api/staff/batch-update-appointment-status', {
        method: 'POST',
        body: {
          appointment_ids: filters.appointmentIds,
          status: filters.toStatus
        }
      }) as any

      logger.debug(`✅ Batch updated ${response.data?.length || 0} appointments to '${filters.toStatus}'`)
      
      return {
        updated: response.data?.length || 0,
        appointments: response.data || []
      }

    } catch (err: any) {
      console.error('❌ Error in batch status update:', err)
      updateError.value = err.message || 'Failed to batch update appointments'
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