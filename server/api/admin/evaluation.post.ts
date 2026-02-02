// server/api/admin/evaluation.post.ts
// Consolidated evaluation system management endpoint
// Handles all evaluation-related CRUD operations

import { defineEventHandler, readBody, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { 
    action,
    tenant_id,
    user_id,
    category_data,
    criteria_data,
    scale_data
  } = body

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
      // Get all evaluation categories for tenant, sorted by display_order
      if (!tenant_id) {
        return { success: true, data: [] }
      }
      
      const { data, error } = await supabase
        .from('evaluation_categories')
        .select('*')
        .eq('tenant_id', tenant_id)
        .order('display_order', { ascending: true })

      if (error) throw error
      return { success: true, data: data || [] }
    }

    if (action === 'create-evaluation-category') {
      // Create new evaluation category
      const { data, error } = await supabase
        .from('evaluation_categories')
        .insert([category_data])
        .select()
        .single()

      if (error) throw error
      return { success: true, data }
    }

    if (action === 'update-evaluation-category') {
      // Update evaluation category
      const { data, error } = await supabase
        .from('evaluation_categories')
        .update(category_data)
        .eq('id', category_data.id)
        .select()
        .single()

      if (error) throw error
      return { success: true, data }
    }

    if (action === 'delete-evaluation-category') {
      // Delete evaluation category
      const { error } = await supabase
        .from('evaluation_categories')
        .delete()
        .eq('id', category_data.id)

      if (error) throw error
      return { success: true, message: 'Deleted' }
    }

    if (action === 'get-evaluation-criteria') {
      // Get evaluation criteria for category, sorted by display_order
      const { data, error } = await supabase
        .from('evaluation_criteria')
        .select('*')
        .eq('category_id', category_data?.id)
        .order('display_order', { ascending: true })

      if (error) throw error
      return { success: true, data: data || [] }
    }

    if (action === 'create-evaluation-criteria') {
      // Create evaluation criteria
      const { data, error } = await supabase
        .from('evaluation_criteria')
        .insert([criteria_data])
        .select()
        .single()

      if (error) throw error
      return { success: true, data }
    }

    if (action === 'update-evaluation-criteria') {
      // Update evaluation criteria
      const { data, error } = await supabase
        .from('evaluation_criteria')
        .update(criteria_data)
        .eq('id', criteria_data.id)
        .select()
        .single()

      if (error) throw error
      return { success: true, data }
    }

    if (action === 'delete-evaluation-criteria') {
      // Delete evaluation criteria
      const { error } = await supabase
        .from('evaluation_criteria')
        .delete()
        .eq('id', criteria_data.id)

      if (error) throw error
      return { success: true, message: 'Deleted' }
    }

    if (action === 'get-evaluation-scales') {
      // Get evaluation scales
      const { data, error } = await supabase
        .from('evaluation_scale')
        .select('*')
        .eq('tenant_id', tenant_id)
        .order('min_score')

      if (error) throw error
      return { success: true, data: data || [] }
    }

    if (action === 'create-evaluation-scale') {
      // Create evaluation scale
      const { data, error } = await supabase
        .from('evaluation_scale')
        .insert([scale_data])
        .select()
        .single()

      if (error) throw error
      return { success: true, data }
    }

    if (action === 'update-evaluation-scale') {
      // Update evaluation scale
      const { data, error } = await supabase
        .from('evaluation_scale')
        .update(scale_data)
        .eq('id', scale_data.id)
        .select()
        .single()

      if (error) throw error
      return { success: true, data }
    }

    if (action === 'delete-evaluation-scale') {
      // Delete evaluation scale
      const { error } = await supabase
        .from('evaluation_scale')
        .delete()
        .eq('id', scale_data.id)

      if (error) throw error
      return { success: true, message: 'Deleted' }
    }

    if (action === 'get-tenant-info') {
      // Get tenant info
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', tenant_id)
        .single()

      if (error) throw error
      return { success: true, data }
    }

    if (action === 'get-categories') {
      // Get all categories for tenant
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('tenant_id', tenant_id)

      if (error) throw error
      return { success: true, data: data || [] }
    }

    if (action === 'get-user-info') {
      // Get user info
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
    console.error('❌ Evaluation API error:', err)
    throw createError({
      statusCode: err.statusCode || 500,
      message: err.message || 'Evaluation operation failed'
    })
  }
})
