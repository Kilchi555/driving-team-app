import { defineEventHandler, readBody, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

interface AdminRequest {
  action: string
  [key: string]: any
}

/**
 * When both tenant-specific and global (tenant_id=null) entries exist for the
 * same rating value, prefer the tenant-specific one and drop the global.
 */
function deduplicateByRating(items: any[], tenantId: string): any[] {
  const tenantItems = items.filter(i => i.tenant_id === tenantId)
  if (tenantItems.length > 0) return tenantItems
  return items.filter(i => i.tenant_id === null)
}

/**
 * Resolve a requested evaluation_scale row id to one the tenant actually owns.
 *
 * The scale UI can show global default rows (tenant_id = null) when a tenant
 * hasn't customized its scale yet. Editing/deleting those directly would
 * either fail (0 rows matched by `.eq('tenant_id', tenantId)`) or silently
 * no-op. Instead, materialize the tenant's own copy of the full standard
 * scale on first write, then operate on the tenant-owned row with the same
 * rating.
 */
async function resolveTenantScaleId(supabase: any, tenantId: string, requestedId: string): Promise<string> {
  const { data: row, error } = await supabase
    .from('evaluation_scale')
    .select('id, rating, tenant_id')
    .eq('id', requestedId)
    .single()
  if (error || !row) {
    throw createError({ statusCode: 404, statusMessage: 'Bewertungsstufe nicht gefunden' })
  }
  if (row.tenant_id === tenantId) {
    return requestedId
  }
  if (row.tenant_id !== null) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  // Global row — materialize the tenant's own full scale, then map to it.
  const { data: globalScale, error: globalError } = await supabase
    .from('evaluation_scale')
    .select('*')
    .is('tenant_id', null)
  if (globalError) throw createError({ statusCode: 500, statusMessage: globalError.message })

  const { data: existingScale, error: existingError } = await supabase
    .from('evaluation_scale')
    .select('rating')
    .eq('tenant_id', tenantId)
  if (existingError) throw createError({ statusCode: 500, statusMessage: existingError.message })

  const existingRatings = new Set((existingScale || []).map((s: any) => s.rating))
  const missingScale = (globalScale || []).filter((item: any) => !existingRatings.has(item.rating))

  if (missingScale.length > 0) {
    const { error: insertError } = await supabase
      .from('evaluation_scale')
      .insert(missingScale.map((item: any) => ({
        rating: item.rating,
        label: item.label,
        description: item.description,
        color: item.color,
        is_active: item.is_active,
        tenant_id: tenantId,
      })))
    if (insertError) throw createError({ statusCode: 500, statusMessage: insertError.message })
  }

  const { data: ownRow, error: ownError } = await supabase
    .from('evaluation_scale')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('rating', row.rating)
    .single()
  if (ownError || !ownRow) {
    throw createError({ statusCode: 500, statusMessage: 'Konnte eigene Bewertungsstufe nicht anlegen' })
  }
  return ownRow.id
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
      // is_theory lives on evaluation_categories only — filtering it here
      // makes PostgREST reject the whole criteria query (silent empty list).
      supabase
        .from('evaluation_criteria')
        .select('*')
        .eq('tenant_id', tenantId)
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
        scale: deduplicateByRating(scale || [], tenantId),
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

    // Soft-deleted rows (is_active=false) still occupy UNIQUE(rating, tenant_id).
    // The UI only lists active rows, so create/edit can hit a "phantom" rating.
    // Reuse inactive slots instead of failing with a duplicate-key 500.
    const findTenantRating = async (ratingValue: number, excludeId?: string) => {
      let q = supabase
        .from('evaluation_scale')
        .select('id, is_active')
        .eq('tenant_id', tenantId)
        .eq('rating', ratingValue)
      if (excludeId) q = q.neq('id', excludeId)
      const { data, error } = await q.maybeSingle()
      if (error) throw createError({ statusCode: 500, statusMessage: error.message })
      return data
    }

    if (id) {
      const ownedId = await resolveTenantScaleId(supabase, tenantId, id)
      const conflict = await findTenantRating(rating, ownedId)
      if (conflict) {
        if (conflict.is_active) {
          throw createError({
            statusCode: 409,
            statusMessage: `Die Rating-Nummer ${rating} wird bereits verwendet.`,
          })
        }
        // Free the inactive slot so this rating can be reassigned.
        const { error: delError } = await supabase
          .from('evaluation_scale')
          .delete()
          .eq('id', conflict.id)
          .eq('tenant_id', tenantId)
        if (delError) throw createError({ statusCode: 500, statusMessage: delError.message })
      }

      const { data, error } = await supabase
        .from('evaluation_scale')
        .update({ rating, label, description, color, is_active: true })
        .eq('id', ownedId)
        .eq('tenant_id', tenantId)
        .select()
        .single()
      if (error) throw createError({ statusCode: 500, statusMessage: error.message })
      return { success: true, data }
    }

    const existing = await findTenantRating(rating)
    if (existing) {
      if (existing.is_active) {
        throw createError({
          statusCode: 409,
          statusMessage: `Die Rating-Nummer ${rating} wird bereits verwendet.`,
        })
      }
      // Reactivate the soft-deleted row with the new labels.
      const { data, error } = await supabase
        .from('evaluation_scale')
        .update({ label, description, color, is_active: true })
        .eq('id', existing.id)
        .eq('tenant_id', tenantId)
        .select()
        .single()
      if (error) throw createError({ statusCode: 500, statusMessage: error.message })
      return { success: true, data }
    }

    const { data, error } = await supabase
      .from('evaluation_scale')
      .insert({ tenant_id: tenantId, rating, label, description, color, is_active: true })
      .select()
      .single()
    if (error) throw createError({ statusCode: 500, statusMessage: error.message })
    return { success: true, data }
  }

  // ─── delete-scale ─────────────────────────────────────────────────────────
  if (action === 'delete-scale') {
    const { id } = body
    if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing id' })
    const ownedId = await resolveTenantScaleId(supabase, tenantId, id)
    const { error } = await supabase
      .from('evaluation_scale')
      .update({ is_active: false })
      .eq('id', ownedId)
      .eq('tenant_id', tenantId)
    if (error) throw createError({ statusCode: 500, statusMessage: error.message })
    return { success: true }
  }

  // ─── delete-scale-hard ────────────────────────────────────────────────────
  if (action === 'delete-scale-hard') {
    const { id } = body
    if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing id' })
    const ownedId = await resolveTenantScaleId(supabase, tenantId, id)
    const { error } = await supabase
      .from('evaluation_scale')
      .delete()
      .eq('id', ownedId)
      .eq('tenant_id', tenantId)
    if (error) throw createError({ statusCode: 500, statusMessage: error.message })
    return { success: true }
  }

  // ─── load-standards ───────────────────────────────────────────────────────
  if (action === 'load-standards') {
    const { data: tenantRow } = await supabase
      .from('tenants')
      .select('business_type')
      .eq('id', tenantId)
      .single()
    const businessType = tenantRow?.business_type || null

    const q = supabase
      .from('evaluation_categories')
      .select('*')
      .eq('is_active', true)
      .is('tenant_id', null)
      .order('display_order')
    if (businessType) q.eq('business_type', businessType)

    const { data, error } = await q
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

    // Only copy ratings the tenant doesn't already have — avoids a unique
    // constraint violation (rating, tenant_id) when the tenant already
    // customized some levels (e.g. a partial copy or manual edit happened before).
    const { data: existingScale, error: existingError } = await supabase
      .from('evaluation_scale')
      .select('rating')
      .eq('tenant_id', tenantId)
    if (existingError) throw createError({ statusCode: 500, statusMessage: existingError.message })

    const existingRatings = new Set((existingScale || []).map(s => s.rating))
    const missingScale = globalScale.filter(item => !existingRatings.has(item.rating))

    if (missingScale.length === 0) {
      return { success: true, message: 'Alle Bewertungsstufen sind bereits vorhanden' }
    }

    const { error: insertError } = await supabase
      .from('evaluation_scale')
      .insert(missingScale.map(item => ({
        rating: item.rating,
        label: item.label,
        description: item.description,
        color: item.color,
        is_active: item.is_active,
        tenant_id: tenantId,
      })))
    if (insertError) throw createError({ statusCode: 500, statusMessage: insertError.message })
    return { success: true, copiedCount: missingScale.length }
  }

  // ─── copy-standard-categories ─────────────────────────────────────────────
  if (action === 'copy-standard-categories') {
    // Get tenant's business_type
    const { data: tenantRow } = await supabase
      .from('tenants')
      .select('business_type')
      .eq('id', tenantId)
      .single()
    const businessType = tenantRow?.business_type || null

    const globalCatsQuery = supabase
      .from('evaluation_categories')
      .select('*')
      .eq('is_active', true)
      .is('tenant_id', null)
      .order('display_order')
    if (businessType) globalCatsQuery.eq('business_type', businessType)

    const { data: globalCats, error: fetchError } = await globalCatsQuery
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

  // ─── save-staff-content ────────────────────────────────────────────────────
  if (action === 'save-staff-content') {
    const { id, staff_content } = body
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
      .update({ staff_content, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw createError({ statusCode: 500, statusMessage: error.message })
    return { success: true }
  }

  throw createError({ statusCode: 400, statusMessage: `Unknown action: ${action}` })
})
