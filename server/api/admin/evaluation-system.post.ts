import { defineEventHandler, readBody, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

interface AdminRequest {
  action: string
  [key: string]: any
}

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const supabase = getSupabaseAdmin()
  const tenantId = profile.tenant_id

  const body = await readBody<AdminRequest>(event)
  const { action } = body

  if (!action) throw createError({ statusCode: 400, statusMessage: 'Missing action' })

  // ─── load-all-data ────────────────────────────────────────────────────────
  if (action === 'load-all-data') {
    const [
      { data: categories },
      { data: evalCategories },
      { data: criteria },
      { data: scale },
      { data: tenant },
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
        .order('category_id')
        .order('display_order'),
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
    ])
    return {
      success: true,
      data: {
        categories: categories || [],
        evaluationCategories: (evalCategories || []).map(cat => ({ ...cat, is_theory: cat.is_theory ?? false })),
        criteria: criteria || [],
        scale: scale || [],
        tenant,
        drivingCategories: categories || [],
        tenantId,
      },
    }
  }

  // ─── load-evaluation-for-category ────────────────────────────────────────
  if (action === 'load-evaluation-for-category') {
    const { driving_category_code } = body
    if (!driving_category_code) throw createError({ statusCode: 400, statusMessage: 'Missing driving_category_code' })

    const [{ data: evalCatData, error: catError }, { data: critData, error: critError }] = await Promise.all([
      supabase
        .from('evaluation_categories')
        .select('*')
        .eq('is_active', true)
        .eq('tenant_id', tenantId)
        .contains('driving_categories', [driving_category_code])
        .order('display_order'),
      supabase
        .from('evaluation_criteria')
        .select(`*, driving_categories, evaluation_categories!inner(tenant_id)`)
        .eq('evaluation_categories.tenant_id', tenantId)
        .contains('driving_categories', [driving_category_code])
        .order('display_order'),
    ])
    if (catError) throw createError({ statusCode: 500, statusMessage: catError.message })
    if (critError) throw createError({ statusCode: 500, statusMessage: critError.message })
    return { success: true, data: { categories: evalCatData || [], criteria: critData || [] } }
  }

  // ─── save-category ────────────────────────────────────────────────────────
  if (action === 'save-category') {
    const { id, name, description, color, display_order, is_theory, driving_category_code } = body

    if (id) {
      const { data, error } = await supabase
        .from('evaluation_categories')
        .update({ name, description, color, display_order, is_theory, driving_category_code })
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single()
      if (error) throw createError({ statusCode: 500, statusMessage: error.message })
      return { success: true, data }
    } else {
      const { data, error } = await supabase
        .from('evaluation_categories')
        .insert({ tenant_id: tenantId, name, description, color, display_order, is_theory: is_theory || false, driving_category_code, is_active: true })
        .select()
        .single()
      if (error) throw createError({ statusCode: 500, statusMessage: error.message })
      return { success: true, data }
    }
  }

  // ─── delete-category ──────────────────────────────────────────────────────
  if (action === 'delete-category') {
    const { id } = body
    if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing id' })
    const { error } = await supabase
      .from('evaluation_categories')
      .update({ is_active: false })
      .eq('id', id)
      .eq('tenant_id', tenantId)
    if (error) throw createError({ statusCode: 500, statusMessage: error.message })
    return { success: true }
  }

  // ─── save-criterion ───────────────────────────────────────────────────────
  if (action === 'save-criterion') {
    const { id, name, description, max_points, category_id, display_order, is_theory, driving_categories, always_visible } = body

    if (id) {
      const { data, error } = await supabase
        .from('evaluation_criteria')
        .update({ name, description, max_points, category_id, display_order, is_theory, driving_categories, always_visible: Boolean(always_visible ?? false) })
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single()
      if (error) throw createError({ statusCode: 500, statusMessage: error.message })
      return { success: true, data }
    } else {
      const { data, error } = await supabase
        .from('evaluation_criteria')
        .insert({ tenant_id: tenantId, name, description, max_points, category_id, display_order, is_theory: is_theory || false, driving_categories, always_visible: Boolean(always_visible ?? false), is_active: true })
        .select()
        .single()
      if (error) throw createError({ statusCode: 500, statusMessage: error.message })
      return { success: true, data }
    }
  }

  // ─── delete-criterion ─────────────────────────────────────────────────────
  if (action === 'delete-criterion') {
    const { id } = body
    if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing id' })
    const { error } = await supabase
      .from('evaluation_criteria')
      .update({ is_active: false })
      .eq('id', id)
      .eq('tenant_id', tenantId)
    if (error) throw createError({ statusCode: 500, statusMessage: error.message })
    return { success: true }
  }

  // ─── save-scale ───────────────────────────────────────────────────────────
  if (action === 'save-scale') {
    const { id, rating, label, description, color } = body

    if (id) {
      const { data, error } = await supabase
        .from('evaluation_scale')
        .update({ rating, label, description, color })
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single()
      if (error) throw createError({ statusCode: 500, statusMessage: error.message })
      return { success: true, data }
    } else {
      const { data, error } = await supabase
        .from('evaluation_scale')
        .insert({ tenant_id: tenantId, rating, label, description, color, is_active: true })
        .select()
        .single()
      if (error) throw createError({ statusCode: 500, statusMessage: error.message })
      return { success: true, data }
    }
  }

  // ─── delete-scale ─────────────────────────────────────────────────────────
  if (action === 'delete-scale') {
    const { id } = body
    if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing id' })
    const { error } = await supabase
      .from('evaluation_scale')
      .update({ is_active: false })
      .eq('id', id)
      .eq('tenant_id', tenantId)
    if (error) throw createError({ statusCode: 500, statusMessage: error.message })
    return { success: true }
  }

  // ─── delete-scale-hard ────────────────────────────────────────────────────
  if (action === 'delete-scale-hard') {
    const { id } = body
    if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing id' })
    const { error } = await supabase
      .from('evaluation_scale')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId)
    if (error) throw createError({ statusCode: 500, statusMessage: error.message })
    return { success: true }
  }

  // ─── load-standards ───────────────────────────────────────────────────────
  if (action === 'load-standards') {
    const { data, error } = await supabase
      .from('evaluation_categories')
      .select('*')
      .eq('is_active', true)
      .is('tenant_id', null)
      .order('display_order')
    if (error) throw createError({ statusCode: 500, statusMessage: error.message })
    return { success: true, data: data || [] }
  }

  // ─── copy-standard-scale ──────────────────────────────────────────────────
  if (action === 'copy-standard-scale') {
    const { data: globalScale, error: fetchError } = await supabase
      .from('evaluation_scale')
      .select('*')
      .is('tenant_id', null)
      .order('rating')
    if (fetchError) throw createError({ statusCode: 500, statusMessage: fetchError.message })
    if (!globalScale || globalScale.length === 0) {
      throw createError({ statusCode: 404, statusMessage: 'Keine globale Standard-Skala gefunden' })
    }
    const { error: insertError } = await supabase
      .from('evaluation_scale')
      .insert(globalScale.map(item => ({
        rating: item.rating,
        label: item.label,
        description: item.description,
        color: item.color,
        is_active: item.is_active,
        tenant_id: tenantId,
      })))
    if (insertError) throw createError({ statusCode: 500, statusMessage: insertError.message })
    return { success: true }
  }

  // ─── copy-standard-categories ─────────────────────────────────────────────
  if (action === 'copy-standard-categories') {
    const { data: globalCats, error: fetchError } = await supabase
      .from('evaluation_categories')
      .select('*')
      .eq('is_active', true)
      .is('tenant_id', null)
      .order('display_order')
    if (fetchError) throw createError({ statusCode: 500, statusMessage: fetchError.message })
    if (!globalCats || globalCats.length === 0) {
      throw createError({ statusCode: 404, statusMessage: 'Keine globalen Standard-Kategorien gefunden' })
    }
    for (const cat of globalCats) {
      const { data: newCat, error: catError } = await supabase
        .from('evaluation_categories')
        .insert({ tenant_id: tenantId, name: cat.name, description: cat.description, color: cat.color, display_order: cat.display_order, is_theory: cat.is_theory || false, is_active: true })
        .select()
        .single()
      if (catError) throw createError({ statusCode: 500, statusMessage: catError.message })

      // Copy criteria for this category
      const { data: globalCriteria } = await supabase
        .from('evaluation_criteria')
        .select('*')
        .eq('category_id', cat.id)
        .eq('is_active', true)
      if (globalCriteria && globalCriteria.length > 0) {
        const { error: critError } = await supabase
          .from('evaluation_criteria')
          .insert(globalCriteria.map(c => ({
            tenant_id: tenantId,
            category_id: newCat.id,
            name: c.name,
            description: c.description,
            max_points: c.max_points,
            display_order: c.display_order,
            is_theory: c.is_theory || false,
            always_visible: c.always_visible || false,
            is_active: true,
          })))
        if (critError) throw createError({ statusCode: 500, statusMessage: critError.message })
      }
    }
    return { success: true }
  }

  // ─── update-criteria-driving-categories ───────────────────────────────────
  if (action === 'update-criteria-driving-categories') {
    const { id, driving_categories } = body
    if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing id' })
    // Verify this criteria belongs to tenant before updating
    const { data: criteriaCheck } = await supabase
      .from('evaluation_criteria')
      .select('id, tenant_id')
      .eq('id', id)
      .single()
    if (!criteriaCheck || criteriaCheck.tenant_id !== tenantId) {
      throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
    }
    const { error } = await supabase
      .from('evaluation_criteria')
      .update({ driving_categories })
      .eq('id', id)
    if (error) throw createError({ statusCode: 500, statusMessage: error.message })
    return { success: true }
  }

  // ─── update-criteria-order ────────────────────────────────────────────────
  if (action === 'update-criteria-order') {
    const { updates } = body // [{ id, display_order }]
    if (!Array.isArray(updates)) throw createError({ statusCode: 400, statusMessage: 'Missing updates array' })
    for (const update of updates) {
      if (!update.id) continue
      const { data: criteriaCheck } = await supabase
        .from('evaluation_criteria')
        .select('id, tenant_id')
        .eq('id', update.id)
        .single()
      if (!criteriaCheck || criteriaCheck.tenant_id !== tenantId) continue
      const { error } = await supabase
        .from('evaluation_criteria')
        .update({ display_order: update.display_order })
        .eq('id', update.id)
      if (error) throw createError({ statusCode: 500, statusMessage: error.message })
    }
    return { success: true }
  }

  // ─── update-all-criteria-driving-categories ───────────────────────────────
  if (action === 'update-all-criteria-driving-categories') {
    const { updates } = body // [{ id, driving_categories }]
    if (!Array.isArray(updates)) throw createError({ statusCode: 400, statusMessage: 'Missing updates array' })
    for (const update of updates) {
      if (!update.id) continue
      const { data: criteriaCheck } = await supabase
        .from('evaluation_criteria')
        .select('id, tenant_id')
        .eq('id', update.id)
        .single()
      if (!criteriaCheck || criteriaCheck.tenant_id !== tenantId) continue
      const { error } = await supabase
        .from('evaluation_criteria')
        .update({ driving_categories: update.driving_categories })
        .eq('id', update.id)
      if (error) throw createError({ statusCode: 500, statusMessage: error.message })
    }
    return { success: true }
  }

  // ─── save-inline-criteria ─────────────────────────────────────────────────
  if (action === 'save-inline-criteria') {
    const { category_id, name, description, driving_categories, display_order } = body
    if (!category_id || !name) throw createError({ statusCode: 400, statusMessage: 'Missing category_id or name' })
    // Verify category belongs to tenant
    const { data: catCheck } = await supabase
      .from('evaluation_categories')
      .select('id')
      .eq('id', category_id)
      .eq('tenant_id', tenantId)
      .single()
    if (!catCheck) throw createError({ statusCode: 403, statusMessage: 'Category not found for this tenant' })
    const { data, error } = await supabase
      .from('evaluation_criteria')
      .insert({ tenant_id: tenantId, category_id, name, description: description || '', driving_categories: driving_categories || [], display_order: display_order || 0, is_active: true, is_theory: false })
      .select()
      .single()
    if (error) throw createError({ statusCode: 500, statusMessage: error.message })
    return { success: true, data }
  }

  // ─── save-educational-content ─────────────────────────────────────────────
  if (action === 'save-educational-content') {
    const { id, educational_content } = body
    if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing id' })
    const { data: criteriaCheck } = await supabase
      .from('evaluation_criteria')
      .select('id, tenant_id')
      .eq('id', id)
      .single()
    if (!criteriaCheck || criteriaCheck.tenant_id !== tenantId) {
      throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
    }
    const { error } = await supabase
      .from('evaluation_criteria')
      .update({ educational_content, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw createError({ statusCode: 500, statusMessage: error.message })
    return { success: true }
  }

  throw createError({ statusCode: 400, statusMessage: `Unknown action: ${action}` })
})
