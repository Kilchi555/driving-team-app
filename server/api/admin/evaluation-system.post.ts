// api/admin/evaluation-system.post.ts
import { defineEventHandler, readBody } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { getServerSession } from '#auth'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface AdminRequest {
  action: string
  [key: string]: any
}

export default defineEventHandler(async (event) => {
  try {
    const session = await getServerSession(event)
    if (!session?.user?.id) {
      throw new Error('Unauthorized')
    }

    const body = await readBody<AdminRequest>(event)
    const { action } = body

    if (action === 'load-all-data') {
      return await loadAllEvaluationData(session.user.id)
    }
    if (action === 'save-category') {
      return await saveCategory(body, session.user.id)
    }
    if (action === 'delete-category') {
      return await deleteCategory(body, session.user.id)
    }
    if (action === 'save-criterion') {
      return await saveCriterion(body, session.user.id)
    }
    if (action === 'delete-criterion') {
      return await deleteCriterion(body, session.user.id)
    }
    if (action === 'save-scale') {
      return await saveScale(body, session.user.id)
    }
    if (action === 'delete-scale') {
      return await deleteScale(body, session.user.id)
    }
    if (action === 'load-standards') {
      return await loadStandardCategories(body, session.user.id)
    }

    throw new Error('Invalid action')
  } catch (err: any) {
    console.error('Evaluation system error:', err)
    return {
      success: false,
      error: err.message || 'Operation failed'
    }
  }
})

async function loadAllEvaluationData(userId: string) {
  // Get user's tenant
  const { data: userProfile, error: profileError } = await supabase
    .from('users')
    .select('tenant_id, id')
    .eq('id', userId)
    .single()

  if (profileError || !userProfile?.tenant_id) {
    throw new Error('Tenant information not found')
  }

  const tenantId = userProfile.tenant_id

  // Load all data in parallel
  const [
    { data: categories },
    { data: evalCategories },
    { data: criteria },
    { data: scale },
    { data: tenant },
    { data: drivingCategories }
  ] = await Promise.all([
    supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .eq('tenant_id', tenantId)
      .order('code'),
    
    supabase
      .from('evaluation_categories')
      .select('id, name, description, color, display_order, is_active, tenant_id, is_theory')
      .eq('is_active', true)
      .or(`tenant_id.eq.${tenantId},and(is_theory.eq.true,tenant_id.is.null)`)
      .order('display_order'),
    
    supabase
      .from('evaluation_criteria')
      .select('*')
      .or(`tenant_id.eq.${tenantId},is_theory.eq.true`)
      .eq('is_active', true)
      .order('category_id'),
    
    supabase
      .from('evaluation_scale')
      .select('id, rating, label, description, color, is_active, tenant_id')
      .eq('is_active', true)
      .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
      .order('rating', { ascending: false }),
    
    supabase
      .from('tenants')
      .select('id, name, business_type, slug')
      .eq('id', tenantId)
      .single(),
    
    supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .eq('tenant_id', tenantId)
      .order('code')
  ])

  return {
    success: true,
    data: {
      categories: categories || [],
      evaluationCategories: evalCategories || [],
      criteria: criteria || [],
      scale: scale || [],
      tenant: tenant,
      drivingCategories: drivingCategories || [],
      tenantId
    }
  }
}

async function saveCategory(body: AdminRequest, userId: string) {
  const { tenantId, id, name, description, color, display_order, is_theory, driving_category_code } = body

  // Verify authorization
  const { data: userProfile } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('id', userId)
    .single()

  if (userProfile?.tenant_id !== tenantId) {
    throw new Error('Unauthorized')
  }

  if (id) {
    // Update
    const { data, error } = await supabase
      .from('evaluation_categories')
      .update({
        name,
        description,
        color,
        display_order,
        is_theory,
        driving_category_code
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error) throw error
    return { success: true, data }
  } else {
    // Create
    const { data, error } = await supabase
      .from('evaluation_categories')
      .insert({
        tenant_id: tenantId,
        name,
        description,
        color,
        display_order,
        is_theory: is_theory || false,
        driving_category_code,
        is_active: true
      })
      .select()
      .single()

    if (error) throw error
    return { success: true, data }
  }
}

async function deleteCategory(body: AdminRequest, userId: string) {
  const { tenantId, id } = body

  const { data: userProfile } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('id', userId)
    .single()

  if (userProfile?.tenant_id !== tenantId) {
    throw new Error('Unauthorized')
  }

  const { error } = await supabase
    .from('evaluation_categories')
    .update({ is_active: false })
    .eq('id', id)
    .eq('tenant_id', tenantId)

  if (error) throw error
  return { success: true }
}

async function saveCriterion(body: AdminRequest, userId: string) {
  const { tenantId, id, name, description, max_points, category_id, display_order, is_theory, driving_categories } = body

  const { data: userProfile } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('id', userId)
    .single()

  if (userProfile?.tenant_id !== tenantId) {
    throw new Error('Unauthorized')
  }

  if (id) {
    // Update
    const { data, error } = await supabase
      .from('evaluation_criteria')
      .update({
        name,
        description,
        max_points,
        category_id,
        display_order,
        is_theory,
        driving_categories
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error) throw error
    return { success: true, data }
  } else {
    // Create
    const { data, error } = await supabase
      .from('evaluation_criteria')
      .insert({
        tenant_id: tenantId,
        name,
        description,
        max_points,
        category_id,
        display_order,
        is_theory: is_theory || false,
        driving_categories,
        is_active: true
      })
      .select()
      .single()

    if (error) throw error
    return { success: true, data }
  }
}

async function deleteCriterion(body: AdminRequest, userId: string) {
  const { tenantId, id } = body

  const { data: userProfile } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('id', userId)
    .single()

  if (userProfile?.tenant_id !== tenantId) {
    throw new Error('Unauthorized')
  }

  const { error } = await supabase
    .from('evaluation_criteria')
    .update({ is_active: false })
    .eq('id', id)
    .eq('tenant_id', tenantId)

  if (error) throw error
  return { success: true }
}

async function saveScale(body: AdminRequest, userId: string) {
  const { tenantId, id, rating, label, description, color } = body

  const { data: userProfile } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('id', userId)
    .single()

  if (userProfile?.tenant_id !== tenantId) {
    throw new Error('Unauthorized')
  }

  if (id) {
    // Update
    const { data, error } = await supabase
      .from('evaluation_scale')
      .update({ rating, label, description, color })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error) throw error
    return { success: true, data }
  } else {
    // Create
    const { data, error } = await supabase
      .from('evaluation_scale')
      .insert({
        tenant_id: tenantId,
        rating,
        label,
        description,
        color,
        is_active: true
      })
      .select()
      .single()

    if (error) throw error
    return { success: true, data }
  }
}

async function deleteScale(body: AdminRequest, userId: string) {
  const { tenantId, id } = body

  const { data: userProfile } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('id', userId)
    .single()

  if (userProfile?.tenant_id !== tenantId) {
    throw new Error('Unauthorized')
  }

  const { error } = await supabase
    .from('evaluation_scale')
    .update({ is_active: false })
    .eq('id', id)
    .eq('tenant_id', tenantId)

  if (error) throw error
  return { success: true }
}

async function loadStandardCategories(body: AdminRequest, userId: string) {
  // Load standard (global) evaluation categories for driving schools
  const { data, error } = await supabase
    .from('evaluation_categories')
    .select('*')
    .eq('is_active', true)
    .is('tenant_id', null)  // Global categories
    .order('display_order')

  if (error) throw error
  return { success: true, data: data || [] }
}
