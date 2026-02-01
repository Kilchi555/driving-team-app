// api/admin/manage.post.ts
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

    // EVALUATION SYSTEM
    if (action === 'get-evaluation-categories') {
      return await getEvaluationCategories(body, session.user.id)
    }
    if (action === 'get-evaluation-criteria') {
      return await getEvaluationCriteria(body, session.user.id)
    }
    if (action === 'get-evaluation-scale') {
      return await getEvaluationScale(body, session.user.id)
    }
    if (action === 'create-evaluation-category') {
      return await createEvaluationCategory(body, session.user.id)
    }
    if (action === 'update-evaluation-category') {
      return await updateEvaluationCategory(body, session.user.id)
    }
    if (action === 'delete-evaluation-category') {
      return await deleteEvaluationCategory(body, session.user.id)
    }
    if (action === 'create-evaluation-criterion') {
      return await createEvaluationCriterion(body, session.user.id)
    }
    if (action === 'update-evaluation-criterion') {
      return await updateEvaluationCriterion(body, session.user.id)
    }
    if (action === 'delete-evaluation-criterion') {
      return await deleteEvaluationCriterion(body, session.user.id)
    }

    throw new Error('Invalid action')
  } catch (err: any) {
    console.error('Admin manage error:', err)
    return {
      success: false,
      error: err.message || 'Operation failed'
    }
  }
})

// EVALUATION SYSTEM HANDLERS
async function getEvaluationCategories(body: AdminRequest, userId: string) {
  const { tenant_id, driving_category_code } = body

  // Verify user is admin of this tenant
  const { data: userProfile, error: profileError } = await supabase
    .from('users')
    .select('tenant_id, role')
    .eq('id', userId)
    .single()

  if (profileError || !userProfile || userProfile.role !== 'admin') {
    throw new Error('Unauthorized - not admin')
  }

  if (userProfile.tenant_id !== tenant_id) {
    throw new Error('Unauthorized - wrong tenant')
  }

  // Get categories for this tenant
  let query = supabase
    .from('evaluation_categories')
    .select('id, name, description, color, display_order, is_active, tenant_id, is_theory')
    .eq('tenant_id', tenant_id)
    .eq('is_active', true)

  if (driving_category_code) {
    query = query.eq('driving_category_code', driving_category_code)
  }

  const { data, error } = await query.order('display_order', { ascending: true })

  if (error) throw error

  return {
    success: true,
    data: data || []
  }
}

async function getEvaluationCriteria(body: AdminRequest, userId: string) {
  const { tenant_id, category_id, is_theory } = body

  // Verify user is admin of this tenant
  const { data: userProfile, error: profileError } = await supabase
    .from('users')
    .select('tenant_id, role')
    .eq('id', userId)
    .single()

  if (profileError || !userProfile || userProfile.role !== 'admin') {
    throw new Error('Unauthorized - not admin')
  }

  if (userProfile.tenant_id !== tenant_id) {
    throw new Error('Unauthorized - wrong tenant')
  }

  // Get criteria
  let query = supabase
    .from('evaluation_criteria')
    .select(`
      id,
      name,
      description,
      max_points,
      category_id,
      is_active,
      tenant_id,
      category:evaluation_categories(id, name)
    `)
    .eq('tenant_id', tenant_id)
    .eq('is_active', true)

  if (category_id) {
    query = query.eq('category_id', category_id)
  }

  if (is_theory !== undefined) {
    query = query.eq('is_theory', is_theory)
  }

  const { data, error } = await query.order('id', { ascending: true })

  if (error) throw error

  return {
    success: true,
    data: data || []
  }
}

async function getEvaluationScale(body: AdminRequest, userId: string) {
  const { tenant_id } = body

  // Verify user is admin
  const { data: userProfile, error: profileError } = await supabase
    .from('users')
    .select('tenant_id, role')
    .eq('id', userId)
    .single()

  if (profileError || !userProfile || userProfile.role !== 'admin') {
    throw new Error('Unauthorized - not admin')
  }

  if (userProfile.tenant_id !== tenant_id) {
    throw new Error('Unauthorized - wrong tenant')
  }

  const { data, error } = await supabase
    .from('evaluation_scale')
    .select('id, rating, label, description, color, is_active, tenant_id')
    .eq('tenant_id', tenant_id)
    .eq('is_active', true)
    .order('rating', { ascending: false })

  if (error) throw error

  return {
    success: true,
    data: data || []
  }
}

async function createEvaluationCategory(body: AdminRequest, userId: string) {
  const { tenant_id, name, description, color, display_order, is_theory, driving_category_code } = body

  // Verify admin
  const { data: userProfile } = await supabase
    .from('users')
    .select('tenant_id, role')
    .eq('id', userId)
    .single()

  if (!userProfile || userProfile.role !== 'admin' || userProfile.tenant_id !== tenant_id) {
    throw new Error('Unauthorized')
  }

  const { data, error } = await supabase
    .from('evaluation_categories')
    .insert({
      tenant_id,
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

  return {
    success: true,
    data
  }
}

async function updateEvaluationCategory(body: AdminRequest, userId: string) {
  const { tenant_id, id, name, description, color, display_order, is_theory } = body

  // Verify admin
  const { data: userProfile } = await supabase
    .from('users')
    .select('tenant_id, role')
    .eq('id', userId)
    .single()

  if (!userProfile || userProfile.role !== 'admin' || userProfile.tenant_id !== tenant_id) {
    throw new Error('Unauthorized')
  }

  const { data, error } = await supabase
    .from('evaluation_categories')
    .update({
      name,
      description,
      color,
      display_order,
      is_theory
    })
    .eq('id', id)
    .eq('tenant_id', tenant_id)
    .select()
    .single()

  if (error) throw error

  return {
    success: true,
    data
  }
}

async function deleteEvaluationCategory(body: AdminRequest, userId: string) {
  const { tenant_id, id } = body

  // Verify admin
  const { data: userProfile } = await supabase
    .from('users')
    .select('tenant_id, role')
    .eq('id', userId)
    .single()

  if (!userProfile || userProfile.role !== 'admin' || userProfile.tenant_id !== tenant_id) {
    throw new Error('Unauthorized')
  }

  const { error } = await supabase
    .from('evaluation_categories')
    .update({ is_active: false })
    .eq('id', id)
    .eq('tenant_id', tenant_id)

  if (error) throw error

  return {
    success: true
  }
}

async function createEvaluationCriterion(body: AdminRequest, userId: string) {
  const { tenant_id, name, description, max_points, category_id, is_theory } = body

  // Verify admin
  const { data: userProfile } = await supabase
    .from('users')
    .select('tenant_id, role')
    .eq('id', userId)
    .single()

  if (!userProfile || userProfile.role !== 'admin' || userProfile.tenant_id !== tenant_id) {
    throw new Error('Unauthorized')
  }

  const { data, error } = await supabase
    .from('evaluation_criteria')
    .insert({
      tenant_id,
      name,
      description,
      max_points,
      category_id,
      is_theory: is_theory || false,
      is_active: true
    })
    .select()
    .single()

  if (error) throw error

  return {
    success: true,
    data
  }
}

async function updateEvaluationCriterion(body: AdminRequest, userId: string) {
  const { tenant_id, id, name, description, max_points } = body

  // Verify admin
  const { data: userProfile } = await supabase
    .from('users')
    .select('tenant_id, role')
    .eq('id', userId)
    .single()

  if (!userProfile || userProfile.role !== 'admin' || userProfile.tenant_id !== tenant_id) {
    throw new Error('Unauthorized')
  }

  const { data, error } = await supabase
    .from('evaluation_criteria')
    .update({
      name,
      description,
      max_points
    })
    .eq('id', id)
    .eq('tenant_id', tenant_id)
    .select()
    .single()

  if (error) throw error

  return {
    success: true,
    data
  }
}

async function deleteEvaluationCriterion(body: AdminRequest, userId: string) {
  const { tenant_id, id } = body

  // Verify admin
  const { data: userProfile } = await supabase
    .from('users')
    .select('tenant_id, role')
    .eq('id', userId)
    .single()

  if (!userProfile || userProfile.role !== 'admin' || userProfile.tenant_id !== tenant_id) {
    throw new Error('Unauthorized')
  }

  const { error } = await supabase
    .from('evaluation_criteria')
    .update({ is_active: false })
    .eq('id', id)
    .eq('tenant_id', tenant_id)

  if (error) throw error

  return {
    success: true
  }
}
