// server/api/admin/users.post.ts
// Admin user management endpoint - for AdminsTab, StaffTab, CustomersTab

import { defineEventHandler, readBody, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { sanitizeRoleChange, staffCreatePayload } from '~/server/utils/assignable-user-roles'
import { deactivateTenantUser, resolveScopedTenantId, type LifecycleUser } from '~/server/utils/admin-lifecycle'
import { getClientIP } from '~/server/utils/ip-utils'

// Privileged columns are not client-writable. Status changes go through deactivation.
const ADMIN_UPDATE_WHITELIST = ['first_name', 'last_name', 'email', 'phone'] as const
const STAFF_UPDATE_WHITELIST = ['first_name', 'last_name', 'email', 'phone', 'can_edit_guide'] as const
const USER_UPDATE_WHITELIST = [
  'first_name', 'last_name', 'email', 'phone', 'category',
  'birthdate', 'street', 'street_nr', 'zip', 'city', 'profession', 'faberid'
] as const

const USER_READ_COLUMNS = [
  'id', 'first_name', 'last_name', 'email', 'phone', 'role', 'tenant_id',
  'is_active', 'deleted_at', 'created_at', 'admin_level', 'is_primary_admin',
  'category', 'birthdate', 'street', 'street_nr', 'zip', 'city', 'profession',
  'faberid', 'can_edit_guide', 'preferred_payment_method',
].join(', ')

function pickFields<T extends object>(data: T, allowed: readonly string[]): Partial<T> {
  return Object.fromEntries(
    Object.entries(data).filter(([k]) => allowed.includes(k))
  ) as Partial<T>
}

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  if (!['admin', 'super_admin'].includes(authUser.role || '')) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden: Admin role required' })
  }

  const body = await readBody(event)
  const {
    action,
    tenant_id,
    user_id,
    user_data,
    search_term
  } = body || {}

  const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  )

  const scopedTenantId = () => resolveScopedTenantId(authUser.role, authUser.tenant_id, tenant_id)

  async function loadCaller(): Promise<LifecycleUser> {
    if (!authUser.db_user_id) {
      throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
    }
    const { data, error } = await supabase
      .from('users')
      .select('id, tenant_id, role, is_primary_admin, is_active, deleted_at')
      .eq('id', authUser.db_user_id)
      .maybeSingle()
    if (error || !data || data.is_active === false || data.deleted_at) {
      throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
    }
    return data as LifecycleUser
  }

  async function assertTargetInScope(targetId: string) {
    if (!targetId) {
      throw createError({ statusCode: 400, statusMessage: 'user_id required' })
    }
    const { data, error } = await supabase
      .from('users')
      .select('id, tenant_id')
      .eq('id', targetId)
      .maybeSingle()
    if (error || !data) {
      throw createError({ statusCode: 404, statusMessage: 'User not found' })
    }
    if (authUser.role !== 'super_admin' && data.tenant_id !== authUser.tenant_id) {
      throw createError({ statusCode: 403, statusMessage: 'Forbidden: Tenant mismatch' })
    }
    return data
  }

  try {
    if (action === 'get-admins') {
      const tenantId = scopedTenantId()
      const { data, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, role, is_active, is_primary_admin, created_at')
        .eq('tenant_id', tenantId)
        .eq('role', 'admin')
        .order('created_at', { ascending: false })

      if (error) throw error
      return { success: true, data: data || [] }
    }

    if (action === 'create-admin') {
      throw createError({
        statusCode: 400,
        statusMessage: 'create-admin wurde entfernt. Administratoren werden per Einladung angelegt.',
      })
    }

    if (action === 'update-admin') {
      await assertTargetInScope(user_id)
      const safeData: Record<string, any> = pickFields(user_data || {}, ADMIN_UPDATE_WHITELIST)
      if (authUser.role === 'super_admin' && user_data?.role !== undefined) {
        const nextRole = sanitizeRoleChange(authUser.role || '', user_data.role)
        if (nextRole) safeData.role = nextRole
      }

      let query = supabase
        .from('users')
        .update(safeData)
        .eq('id', user_id)

      if (authUser.role !== 'super_admin') {
        query = query.eq('tenant_id', authUser.tenant_id)
      }

      const { data, error } = await query
        .select(`${USER_READ_COLUMNS}, auth_user_id`)
        .single()

      if (error) throw error

      if ((safeData as any).email && data?.auth_user_id) {
        await supabase.auth.admin.updateUserById(data.auth_user_id, { email: (safeData as any).email })
      }

      return { success: true, data }
    }

    if (action === 'delete-admin' || action === 'delete-staff') {
      const caller = await loadCaller()
      await deactivateTenantUser({
        supabase,
        caller,
        targetUserId: user_id,
        reason: 'Deaktiviert',
        authUserId: authUser.id,
        ipAddress: getClientIP(event),
      })
      return { success: true, message: 'Deleted' }
    }

    if (action === 'get-staff') {
      const tenantId = scopedTenantId()
      const { data, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, role, created_at')
        .eq('tenant_id', tenantId)
        .eq('role', 'staff')
        .order('created_at', { ascending: false })

      if (error) throw error
      return { success: true, data: data || [] }
    }

    if (action === 'create-staff') {
      const tenantId = authUser.role === 'super_admin'
        ? resolveScopedTenantId(authUser.role, authUser.tenant_id, tenant_id || null)
        : resolveScopedTenantId(authUser.role, authUser.tenant_id, tenant_id)
      const insertData = staffCreatePayload(user_data, tenantId)
      const { data, error } = await supabase
        .from('users')
        .insert([insertData])
        .select(USER_READ_COLUMNS)
        .single()

      if (error) throw error
      return { success: true, data }
    }

    if (action === 'update-staff') {
      await assertTargetInScope(user_id)
      const safeData = pickFields(user_data || {}, STAFF_UPDATE_WHITELIST)
      let query = supabase
        .from('users')
        .update(safeData)
        .eq('id', user_id)

      if (authUser.role !== 'super_admin') {
        query = query.eq('tenant_id', authUser.tenant_id)
      }

      const { data, error } = await query
        .select(`${USER_READ_COLUMNS}, auth_user_id`)
        .single()

      if (error) throw error

      if ((safeData as any).email && data?.auth_user_id) {
        await supabase.auth.admin.updateUserById(data.auth_user_id, { email: (safeData as any).email })
      }

      return { success: true, data }
    }

    if (action === 'get-customers') {
      const tenantId = scopedTenantId()
      const { data, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, phone, created_at')
        .eq('tenant_id', tenantId)
        .eq('role', 'customer')
        .order('created_at', { ascending: false })

      if (error) throw error
      return { success: true, data: data || [] }
    }

    if (action === 'search-users') {
      const tenantId = scopedTenantId()
      const { data, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, role')
        .eq('tenant_id', tenantId)
        .or(`email.ilike.%${search_term}%,first_name.ilike.%${search_term}%,last_name.ilike.%${search_term}%`)
        .limit(10)

      if (error) throw error
      return { success: true, data: data || [] }
    }

    if (action === 'get-user-by-id') {
      await assertTargetInScope(user_id)
      let query = supabase
        .from('users')
        .select(USER_READ_COLUMNS)
        .eq('id', user_id)

      if (authUser.role !== 'super_admin') {
        query = query.eq('tenant_id', authUser.tenant_id)
      }

      const { data, error } = await query.maybeSingle()
      if (error || !data) {
        throw createError({ statusCode: 404, statusMessage: 'User not found' })
      }
      return { success: true, data }
    }

    if (action === 'update-user') {
      const existing = await assertTargetInScope(user_id)

      const safeData: Record<string, any> = pickFields(user_data || {}, USER_UPDATE_WHITELIST)
      if (authUser.role === 'super_admin' && user_data?.role !== undefined) {
        const nextRole = sanitizeRoleChange(authUser.role || '', user_data.role)
        if (nextRole) safeData.role = nextRole
      }

      for (const key of ['birthdate', 'street', 'street_nr', 'zip', 'city', 'profession', 'faberid', 'phone', 'email'] as const) {
        if (key in safeData && (safeData as any)[key] === '') {
          ;(safeData as any)[key] = null
        }
      }

      const { data, error } = await supabase
        .from('users')
        .update(safeData)
        .eq('id', user_id)
        .eq('tenant_id', existing.tenant_id)
        .select(`${USER_READ_COLUMNS}, auth_user_id`)
        .single()

      if (error) throw error

      if ((safeData as any).email && data?.auth_user_id) {
        await supabase.auth.admin.updateUserById(data.auth_user_id, { email: (safeData as any).email })
      }

      return { success: true, data }
    }

    if (action === 'get-user-appointments') {
      await assertTargetInScope(user_id)
      const { data, error } = await supabase
        .from('appointments')
        .select('id, start_time, end_time, status, duration_minutes, type, notes, cancellation_charge_percentage, staff:users!appointments_staff_id_fkey(first_name, last_name)')
        .eq('user_id', user_id)
        .order('start_time', { ascending: false })
        .limit(200)

      if (error) throw error
      return { success: true, data: data || [] }
    }

    if (action === 'get-staff-appointments') {
      await assertTargetInScope(user_id)
      const { year, month } = body
      if (!user_id || !year || !month) throw createError({ statusCode: 400, statusMessage: 'user_id, year and month required' })
      const from = new Date(Date.UTC(year, month - 1, 1)).toISOString()
      const to   = new Date(Date.UTC(year, month, 1)).toISOString()
      const { data, error } = await supabase
        .from('appointments')
        .select('id, title, start_time, end_time, duration_minutes, status, type, event_type_code, cancellation_charge_percentage, cancellation_policy_applied, user_id, student:users!appointments_user_id_fkey(first_name, last_name)')
        .eq('staff_id', user_id)
        .gte('start_time', from)
        .lt('start_time', to)
        .order('start_time', { ascending: true })
      if (error) throw error
      return { success: true, data: data || [] }
    }

    if (action === 'get-user-course-registrations') {
      await assertTargetInScope(user_id)
      const { data, error } = await supabase
        .from('course_registrations')
        .select('id, status, payment_status, amount_paid_rappen, discount_applied_rappen, registration_date, created_at, sari_faberid, is_partial_enrollment, course:courses(id, name, price_per_participant_rappen, course_sessions(start_time, end_time, session_number))')
        .eq('user_id', user_id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw error
      return { success: true, data: data || [] }
    }

    if (action === 'get-user-payments') {
      await assertTargetInScope(user_id)
      const { data, error } = await supabase
        .from('payments')
        .select('id, total_amount_rappen, payment_status, payment_method, created_at, paid_at, invoice_id, wallee_transaction_id, notes, appointment_id, appointments(id, title, start_time, event_type_code)')
        .eq('user_id', user_id)
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw error
      return { success: true, data: data || [] }
    }

    if (action === 'get-tenant-categories') {
      const tenantId = scopedTenantId()
      const { data, error } = await supabase
        .from('categories')
        .select('id, code, name, is_active, parent_category_id')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('code')

      if (error) throw error
      return { success: true, data: data || [] }
    }

    if (action === 'get-staff-license-photos') {
      await assertTargetInScope(user_id)
      const { data: docs, error: docsError } = await supabase
        .from('user_documents')
        .select('id, document_type, side, file_name, file_type, storage_path, title, is_verified, created_at')
        .eq('user_id', user_id)
        .eq('document_type', 'fuehrerschein')
        .is('deleted_at', null)
        .order('created_at', { ascending: true })
      if (docsError) throw docsError
      if (!docs || docs.length === 0) return { success: true, data: [] }

      const withUrls = await Promise.all(docs.map(async (doc) => {
        const { data: signed } = await supabase.storage
          .from('user-documents')
          .createSignedUrl(doc.storage_path, 3600)
        return { ...doc, signed_url: signed?.signedUrl || null }
      }))
      return { success: true, data: withUrls }
    }

    throw createError({
      statusCode: 400,
      message: `Unknown action: ${action}`
    })

  } catch (err: any) {
    console.error('❌ Admin Users API error:', err)
    throw createError({
      statusCode: err.statusCode || 500,
      statusMessage: err.statusMessage || err.message || 'Admin users operation failed',
      message: err.statusMessage || err.message || 'Admin users operation failed'
    })
  }
})
