// server/api/admin/evaluation.post.ts
// Consolidated evaluation system management endpoint
// Handles all evaluation-related CRUD operations

import { defineEventHandler, readBody, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { requireAdminProfile } from '~/server/utils/auth'

const SAFE_TENANT_FIELDS =
  'id, name, slug, primary_color, secondary_color, logo_url, logo_wide_url, logo_square_url, business_type'
const SAFE_USER_FIELDS =
  'id, first_name, last_name, email, phone, role, tenant_id, category, is_active, created_at'

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event, ['admin', 'staff', 'super_admin', 'tenant_admin'])

  const body = await readBody(event)
  const {
    action,
    tenant_id,
    user_id,
    category_data,
    criteria_data,
    scale_data
  } = body

  const effectiveTenantId =
    profile.role === 'super_admin' && tenant_id ? tenant_id : profile.tenant_id

  if (
    profile.role !== 'super_admin' &&
    tenant_id &&
    tenant_id !== profile.tenant_id
  ) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden – tenant mismatch' })
  }

  const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  )

  try {
    if (!action) {
      throw createError({
        statusCode: 400,
        message: 'Action is required'
      })
    }

    if (action === 'get-evaluation-categories') {
      if (!effectiveTenantId) {
        return { success: true, data: [] }
      }

      const { data, error } = await supabase
        .from('evaluation_categories')
        .select('id, tenant_id, name, description, display_order, category_code, is_active, created_at')
        .or(`tenant_id.eq.${effectiveTenantId},tenant_id.is.null`)
        .order('display_order', { ascending: true })

      if (error) throw error
      return { success: true, data: data || [] }
    }

    if (action === 'create-evaluation-category') {
      const payload = {
        ...(category_data || {}),
        tenant_id: effectiveTenantId,
      }
      const { data, error } = await supabase
        .from('evaluation_categories')
        .insert([payload])
        .select()
        .single()

      if (error) throw error
      return { success: true, data }
    }

    if (action === 'update-evaluation-category') {
      if (!category_data?.id) {
        throw createError({ statusCode: 400, message: 'category_data.id required' })
      }
      const { data, error } = await supabase
        .from('evaluation_categories')
        .update(category_data)
        .eq('id', category_data.id)
        .eq('tenant_id', effectiveTenantId)
        .select()
        .single()

      if (error) throw error
      return { success: true, data }
    }

    if (action === 'delete-evaluation-category') {
      if (!category_data?.id) {
        throw createError({ statusCode: 400, message: 'category_data.id required' })
      }
      const { error } = await supabase
        .from('evaluation_categories')
        .delete()
        .eq('id', category_data.id)
        .eq('tenant_id', effectiveTenantId)

      if (error) throw error
      return { success: true, message: 'Deleted' }
    }

    if (action === 'get-evaluation-criteria') {
      const { data, error } = await supabase
        .from('evaluation_criteria')
        .select('id, category_id, tenant_id, name, description, display_order, is_active, created_at')
        .eq('category_id', category_data?.id)
        .or(`tenant_id.eq.${category_data?.tenant_id || effectiveTenantId},tenant_id.is.null`)
        .order('display_order', { ascending: true })

      if (error) throw error
      return { success: true, data: data || [] }
    }

    if (action === 'create-evaluation-criteria') {
      const payload = {
        ...(criteria_data || {}),
        tenant_id: effectiveTenantId,
      }
      const { data, error } = await supabase
        .from('evaluation_criteria')
        .insert([payload])
        .select()
        .single()

      if (error) throw error
      return { success: true, data }
    }

    if (action === 'update-evaluation-criteria') {
      if (!criteria_data?.id) {
        throw createError({ statusCode: 400, message: 'criteria_data.id required' })
      }
      const { data, error } = await supabase
        .from('evaluation_criteria')
        .update(criteria_data)
        .eq('id', criteria_data.id)
        .eq('tenant_id', effectiveTenantId)
        .select()
        .single()

      if (error) throw error
      return { success: true, data }
    }

    if (action === 'delete-evaluation-criteria') {
      if (!criteria_data?.id) {
        throw createError({ statusCode: 400, message: 'criteria_data.id required' })
      }
      const { error } = await supabase
        .from('evaluation_criteria')
        .delete()
        .eq('id', criteria_data.id)
        .eq('tenant_id', effectiveTenantId)

      if (error) throw error
      return { success: true, message: 'Deleted' }
    }

    if (action === 'get-evaluation-scales') {
      const { data, error } = await supabase
        .from('evaluation_scale')
        .select('id, tenant_id, label, min_score, max_score, color, display_order')
        .eq('tenant_id', effectiveTenantId)
        .order('min_score')

      if (error) throw error
      return { success: true, data: data || [] }
    }

    if (action === 'create-evaluation-scale') {
      const payload = {
        ...(scale_data || {}),
        tenant_id: effectiveTenantId,
      }
      const { data, error } = await supabase
        .from('evaluation_scale')
        .insert([payload])
        .select()
        .single()

      if (error) throw error
      return { success: true, data }
    }

    if (action === 'update-evaluation-scale') {
      if (!scale_data?.id) {
        throw createError({ statusCode: 400, message: 'scale_data.id required' })
      }
      const { data, error } = await supabase
        .from('evaluation_scale')
        .update(scale_data)
        .eq('id', scale_data.id)
        .eq('tenant_id', effectiveTenantId)
        .select()
        .single()

      if (error) throw error
      return { success: true, data }
    }

    if (action === 'delete-evaluation-scale') {
      if (!scale_data?.id) {
        throw createError({ statusCode: 400, message: 'scale_data.id required' })
      }
      const { error } = await supabase
        .from('evaluation_scale')
        .delete()
        .eq('id', scale_data.id)
        .eq('tenant_id', effectiveTenantId)

      if (error) throw error
      return { success: true, message: 'Deleted' }
    }

    if (action === 'get-tenant-info') {
      const { data, error } = await supabase
        .from('tenants')
        .select(SAFE_TENANT_FIELDS)
        .eq('id', effectiveTenantId)
        .single()

      if (error) throw error
      return { success: true, data }
    }

    if (action === 'get-categories') {
      const { data, error } = await supabase
        .from('categories')
        .select('id, tenant_id, name, code, description, is_active')
        .eq('tenant_id', effectiveTenantId)

      if (error) throw error
      return { success: true, data: data || [] }
    }

    if (action === 'get-user-info') {
      if (!user_id) {
        throw createError({ statusCode: 400, message: 'user_id required' })
      }
      const { data, error } = await supabase
        .from('users')
        .select(SAFE_USER_FIELDS)
        .eq('id', user_id)
        .eq('tenant_id', effectiveTenantId)
        .single()

      if (error) throw error
      return { success: true, data }
    }

    throw createError({
      statusCode: 400,
      message: `Unknown action: ${action}`
    })

  } catch (err: any) {
    console.error('❌ Evaluation API error:', err)
    if (err?.statusCode) throw err
    throw createError({
      statusCode: err.statusCode || 500,
      message: err.message || 'Evaluation operation failed'
    })
  }
})
