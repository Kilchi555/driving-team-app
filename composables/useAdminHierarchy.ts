// composables/useAdminHierarchy.ts
import { ref, computed } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { getSupabase } from '~/utils/supabase'

export interface AdminUser {
  id: string
  first_name?: string | null
  last_name?: string | null
  email?: string | null
  role?: string | null
  admin_level?: 'primary_admin' | 'sub_admin' | null
  is_primary_admin?: boolean
  is_active?: boolean
  created_at?: string
  created_by?: string | null
  deleted_at?: string | null
  tenant_id?: string | null
  [key: string]: any
}

export interface AuditLogEntry {
  id: string
  action: string
  target_user_id: string
  performed_by: string
  reason: string | null
  created_at: string
  performer_name: string
  target_name: string
}

export const useAdminHierarchy = () => {
  const currentUser = ref<AdminUser | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const callManageApi = async (payload: Record<string, any>) => {
    return await $fetch('/api/admin/users/manage', {
      method: 'POST',
      body: payload
    }) as any
  }

  const loadCurrentUser = async () => {
    try {
      const authStore = useAuthStore()
      const user = authStore.user
      if (!user) throw new Error('Not authenticated')

      const response = await callManageApi({ action: 'load_current_user' })
      currentUser.value = response.user
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load current user'
      console.error('Error loading current user:', err)
    }
  }

  const canManageUser = (targetUser: AdminUser): boolean => {
    if (!currentUser.value) return false
    const current = currentUser.value

    if (current.role === 'super_admin') return true
    if (current.role !== 'admin' || current.tenant_id !== targetUser.tenant_id) return false
    if (current.is_active === false || current.deleted_at) return false

    if (current.is_primary_admin === true) {
      if (targetUser.is_primary_admin === true && targetUser.id !== current.id) return false
      return true
    }

    return targetUser.role === 'staff' || targetUser.role === 'client'
  }

  const canRestoreUser = (targetUser: AdminUser): boolean => {
    if (!currentUser.value) return false
    const current = currentUser.value
    if (current.role === 'super_admin') return true
    return current.role === 'admin'
      && current.is_primary_admin === true
      && current.is_active !== false
      && !current.deleted_at
      && current.tenant_id === targetUser.tenant_id
  }

  const softDeleteUser = async (userId: string, reason: string = 'Admin action'): Promise<boolean> => {
    isLoading.value = true
    error.value = null
    try {
      await callManageApi({ action: 'soft_delete', target_user_id: userId, reason })
      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete user'
      console.error('Error deleting user:', err)
      return false
    } finally {
      isLoading.value = false
    }
  }

  const restoreUser = async (userId: string): Promise<boolean> => {
    isLoading.value = true
    error.value = null
    try {
      await callManageApi({ action: 'restore', target_user_id: userId })
      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to restore user'
      console.error('Error restoring user:', err)
      return false
    } finally {
      isLoading.value = false
    }
  }

  const getUserAuditLog = async (userId: string): Promise<AuditLogEntry[]> => {
    try {
      const response = await callManageApi({ action: 'get_audit_log', target_user_id: userId })
      return response.entries || []
    } catch (err) {
      console.error('Error loading audit log:', err)
      return []
    }
  }

  const getDeletedUsers = async (): Promise<AdminUser[]> => {
    try {
      const response = await callManageApi({ action: 'get_deleted_users' })
      return response.users || []
    } catch (err) {
      console.error('Error loading deleted users:', err)
      return []
    }
  }

  // logUserAction is now handled server-side within manage.post.ts
  const logUserAction = async (
    action: string,
    targetUserId: string,
    reason?: string,
    oldValues?: any,
    newValues?: any
  ) => {
    // No-op: audit logging is done server-side in the manage API
  }

  const isSuperAdmin = computed(() => currentUser.value?.role === 'super_admin')
  const isPrimaryAdmin = computed(() =>
    currentUser.value?.role === 'admin'
    && currentUser.value?.is_primary_admin === true
    && currentUser.value?.is_active !== false
    && !currentUser.value?.deleted_at
  )

  const adminLevel = computed(() => {
    if (isSuperAdmin.value) return 'Super Admin'
    if (isPrimaryAdmin.value) return 'Primary Admin'
    if (currentUser.value?.role === 'admin') return 'Admin'
    return 'Regular User'
  })

  return {
    currentUser: readonly(currentUser),
    isLoading: readonly(isLoading),
    error: readonly(error),
    isSuperAdmin,
    isPrimaryAdmin,
    adminLevel,
    loadCurrentUser,
    canManageUser,
    canRestoreUser,
    softDeleteUser,
    restoreUser,
    getUserAuditLog,
    getDeletedUsers,
    logUserAction
  }
}
