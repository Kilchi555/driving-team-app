// composables/useUsers.ts
import { ref } from 'vue'

export const useUsers = () => {
  const users = ref<any[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Soft Delete - User deaktivieren
  const deactivateUser = async (userId: string, reason?: string) => {
    try {
      await $fetch('/api/users/deactivate', {
        method: 'POST',
        body: {
          user_id: userId,
          reason: reason || 'Deaktiviert'
        }
      })

      logger.debug('User deaktiviert (Soft Delete)')
      
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
      await $fetch('/api/users/reactivate', {
        method: 'POST',
        body: { user_id: userId }
      })

      logger.debug('User reaktiviert')
      
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
      const response = await $fetch('/api/users/list-active', {
        method: 'GET'
      }) as any

      if (!response || !Array.isArray(response.data)) {
        throw new Error('Invalid response from users API')
      }

      users.value = response.data
      return response.data
      
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
      const response = await $fetch('/api/users/list-all', {
        method: 'GET'
      }) as any

      if (!response || !Array.isArray(response.data)) {
        throw new Error('Invalid response from users API')
      }

      users.value = response.data
      return response.data
      
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
      const response = await $fetch('/api/users/get-by-id', {
        method: 'GET',
        query: { user_id: userId }
      }) as any

      if (!response || !response.data) {
        throw new Error('User not found')
      }

      return response.data
      
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