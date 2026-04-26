// server/api/admin/users.post.ts
// Admin user management endpoint - for AdminsTab, StaffTab, CustomersTab

import { defineEventHandler, readBody, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { getAuthenticatedUser } from '~/server/utils/auth'

// Allowed columns per update action to prevent mass assignment
const ADMIN_UPDATE_WHITELIST = ['first_name', 'last_name', 'email', 'phone', 'is_active', 'role'] as const
const STAFF_UPDATE_WHITELIST = ['first_name', 'last_name', 'email', 'phone', 'is_active'] as const

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
        .select()
        .single()

      if (error) throw error
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
        .select()
        .single()

      if (error) throw error
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
