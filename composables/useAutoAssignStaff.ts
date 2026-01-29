// composables/useAutoAssignStaff.ts - Migriert zu API-basierten Abfragen
import { logger } from '~/utils/logger'

export const useAutoAssignStaff = () => {
  /**
   * Check auto-assignment when first appointment is created
   * Called after successfully saving an appointment
   */
  const checkFirstAppointmentAssignment = async (appointmentData: {
    user_id: string
    staff_id: string
  }) => {
    try {
      logger.debug('🔍 Checking first appointment assignment via API for student:', appointmentData.user_id)

      const result = await $fetch('/api/staff/auto-assign-check', {
        method: 'POST',
        body: {
          userId: appointmentData.user_id,
          staffId: appointmentData.staff_id
        }
      })

      return result

    } catch (error: any) {
      logger.error('Error during auto-assignment check:', error)
      return { assigned: false, reason: 'API error', error: error.message }
    }
  }

  /**
   * One-time cleanup for existing students
   * Can be called as admin function
   */
  const assignExistingStudents = async (staffId: string) => {
    try {
      logger.debug('🔄 Assigning existing students via API for staff:', staffId)

      const result = await $fetch('/api/staff/auto-assign-bulk', {
        method: 'POST',
        body: { staffId }
      })

      return result.assignments || []

    } catch (error: any) {
      logger.error('Error during bulk assignment:', error)
      return []
    }
  }

  return {
    checkFirstAppointmentAssignment,
    assignExistingStudents
  }
}
