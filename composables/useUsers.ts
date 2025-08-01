// composables/useUsers.ts
import { ref } from 'vue'
import { getSupabase } from '~/utils/supabase'
import { toLocalTimeString } from '~/utils/dateUtils'

export const useUsers = () => {
  const users = ref<any[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Soft Delete - User deaktivieren
  const deactivateUser = async (userId: string, reason?: string) => {
    try {
      const supabase = getSupabase()
      
      const { error } = await supabase
        .from('users')
        .update({
          is_active: false,
          deleted_at: toLocalTimeString(new Date),
          deletion_reason: reason || 'Deaktiviert'
        })
        .eq('id', userId)
        
      if (error) throw error
      console.log('User deaktiviert (Soft Delete)')
      
      // Liste aktualisieren
      await getActiveUsers()
      
    } catch (err: any) {
      error.value = err.message
      throw err
    }
  }

  // User reaktivieren
  const reactivateUser = async (userId: string) => {
    try {
      const supabase = getSupabase()
      
      const { error } = await supabase
        .from('users')
        .update({
          is_active: true,
          deleted_at: null,
          deletion_reason: null
        })
        .eq('id', userId)
        
      if (error) throw error
      console.log('User reaktiviert')
      
      // Liste aktualisieren
      await getActiveUsers()
      
    } catch (err: any) {
      error.value = err.message
      throw err
    }
  }

  // Nur aktive User laden (Standard)
  const getActiveUsers = async () => {
    isLoading.value = true
    error.value = null
    
    try {
      const supabase = getSupabase()
      
      const { data, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('is_active', true)
        .order('last_name')
        .order('first_name')
        
      if (fetchError) throw fetchError
      
      users.value = data || []
      return data
      
    } catch (err: any) {
      error.value = err.message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Alle User inkl. inaktive (für Admin)
  const getAllUsers = async () => {
    isLoading.value = true
    error.value = null
    
    try {
      const supabase = getSupabase()
      
      const { data, error: fetchError } = await supabase
        .from('users')
        .select('*, deleted_at')
        .order('is_active', { ascending: false })
        .order('last_name')
        .order('first_name')
        
      if (fetchError) throw fetchError
      
      users.value = data || []
      return data
      
    } catch (err: any) {
      error.value = err.message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // User nach ID suchen
  const getUserById = async (userId: string) => {
    try {
      const supabase = getSupabase()
      
      const { data, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()
        
      if (fetchError) throw fetchError
      return data
      
    } catch (err: any) {
      error.value = err.message
      throw err
    }
  }

  return {
    // State
    users,
    isLoading,
    error,
    
    // Methods
    deactivateUser,
    reactivateUser,
    getActiveUsers,
    getAllUsers,
    getUserById
  }
}