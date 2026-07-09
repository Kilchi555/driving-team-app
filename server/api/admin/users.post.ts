// server/api/admin/users.post.ts
// Admin user management endpoint - for AdminsTab, StaffTab, CustomersTab

import { defineEventHandler, readBody, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { getAuthenticatedUser } from '~/server/utils/auth'

// Allowed columns per update action to prevent mass assignment
const ADMIN_UPDATE_WHITELIST = ['first_name', 'last_name', 'email', 'phone', 'is_active', 'role'] as const
const STAFF_UPDATE_WHITELIST = ['first_name', 'last_name', 'email', 'phone', 'is_active', 'can_edit_guide'] as const

function pickFields<T extends object>(data: T, allowed: readonly string[]): Partial<T> {
  return Object.fromEntries(
    Object.entries(data).filter(([k]) => allowed.includes(k))
  ) as Partial<T>
}

export default defineEventHandler(async (event) => {
  // ✅ Auth check — must be authenticated admin
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
    role,
    search_term
  } = body

  // ✅ Tenant isolation — non-super_admin can only access their own tenant
  if (authUser.role !== 'super_admin' && tenant_id && tenant_id !== authUser.tenant_id) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden: Tenant mismatch' })
  }

  const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  )

  try {
    if (action === 'get-admins') {
      // Get all admins for tenant
      const { data, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, role, created_at')
        .eq('tenant_id', tenant_id)
        .eq('role', 'admin')
        .order('created_at', { ascending: false })

      if (error) throw error
      return { success: true, data: data || [] }
    }

    if (action === 'create-admin') {
      // Create new admin user
      const { data, error } = await supabase
        .from('users')
        .insert([user_data])
        .select()
        .single()

      if (error) throw error
      return { success: true, data }
    }

    if (action === 'update-admin') {
      // Update admin user — whitelist fields to prevent mass assignment
      const safeData = pickFields(user_data || {}, ADMIN_UPDATE_WHITELIST)
      const { data, error } = await supabase
        .from('users')
        .update(safeData)
        .eq('id', user_id)
        .select('*, auth_user_id')
        .single()

      if (error) throw error

      if ((safeData as any).email && data?.auth_user_id) {
        await supabase.auth.admin.updateUserById(data.auth_user_id, { email: (safeData as any).email })
      }

      return { success: true, data }
    }

    if (action === 'delete-admin') {
      // Delete admin user (soft delete or hard delete)
      const { error } = await supabase
        .from('users')
        .update({ is_active: false })
        .eq('id', user_id)

      if (error) throw error
      return { success: true, message: 'Deleted' }
    }

    if (action === 'get-staff') {
      // Get all staff for tenant
      const { data, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, role, created_at')
        .eq('tenant_id', tenant_id)
        .eq('role', 'staff')
        .order('created_at', { ascending: false })

      if (error) throw error
      return { success: true, data: data || [] }
    }

    if (action === 'create-staff') {
      // Create new staff user
      const { data, error } = await supabase
        .from('users')
        .insert([user_data])
        .select()
        .single()

      if (error) throw error
      return { success: true, data }
    }

    if (action === 'update-staff') {
      // Update staff user — whitelist fields to prevent mass assignment
      const safeData = pickFields(user_data || {}, STAFF_UPDATE_WHITELIST)
      const { data, error } = await supabase
        .from('users')
        .update(safeData)
        .eq('id', user_id)
        .select('*, auth_user_id')
        .single()

      if (error) throw error

      if ((safeData as any).email && data?.auth_user_id) {
        await supabase.auth.admin.updateUserById(data.auth_user_id, { email: (safeData as any).email })
      }

      return { success: true, data }
    }

    if (action === 'delete-staff') {
      // Delete staff user
      const { error } = await supabase
        .from('users')
        .update({ is_active: false })
        .eq('id', user_id)

      if (error) throw error
      return { success: true, message: 'Deleted' }
    }

    if (action === 'get-customers') {
      // Get all customers for tenant
      const { data, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, phone, created_at')
        .eq('tenant_id', tenant_id)
        .eq('role', 'customer')
        .order('created_at', { ascending: false })

      if (error) throw error
      return { success: true, data: data || [] }
    }

    if (action === 'search-users') {
      // Search users by email/name
      const { data, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, role')
        .eq('tenant_id', tenant_id)
        .or(`email.ilike.%${search_term}%,first_name.ilike.%${search_term}%,last_name.ilike.%${search_term}%`)
        .limit(10)

      if (error) throw error
      return { success: true, data: data || [] }
    }

    if (action === 'get-user-by-id') {
      // Get single user
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user_id)
        .single()

      if (error) throw error
      return { success: true, data }
    }

    if (action === 'get-user-appointments') {
      const { data, error } = await supabase
        .from('appointments')
        .select('id, start_time, end_time, status, duration_minutes, type, notes, staff:users!appointments_staff_id_fkey(first_name, last_name)')
        .eq('user_id', user_id)
        .order('start_time', { ascending: false })
        .limit(200)

      if (error) throw error
      return { success: true, data: data || [] }
    }

    if (action === 'get-staff-appointments') {
      const { year, month } = body // month: 1-12
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
      const { data, error } = await supabase
        .from('categories')
        .select('id, code, name, is_active, parent_category_id')
        .eq('tenant_id', tenant_id)
        .eq('is_active', true)
        .order('code')

      if (error) throw error
      return { success: true, data: data || [] }
    }

    if (action === 'get-staff-license-photos') {
      if (!user_id) throw createError({ statusCode: 400, statusMessage: 'user_id required' })
      // Fetch documents
      const { data: docs, error: docsError } = await supabase
        .from('user_documents')
        .select('id, document_type, side, file_name, file_type, storage_path, title, is_verified, created_at')
        .eq('user_id', user_id)
        .eq('document_type', 'fuehrerschein')
        .is('deleted_at', null)
        .order('created_at', { ascending: true })
      if (docsError) throw docsError
      if (!docs || docs.length === 0) return { success: true, data: [] }

      // Generate signed URLs (valid 1 hour)
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
      message: err.message || 'Admin users operation failed'
    })
  }
})
