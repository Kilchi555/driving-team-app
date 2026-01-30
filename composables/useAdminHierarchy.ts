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
  [key: string]: any // Allow additional properties
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
  const supabase = getSupabase()
  
  const currentUser = ref<AdminUser | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Get current user's admin level and permissions
  const loadCurrentUser = async () => {
    try {
      const authStore = useAuthStore()
      const user = authStore.user
      if (!user) throw new Error('Not authenticated')

      const { data, error: userError } = await supabase
        .from('users')
        .select(`
          id, first_name, last_name, email, role, 
          admin_level, is_primary_admin, is_active,
          created_at, created_by, deleted_at, tenant_id
        `)
        .eq('auth_user_id', user.id)
        .is('deleted_at', null)
        .single()

      if (userError) throw userError
      currentUser.value = data
      
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load current user'
      console.error('Error loading current user:', err)
    }
  }

  // Check if current user can delete/manage another user
  const canManageUser = (targetUser: AdminUser): boolean => {
    if (!currentUser.value) return false

    const current = currentUser.value

    // Super admin can manage anyone
    if (current.role === 'super_admin') return true

    // Primary admin can manage sub-admins and regular users in same tenant
    if (current.admin_level === 'primary_admin' && current.tenant_id === targetUser.tenant_id) {
      // Cannot manage other primary admins
      if (targetUser.is_primary_admin) return false
      return true
    }

    // Sub-admin can manage regular users in same tenant
    if (current.admin_level === 'sub_admin' && current.tenant_id === targetUser.tenant_id) {
      // Cannot manage any admins
      if (targetUser.admin_level) return false
      return targetUser.role in ['client', 'staff']
    }

    return false
  }

  // Check if current user can restore a deleted user
  const canRestoreUser = (targetUser: AdminUser): boolean => {
    if (!currentUser.value) return false

    const current = currentUser.value

    // Super admin can restore anyone
    if (current.role === 'super_admin') return true

    // Primary admin can restore users in same tenant
    if (current.admin_level === 'primary_admin' && current.tenant_id === targetUser.tenant_id) {
      return true
    }

    return false
  }

  // Soft delete a user
  const softDeleteUser = async (userId: string, reason: string = 'Admin action'): Promise<boolean> => {
    if (!currentUser.value) throw new Error('Not authenticated')

    isLoading.value = true
    error.value = null

    try {
      // Call the PostgreSQL function for soft delete
      const { data, error: deleteError } = await supabase
        .rpc('soft_delete_user', {
          user_id_to_delete: userId,
          deleting_user_id: currentUser.value.id,
          reason: reason
        })

      if (deleteError) throw deleteError

      // Log the action
      await logUserAction('soft_delete', userId, reason)

      return true

    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete user'
      console.error('Error deleting user:', err)
      return false
    } finally {
      isLoading.value = false
    }
  }

  // Restore a soft deleted user
  const restoreUser = async (userId: string): Promise<boolean> => {
    if (!currentUser.value) throw new Error('Not authenticated')

    isLoading.value = true
    error.value = null

    try {
      // Call the PostgreSQL function for restore
      const { data, error: restoreError } = await supabase
        .rpc('restore_deleted_user', {
          user_id_to_restore: userId,
          restoring_user_id: currentUser.value.id
        })

      if (restoreError) throw restoreError

      // Log the action
      await logUserAction('restore', userId, 'User restored')

      return true

    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to restore user'
      console.error('Error restoring user:', err)
      return false
    } finally {
      isLoading.value = false
    }
  }

  // Create a new sub-admin
  const createSubAdmin = async (userData: {
    first_name: string
    last_name: string
    email: string
    phone?: string
  }): Promise<boolean> => {
    if (!currentUser.value || !currentUser.value.is_primary_admin) {
      throw new Error('Only primary admins can create sub-admins')
    }

    isLoading.value = true
    error.value = null

    try {
      // Create user with sub-admin privileges
      const { data, error: createError } = await supabase
        .from('users')
        .insert({
          ...userData,
          role: 'admin',
          admin_level: 'sub_admin',
          is_primary_admin: false,
          created_by: currentUser.value.id,
          tenant_id: currentUser.value.tenant_id,
          is_active: true
        })
        .select()
        .single()

      if (createError) throw createError

      // Log the action
      await logUserAction('create_sub_admin', data.id, 'Sub-admin created')

      return true

    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create sub-admin'
      console.error('Error creating sub-admin:', err)
      return false
    } finally {
      isLoading.value = false
    }
  }

  // Get audit log for a user
  const getUserAuditLog = async (userId: string): Promise<AuditLogEntry[]> => {
    try {
      const { data, error: auditError } = await supabase
        .from('user_management_audit')
        .select(`
          id, action, target_user_id, performed_by, reason, created_at,
          performer:performed_by(first_name, last_name, email),
          target:target_user_id(first_name, last_name, email)
        `)
        .eq('target_user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (auditError) throw auditError

      return data.map((entry: any) => ({
        id: entry.id,
        action: entry.action,
        target_user_id: entry.target_user_id,
        performed_by: entry.performed_by,
        reason: entry.reason,
        created_at: entry.created_at,
        performer_name: `${entry.performer?.first_name || ''} ${entry.performer?.last_name || ''}`.trim(),
        target_name: `${entry.target?.first_name || ''} ${entry.target?.last_name || ''}`.trim()
      }))

    } catch (err) {
      console.error('Error loading audit log:', err)
      return []
    }
  }

  // Log a user management action
  const logUserAction = async (
    action: string, 
    targetUserId: string, 
    reason?: string,
    oldValues?: any,
    newValues?: any
  ) => {
    if (!currentUser.value) return

    try {
      await supabase.rpc('log_user_management_action', {
        action_type: action,
        target_id: targetUserId,
        performer_id: currentUser.value.id,
        reason_text: reason || null,
        old_vals: oldValues || null,
        new_vals: newValues || null
      })
    } catch (err) {
      console.error('Error logging user action:', err)
    }
  }

  // Get deleted users (for restore functionality)
  const getDeletedUsers = async (): Promise<AdminUser[]> => {
    if (!currentUser.value) return []

    try {
      let query = supabase
        .from('users')
        .select(`
          id, first_name, last_name, email, role,
          admin_level, is_primary_admin, is_active,
          created_at, created_by, deleted_at, tenant_id
        `)
        .not('deleted_at', 'is', null)

      // Filter by tenant unless super admin
      if (currentUser.value.role !== 'super_admin') {
        query = query.eq('tenant_id', currentUser.value.tenant_id)
      }

      const { data, error: deletedError } = await query
        .order('deleted_at', { ascending: false })

      if (deletedError) throw deletedError
      return data || []

    } catch (err) {
      console.error('Error loading deleted users:', err)
      return []
    }
  }

  // Computed properties
  const isSuperAdmin = computed(() => currentUser.value?.role === 'super_admin')
  const isPrimaryAdmin = computed(() => currentUser.value?.is_primary_admin === true)
  const isSubAdmin = computed(() => currentUser.value?.admin_level === 'sub_admin')
  
  const adminLevel = computed(() => {
    if (isSuperAdmin.value) return 'Super Admin'
    if (isPrimaryAdmin.value) return 'Primary Admin'
    if (isSubAdmin.value) return 'Sub Admin'
    return 'Regular User'
  })

  return {
    // State
    currentUser: readonly(currentUser),
    isLoading: readonly(isLoading),
    error: readonly(error),

    // Computed
    isSuperAdmin,
    isPrimaryAdmin,
    isSubAdmin,
    adminLevel,

    // Methods
    loadCurrentUser,
    canManageUser,
    canRestoreUser,
    softDeleteUser,
    restoreUser,
    createSubAdmin,
    getUserAuditLog,
    getDeletedUsers,
    logUserAction
  }
}

