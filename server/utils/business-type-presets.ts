// server/utils/business-type-presets.ts
//
// Single source of truth for "business type" driven tenant defaults.
//
// - `business_types` (DB table) is the allowlist of selectable business
//   types. Super-admins manage it via /tenant-admin/business-types.
// - `business_type_presets` (DB table) holds feature flags, UI labels and
//   simple JSON defaults (e.g. suggested pricing rules) per business type.
// - Structural defaults with real relations (categories incl. parent/child,
//   event types, evaluation categories/criteria/scale) stay as template rows
//   (`tenant_id IS NULL`) on their normal tables, tagged with `business_type`.
//   This keeps referential integrity (parent_category_id, criteria→category)
//   instead of duplicating relational data inside a JSON blob.
//
// This module centralizes reading/copying so registration and any future
// "reseed a tenant" admin action use exactly the same logic.

import { logger } from '~/utils/logger'

type SupabaseAdmin = ReturnType<typeof import('~/utils/supabase').getSupabaseAdmin>

export interface BusinessTypePreset {
  business_type_code: string
  feature_flags: Record<string, boolean>
  ui_labels: Record<string, string>
  defaults: Record<string, any>
}

/** Active business type codes from the DB — the only valid allowlist. */
export async function getActiveBusinessTypeCodes(supabase: SupabaseAdmin): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('business_types')
    .select('code')
    .eq('is_active', true)

  if (error || !data?.length) {
    logger.warn('⚠️ Failed to load business_types, falling back to driving_school only:', error)
    return new Set(['driving_school'])
  }
  return new Set(data.map((r: any) => r.code))
}

/** Resolves a submitted business_type against the live allowlist, defaulting to driving_school. */
export async function resolveBusinessType(supabase: SupabaseAdmin, submitted: string | undefined | null): Promise<string> {
  const valid = await getActiveBusinessTypeCodes(supabase)
  return submitted && valid.has(submitted) ? submitted : 'driving_school'
}

export async function getBusinessTypePreset(supabase: SupabaseAdmin, businessType: string): Promise<BusinessTypePreset | null> {
  const { data } = await supabase
    .from('business_type_presets')
    .select('business_type_code, feature_flags, ui_labels, defaults')
    .eq('business_type_code', businessType)
    .maybeSingle()
  return data as BusinessTypePreset | null
}

/**
 * Copies category + event_type template rows (tenant_id IS NULL) matching
 * `businessType` onto a new/existing tenant. Additive only — never deletes
 * or modifies rows the tenant already has.
 */
export async function applyCategoryAndEventTypeDefaults(
  supabase: SupabaseAdmin,
  tenantId: string,
  businessType: string,
  opts: { selectedCategoryIds?: string[]; theoryEnabled?: boolean; skipExistingCodes?: boolean } = {}
): Promise<{ categoriesCopied: number; eventTypesCopied: number }> {
  const now = new Date().toISOString()
  let categoriesCopied = 0
  let eventTypesCopied = 0

  // ── Categories ─────────────────────────────────────────────────────────
  try {
    const { data: allTemplates, error: fetchError } = await supabase
      .from('categories')
      .select('id, code, name, description, color, is_active, exam_duration_minutes, lesson_duration_minutes, theory_durations, document_requirements, parent_category_id, icon_svg')
      .is('tenant_id', null)
      .eq('is_active', true)
      .eq('business_type', businessType)
      .order('code', { ascending: true })

    if (fetchError || !allTemplates?.length) {
      logger.warn(`⚠️ No template categories found for business_type=${businessType}`)
    } else {
      const templateIds = new Set(allTemplates.map(c => c.id))
      const validTemplates = allTemplates.filter(c => !c.parent_category_id || templateIds.has(c.parent_category_id))

      let existingCodes = new Set<string>()
      if (opts.skipExistingCodes) {
        const { data: existing } = await supabase.from('categories').select('code').eq('tenant_id', tenantId)
        existingCodes = new Set((existing || []).map((c: any) => c.code))
      }

      const filtered = opts.selectedCategoryIds?.length
        ? validTemplates.filter(c => {
            if (!c.parent_category_id) return opts.selectedCategoryIds!.includes(String(c.id))
            const parentSelected = opts.selectedCategoryIds!.includes(String(c.parent_category_id))
            if (!parentSelected) return false
            const hasSpecificChildSelected = validTemplates.some(sibling =>
              sibling.parent_category_id === c.parent_category_id &&
              opts.selectedCategoryIds!.includes(String(sibling.id))
            )
            return hasSpecificChildSelected ? opts.selectedCategoryIds!.includes(String(c.id)) : true
          })
        : validTemplates

      const parentCats = filtered.filter(c => !c.parent_category_id && !existingCodes.has(c.code))
      const leafCats = filtered.filter(c => c.parent_category_id)
      const oldToNewId = new Map<number, number>()

      if (parentCats.length > 0) {
        const { data: insertedParents, error: pErr } = await supabase
          .from('categories')
          .insert(parentCats.map(cat => ({
            tenant_id: tenantId,
            code: cat.code,
            name: cat.name,
            description: cat.description,
            color: cat.color,
            is_active: cat.is_active,
            exam_duration_minutes: cat.exam_duration_minutes,
            lesson_duration_minutes: cat.lesson_duration_minutes,
            theory_durations: cat.theory_durations,
            document_requirements: cat.document_requirements,
            icon_svg: cat.icon_svg,
            parent_category_id: null,
            created_at: now,
            updated_at: now,
          })))
          .select('id')

        if (pErr) logger.warn('⚠️ Parent category insert error:', pErr)
        else if (insertedParents) {
          parentCats.forEach((cat, i) => { if (insertedParents[i]) oldToNewId.set(cat.id, insertedParents[i].id) })
          categoriesCopied += parentCats.length
        }
      }

      const leafToInsert = leafCats.filter(c => !existingCodes.has(c.code))
      if (leafToInsert.length > 0) {
        const { error: lErr } = await supabase
          .from('categories')
          .insert(leafToInsert.map(cat => ({
            tenant_id: tenantId,
            code: cat.code,
            name: cat.name,
            description: cat.description,
            color: cat.color,
            is_active: cat.is_active,
            exam_duration_minutes: cat.exam_duration_minutes,
            lesson_duration_minutes: cat.lesson_duration_minutes,
            theory_durations: cat.theory_durations,
            document_requirements: cat.document_requirements,
            icon_svg: cat.icon_svg,
            parent_category_id: cat.parent_category_id ? (oldToNewId.get(cat.parent_category_id) ?? null) : null,
            created_at: now,
            updated_at: now,
          })))
        if (lErr) logger.warn('⚠️ Leaf category insert error:', lErr)
        else categoriesCopied += leafToInsert.length
      }
    }
  } catch (err) { logger.warn('⚠️ Category default copy failed:', err) }

  // ── Event Types ─────────────────────────────────────────────────────────
  try {
    let existingEtCodes = new Set<string>()
    if (opts.skipExistingCodes) {
      const { data: existing } = await supabase.from('event_types').select('code').eq('tenant_id', tenantId)
      existingEtCodes = new Set((existing || []).map((e: any) => e.code))
    }

    const { data: etTemplates, error: etErr } = await supabase
      .from('event_types')
      .select('*')
      .is('tenant_id', null)
      .eq('business_type', businessType)

    if (!etErr && etTemplates?.length) {
      const toInsert = etTemplates.filter(et => !existingEtCodes.has(et.code))
      if (toInsert.length > 0) {
        const { error: etInsertErr } = await supabase.from('event_types').insert(
          toInsert.map(({ business_type: _templateBusinessType, ...et }) => ({
            ...et,
            id: crypto.randomUUID(),
            tenant_id: tenantId,
            created_at: now,
            updated_at: now,
            // Theory is created but inactive unless the tenant explicitly enabled it
            // during onboarding, so it doesn't clutter the calendar by default.
            ...(et.code === 'theory' && !opts.theoryEnabled ? { is_active: false } : {}),
          }))
        )
        if (etInsertErr) logger.warn('⚠️ Event types insert failed:', etInsertErr)
        else eventTypesCopied += toInsert.length
      }
    }
  } catch (err) { logger.warn('⚠️ Event type default copy failed:', err) }

  logger.debug(`✅ Applied business_type=${businessType} defaults: ${categoriesCopied} categories, ${eventTypesCopied} event types`)
  return { categoriesCopied, eventTypesCopied }
}

/**
 * Copies evaluation_categories (+ criteria + scale) template rows matching
 * `businessType` onto a tenant. Additive only.
 */
export async function applyEvaluationDefaults(supabase: SupabaseAdmin, tenantId: string, businessType: string): Promise<void> {
  const now = new Date().toISOString()
  try {
    const { data: evalCats, error: ecErr } = await supabase
      .from('evaluation_categories')
      .select('*')
      .is('tenant_id', null)
      .eq('business_type', businessType)

    if (ecErr || !evalCats?.length) return

    const ecIdMap = new Map<string, string>()
    for (const ec of evalCats) ecIdMap.set(ec.id, crypto.randomUUID())

    await supabase.from('evaluation_categories').insert(
      evalCats.map(ec => ({ ...ec, id: ecIdMap.get(ec.id)!, tenant_id: tenantId, created_at: now, updated_at: now }))
    )
    logger.debug(`✅ Copied ${evalCats.length} evaluation categories`)

    const { data: criteria, error: criErr } = await supabase
      .from('evaluation_criteria')
      .select('*')
      .in('category_id', evalCats.map(ec => ec.id))

    if (!criErr && criteria?.length) {
      await supabase.from('evaluation_criteria').insert(
        criteria.map(c => ({
          ...c,
          id: crypto.randomUUID(),
          tenant_id: tenantId,
          category_id: ecIdMap.get(c.category_id) ?? c.category_id,
          created_at: now,
          updated_at: now,
        }))
      )
      logger.debug(`✅ Copied ${criteria.length} evaluation criteria`)
    }

    const { data: scale, error: scErr } = await supabase.from('evaluation_scale').select('*').is('tenant_id', null)
    if (!scErr && scale?.length) {
      await supabase.from('evaluation_scale').insert(
        scale.map(s => ({ ...s, id: crypto.randomUUID(), tenant_id: tenantId, created_at: now, updated_at: now }))
      )
      logger.debug(`✅ Copied ${scale.length} evaluation scale entries`)
    }
  } catch (err) { logger.warn('⚠️ Evaluation defaults copy failed:', err) }
}
