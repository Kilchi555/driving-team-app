import { ref } from 'vue'
import { getSupabase } from '~/utils/supabase'

export function useAdminAppointments() {
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  /**
   * Get all soft-deleted appointments (for admin purposes)
   */
  const getDeletedAppointments = async () => {
    isLoading.value = true
    error.value = null

    try {
      const supabase = getSupabase()
      
      const { data, error: fetchError } = await supabase
        .from('appointments')
        .select(`
          *,
          students!inner(*),
          staff(*),
          event_types(*),
          users!appointments_deleted_by_fkey (
            first_name,
            last_name
          )
        `)
        .not('deleted_at', 'is', null) // Nur gelöschte Termine
        .order('deleted_at', { ascending: false }) // Neueste Löschungen zuerst

      if (fetchError) throw fetchError

      console.log('🗑️ Found deleted appointments:', data?.length)
      return data

    } catch (err: any) {
      console.error('❌ Error fetching deleted appointments:', err)
      error.value = err.message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Restore a soft-deleted appointment
   */
  const restoreAppointment = async (appointmentId: string) => {
    isLoading.value = true
    error.value = null

    try {
      const supabase = getSupabase()
      
      const { data, error: restoreError } = await supabase
        .from('appointments')
        .update({
          deleted_at: null,
          deleted_by: null,
          deletion_reason: null
        })
        .eq('id', appointmentId)
        .select('id, title')
        .single()

      if (restoreError) throw restoreError

      console.log('✅ Appointment restored successfully:', data)
      return data

    } catch (err: any) {
      console.error('❌ Error restoring appointment:', err)
      error.value = err.message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Permanently delete an appointment (only for admin)
   * ⚠️ WARNING: This will permanently remove the appointment!
   */
  const permanentlyDeleteAppointment = async (appointmentId: string) => {
    isLoading.value = true
    error.value = null

    try {
      const supabase = getSupabase()
      
      // ⚠️ ECHTE LÖSCHUNG - nur für Admin!
      const { error: deleteError } = await supabase
        .from('appointments')
        .delete()
        .eq('id', appointmentId)

      if (deleteError) throw deleteError

      console.log('🗑️ Appointment permanently deleted:', appointmentId)
      return true

    } catch (err: any) {
      console.error('❌ Error permanently deleting appointment:', err)
      error.value = err.message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Get deletion statistics
   */
  const getDeletionStats = async () => {
    try {
      const supabase = getSupabase()
      
      const { data, error: statsError } = await supabase
        .from('appointments')
        .select('deleted_at, deleted_by')
        .not('deleted_at', 'is', null)

      if (statsError) throw statsError

      const totalDeleted = data?.length || 0
      const deletedByUser = data?.reduce((acc: any, apt: any) => {
        acc[apt.deleted_by] = (acc[apt.deleted_by] || 0) + 1
        return acc
      }, {})

      return {
        totalDeleted,
        deletedByUser
      }

    } catch (err: any) {
      console.error('❌ Error getting deletion stats:', err)
      throw err
    }
  }

  return {
    isLoading,
    error,
    getDeletedAppointments,
    restoreAppointment,
    permanentlyDeleteAppointment,
    getDeletionStats
  }
}
