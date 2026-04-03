import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { getClientIP } from '~/server/utils/ip-utils'
import { logAudit } from '~/server/utils/audit'
import { logger } from '~/utils/logger'

type ManageAction =
  | 'soft_delete'
  | 'restore'
  | 'create_sub_admin'
  | 'get_deleted_users'
  | 'get_audit_log'
  | 'load_current_user'

export default defineEventHandler(async (event) => {
  try {
    // 1. Authentication
    const authUser = await getAuthenticatedUser(event)
    if (!authUser?.id) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    // 2. Rate limiting
    const clientIP = getClientIP(event)
    const rateLimitResult = await checkRateLimit(clientIP, 'admin_user_manage', 30)
    if (!rateLimitResult.allowed) {
      throw createError({
        statusCode: 429,
        statusMessage: `Too many requests. Try again in ${rateLimitResult.retryAfter} seconds`
      })
    }

    const supabase = getSupabaseAdmin()

    // 3. Load calling user (admin doing the action)
    const { data: callerUser, error: callerError } = await supabase
      .from('users')
      .select('id, role, admin_level, is_primary_admin, tenant_id, is_active, deleted_at, first_name, last_name, email, created_at, created_by')
      .eq('auth_user_id', authUser.id)
      .is('deleted_at', null)
      .single()

    if (callerError || !callerUser) {
      throw createError({ statusCode: 403, statusMessage: 'Access denied' })
    }

    const allowedRoles = ['admin', 'super_admin']
    if (!allowedRoles.includes(callerUser.role)) {
      throw createError({ statusCode: 403, statusMessage: 'Admin role required' })
    }

    const body = await readBody<{
      action: ManageAction
      target_user_id?: string
      reason?: string
      user_data?: {
        first_name: string
        last_name: string
        email: string
        phone?: string
      }
    }>(event)

    const { action } = body

    // ─── load_current_user ───────────────────────────────────────────────────
    if (action === 'load_current_user') {
      return { success: true, user: callerUser }
    }

    // ─── get_deleted_users ───────────────────────────────────────────────────
    if (action === 'get_deleted_users') {
      let query = supabase
        .from('users')
        .select('id, first_name, last_name, email, role, admin_level, is_primary_admin, is_active, created_at, created_by, deleted_at, tenant_id')
        .not('deleted_at', 'is', null)

      if (callerUser.role !== 'super_admin') {
        query = query.eq('tenant_id', callerUser.tenant_id)
      }

      const { data, error } = await query.order('deleted_at', { ascending: false })
      if (error) throw error

      return { success: true, users: data || [] }
    }

    // ─── get_audit_log ───────────────────────────────────────────────────────
    if (action === 'get_audit_log') {
      const { target_user_id } = body
      if (!target_user_id) throw createError({ statusCode: 400, statusMessage: 'Missing target_user_id' })

      const { data, error } = await supabase
        .from('user_management_audit')
        .select(`
          id, action, target_user_id, performed_by, reason, created_at,
          performer:performed_by(first_name, last_name, email),
          target:target_user_id(first_name, last_name, email)
        `)
        .eq('target_user_id', target_user_id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error

      return {
        success: true,
        entries: (data || []).map((e: any) => ({
          id: e.id,
          action: e.action,
          target_user_id: e.target_user_id,
          performed_by: e.performed_by,
          reason: e.reason,
          created_at: e.created_at,
          performer_name: `${e.performer?.first_name || ''} ${e.performer?.last_name || ''}`.trim(),
          target_name: `${e.target?.first_name || ''} ${e.target?.last_name || ''}`.trim()
        }))
      }
    }

    // Actions below require a target_user_id
    const { target_user_id, reason } = body
    if (!target_user_id) {
      throw createError({ statusCode: 400, statusMessage: 'Missing target_user_id' })
    }

    // Load target user for authorization checks
    const { data: targetUser, error: targetError } = await supabase
      .from('users')
      .select('id, role, admin_level, is_primary_admin, tenant_id, deleted_at')
      .eq('id', target_user_id)
      .single()

    if (targetError || !targetUser) {
      throw createError({ statusCode: 404, statusMessage: 'Target user not found' })
    }

    // Tenant isolation: non-super-admins can only manage users in their own tenant
    if (callerUser.role !== 'super_admin' && targetUser.tenant_id !== callerUser.tenant_id) {
      throw createError({ statusCode: 403, statusMessage: 'Cannot manage users in other tenants' })
    }

    // ─── soft_delete ─────────────────────────────────────────────────────────
    if (action === 'soft_delete') {
      if (targetUser.deleted_at) {
        throw createError({ statusCode: 409, statusMessage: 'User already deleted' })
      }

      // Primary admins cannot delete other primary admins
      if (callerUser.admin_level === 'primary_admin' && targetUser.is_primary_admin) {
        throw createError({ statusCode: 403, statusMessage: 'Cannot delete another primary admin' })
      }

      const { error: deleteError } = await supabase.rpc('soft_delete_user', {
        user_id_to_delete: target_user_id,
        deleting_user_id: callerUser.id,
        reason: reason || 'Admin action'
      })
      if (deleteError) throw deleteError

      await supabase.rpc('log_user_management_action', {
        action_type: 'soft_delete',
        target_id: target_user_id,
        performer_id: callerUser.id,
        reason_text: reason || null,
        old_vals: null,
        new_vals: null
      })

      await logAudit({
        user_id: authUser.id,
        action: 'admin_soft_delete_user',
        resource_type: 'user',
        resource_id: target_user_id,
        status: 'success',
        ip_address: clientIP,
        details: { reason }
      })

      return { success: true, message: 'User soft-deleted' }
    }

    // ─── restore ─────────────────────────────────────────────────────────────
    if (action === 'restore') {
      if (!targetUser.deleted_at) {
        throw createError({ statusCode: 409, statusMessage: 'User is not deleted' })
      }

      if (callerUser.admin_level !== 'primary_admin' && callerUser.role !== 'super_admin') {
        throw createError({ statusCode: 403, statusMessage: 'Only primary admins can restore users' })
      }

      const { error: restoreError } = await supabase.rpc('restore_deleted_user', {
        user_id_to_restore: target_user_id,
        restoring_user_id: callerUser.id
      })
      if (restoreError) throw restoreError

      await supabase.rpc('log_user_management_action', {
        action_type: 'restore',
        target_id: target_user_id,
        performer_id: callerUser.id,
        reason_text: 'User restored',
        old_vals: null,
        new_vals: null
      })

      await logAudit({
        user_id: authUser.id,
        action: 'admin_restore_user',
        resource_type: 'user',
        resource_id: target_user_id,
        status: 'success',
        ip_address: clientIP
      })

      return { success: true, message: 'User restored' }
    }

    // ─── create_sub_admin ────────────────────────────────────────────────────
    if (action === 'create_sub_admin') {
      if (!callerUser.is_primary_admin && callerUser.role !== 'super_admin') {
        throw createError({ statusCode: 403, statusMessage: 'Only primary admins can create sub-admins' })
      }

      const { user_data } = body
      if (!user_data?.email || !user_data?.first_name || !user_data?.last_name) {
        throw createError({ statusCode: 400, statusMessage: 'Missing sub-admin user data' })
      }

      const { data: newAdmin, error: createError2 } = await supabase
        .from('users')
        .insert({
          first_name: user_data.first_name,
          last_name: user_data.last_name,
          email: user_data.email,
          phone: user_data.phone || null,
          role: 'admin',
          admin_level: 'sub_admin',
          is_primary_admin: false,
          created_by: callerUser.id,
          tenant_id: callerUser.tenant_id,
          is_active: true
        })
        .select('id, email, first_name, last_name')
        .single()

      if (createError2) throw createError2

      await supabase.rpc('log_user_management_action', {
        action_type: 'create_sub_admin',
        target_id: newAdmin.id,
        performer_id: callerUser.id,
        reason_text: 'Sub-admin created',
        old_vals: null,
        new_vals: null
      })

      await logAudit({
        user_id: authUser.id,
        action: 'admin_create_sub_admin',
        resource_type: 'user',
        resource_id: newAdmin.id,
        status: 'success',
        ip_address: clientIP
      })

      return { success: true, user: newAdmin }
    }

    throw createError({ statusCode: 400, statusMessage: `Unknown action: ${action}` })

  } catch (err: any) {
    logger.error('❌ Error in admin user manage:', err)
    if (err.statusCode) throw err
    throw createError({ statusCode: 500, statusMessage: 'User management failed' })
  }
})
