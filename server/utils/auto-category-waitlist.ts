/**
 * Auto waitlist placeholders for course categories with waitlist_enabled=true.
 *
 * Every active category with waitlist_enabled=true always has exactly one
 * public, tenant-wide placeholder course in status=waitlist, regardless of
 * whether the category currently has bookable or fully-booked courses. This
 * gives customers a permanent, dedicated "Warteliste" card per Kursart on the
 * customer app / website. Only courses with is_auto_waitlist=true are ever
 * demoted/merged automatically; manually created courses are left alone.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { logger } from '~/utils/logger'

export type AutoWaitlistAction = {
  action: 'activated' | 'created' | 'demoted' | 'merged' | 'skipped'
  tenantId: string
  categoryCode: string
  courseId?: string
  detail?: string
}

type CategoryRow = {
  id: string
  tenant_id: string
  code: string
  name: string
  waitlist_enabled: boolean | null
  is_active: boolean | null
  default_max_participants: number | null
  default_price_rappen: number | null
  default_requires_room: boolean | null
  default_requires_vehicle: boolean | null
  default_room_id: string | null
  default_vehicle_id: string | null
}

type CourseRow = {
  id: string
  tenant_id: string
  name: string
  status: string | null
  city: string | null
  is_public: boolean | null
  is_auto_waitlist: boolean | null
  created_at?: string | null
  course_category_id: string | null
  category: string | null
  course_sessions: { start_time: string }[] | null
}

function hasFutureSession(course: CourseRow, nowIso: string): boolean {
  const sessions = course.course_sessions || []
  return sessions.some((s) => s?.start_time && s.start_time > nowIso)
}

async function loadCategories(
  supabase: SupabaseClient,
  tenantId?: string,
): Promise<CategoryRow[]> {
  let query = supabase
    .from('course_categories')
    .select(`
      id, tenant_id, code, name, waitlist_enabled, is_active,
      default_max_participants, default_price_rappen,
      default_requires_room, default_requires_vehicle,
      default_room_id, default_vehicle_id
    `)
    .eq('is_active', true)

  if (tenantId) query = query.eq('tenant_id', tenantId)

  const { data, error } = await query
  if (error) throw error
  return (data || []) as CategoryRow[]
}

async function loadCategoryCourses(
  supabase: SupabaseClient,
  category: CategoryRow,
): Promise<CourseRow[]> {
  const { data, error } = await supabase
    .from('courses')
    .select(`
      id, tenant_id, name, status, city, is_public, is_auto_waitlist, created_at,
      course_category_id, category,
      course_sessions ( start_time )
    `)
    .eq('tenant_id', category.tenant_id)
    .or(`course_category_id.eq.${category.id},category.eq.${category.code}`)

  if (error) throw error
  return (data || []) as CourseRow[]
}

/** Picks the placeholder with the most existing waitlist signups (so real signups are never orphaned). */
async function pickCanonical(
  supabase: SupabaseClient,
  candidates: CourseRow[],
): Promise<CourseRow> {
  if (candidates.length === 1) return candidates[0]

  let best = candidates[0]
  let bestScore = -1
  for (const candidate of candidates) {
    const { count } = await supabase
      .from('course_waitlist')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', candidate.id)
    const score = count || 0
    if (score > bestScore) {
      bestScore = score
      best = candidate
    }
  }
  return best
}

async function activatePlaceholder(
  supabase: SupabaseClient,
  courseId: string,
  category: CategoryRow,
): Promise<void> {
  const { error } = await supabase
    .from('courses')
    .update({
      status: 'waitlist',
      is_public: true,
      is_auto_waitlist: true,
      city: null,
      course_category_id: category.id,
      category: category.code,
      name: category.name,
      description: 'Datum folgt — Warteliste offen',
      status_changed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      cancelled_at: null,
      cancelled_by: null,
    })
    .eq('id', courseId)

  if (error) throw error
}

async function demotePlaceholder(
  supabase: SupabaseClient,
  courseId: string,
): Promise<void> {
  const { error } = await supabase
    .from('courses')
    .update({
      status: 'draft',
      status_changed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', courseId)
    .eq('is_auto_waitlist', true)

  if (error) throw error
}

async function createPlaceholder(
  supabase: SupabaseClient,
  category: CategoryRow,
): Promise<string> {
  const { data, error } = await supabase
    .from('courses')
    .insert({
      tenant_id: category.tenant_id,
      name: category.name,
      description: 'Datum folgt — Warteliste offen',
      category: category.code,
      course_category_id: category.id,
      city: null,
      status: 'waitlist',
      is_public: true,
      is_auto_waitlist: true,
      is_active: true,
      max_participants: category.default_max_participants || 20,
      price_per_participant_rappen: category.default_price_rappen || 0,
      requires_room: category.default_requires_room ?? true,
      requires_vehicle: category.default_requires_vehicle ?? false,
      room_id: category.default_room_id,
      vehicle_id: category.default_vehicle_id,
      status_changed_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error) throw error
  return data.id as string
}

async function syncOneCategory(
  supabase: SupabaseClient,
  category: CategoryRow,
  nowIso: string,
  actions: AutoWaitlistAction[],
): Promise<void> {
  const courses = await loadCategoryCourses(supabase, category)
  const autoPlaceholders = courses.filter((c) => c.is_auto_waitlist)

  // Waitlist off for this category: demote every auto placeholder and stop.
  if (!category.waitlist_enabled) {
    for (const course of autoPlaceholders) {
      if (course.status !== 'waitlist') continue
      await demotePlaceholder(supabase, course.id)
      actions.push({
        action: 'demoted',
        tenantId: category.tenant_id,
        categoryCode: category.code,
        courseId: course.id,
        detail: 'waitlist_enabled=false',
      })
    }
    return
  }

  // Waitlist on: exactly one active, tenant-wide placeholder must always exist,
  // independent of whether other courses in this category are bookable or full.
  const activeOnes = autoPlaceholders.filter((c) => c.status === 'waitlist' && c.is_public !== false)

  if (activeOnes.length > 0) {
    const canonical = await pickCanonical(supabase, activeOnes)

    for (const extra of activeOnes) {
      if (extra.id === canonical.id) continue
      await demotePlaceholder(supabase, extra.id)
      actions.push({
        action: 'merged',
        tenantId: category.tenant_id,
        categoryCode: category.code,
        courseId: extra.id,
        detail: `merged into ${canonical.id}`,
      })
    }

    // Normalise shape (drop any legacy per-city name/city) so exactly one
    // generic "Kursart"-wide waitlist card is shown.
    const needsNormalisation = canonical.city !== null || canonical.name !== category.name
    if (needsNormalisation) {
      await activatePlaceholder(supabase, canonical.id, category)
      actions.push({
        action: 'activated',
        tenantId: category.tenant_id,
        categoryCode: category.code,
        courseId: canonical.id,
        detail: 'normalised to tenant-wide placeholder',
      })
    } else {
      actions.push({
        action: 'skipped',
        tenantId: category.tenant_id,
        categoryCode: category.code,
        courseId: canonical.id,
        detail: 'already active',
      })
    }
    return
  }

  // No active placeholder yet: reactivate a demoted auto placeholder, adopt an
  // eligible existing draft/waitlist course, or create a brand new one.
  const draftCandidate =
    autoPlaceholders.find((c) => c.status === 'draft') ||
    courses.find(
      (c) =>
        ['waitlist', 'draft'].includes(c.status || '') &&
        !hasFutureSession(c, nowIso) &&
        c.is_public !== false,
    )

  if (draftCandidate) {
    await activatePlaceholder(supabase, draftCandidate.id, category)
    actions.push({
      action: 'activated',
      tenantId: category.tenant_id,
      categoryCode: category.code,
      courseId: draftCandidate.id,
    })
    return
  }

  const createdId = await createPlaceholder(supabase, category)
  actions.push({
    action: 'created',
    tenantId: category.tenant_id,
    categoryCode: category.code,
    courseId: createdId,
  })
}

export async function syncAutoCategoryWaitlists(
  supabase: SupabaseClient,
  options: { tenantId?: string; categoryId?: string } = {},
): Promise<{ actions: AutoWaitlistAction[] }> {
  const actions: AutoWaitlistAction[] = []
  const nowIso = new Date().toISOString()

  let categories = await loadCategories(supabase, options.tenantId)
  if (options.categoryId) {
    categories = categories.filter((c) => c.id === options.categoryId)
    // Also sync when category was just toggled off — include inactive waitlist_enabled=false
    if (categories.length === 0) {
      const { data } = await supabase
        .from('course_categories')
        .select(`
          id, tenant_id, code, name, waitlist_enabled, is_active,
          default_max_participants, default_price_rappen,
          default_requires_room, default_requires_vehicle,
          default_room_id, default_vehicle_id
        `)
        .eq('id', options.categoryId)
        .maybeSingle()
      if (data) categories = [data as CategoryRow]
    }
  }

  for (const category of categories) {
    try {
      await syncOneCategory(supabase, category, nowIso, actions)
    } catch (err: any) {
      logger.warn(
        `⚠️ auto-category-waitlist failed for ${category.code}:`,
        err?.message || err,
      )
      actions.push({
        action: 'skipped',
        tenantId: category.tenant_id,
        categoryCode: category.code,
        detail: err?.message || 'sync error',
      })
    }
  }

  if (actions.some((a) => a.action !== 'skipped')) {
    logger.info(
      `✅ auto-category-waitlist: ${actions.filter((a) => a.action !== 'skipped').length} changes`,
      actions.filter((a) => a.action !== 'skipped'),
    )
  }

  return { actions }
}
