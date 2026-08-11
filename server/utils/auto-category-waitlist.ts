/**
 * Auto waitlist placeholders for course categories with waitlist_enabled=true.
 *
 * When a category has no future bookable courses for a known city, keep one
 * public course in status=waitlist so the customer app (and location deep-links)
 * still show a signup path. When dates appear again, demote those placeholders
 * back to draft. Only courses with is_auto_waitlist=true are demoted.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { logger } from '~/utils/logger'

export type AutoWaitlistAction = {
  action: 'activated' | 'created' | 'demoted' | 'skipped'
  tenantId: string
  categoryCode: string
  city: string | null
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
  course_category_id: string | null
  category: string | null
  course_sessions: { start_time: string }[] | null
}

function normalizeCity(city: string | null | undefined): string | null {
  const trimmed = (city || '').trim()
  return trimmed || null
}

function cityKey(city: string | null): string {
  return (city || '').trim().toLowerCase()
}

function hasFutureSession(course: CourseRow, nowIso: string): boolean {
  const sessions = course.course_sessions || []
  return sessions.some((s) => s?.start_time && s.start_time > nowIso)
}

function isBookable(course: CourseRow, nowIso: string): boolean {
  if (!course.is_public) return false
  if (!['active', 'scheduled'].includes(course.status || '')) return false
  return hasFutureSession(course, nowIso)
}

function placeholderName(category: CategoryRow, city: string | null): string {
  return city ? `${category.name} ${city}` : category.name
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
      id, tenant_id, name, status, city, is_public, is_auto_waitlist,
      course_category_id, category,
      course_sessions ( start_time )
    `)
    .eq('tenant_id', category.tenant_id)
    .or(`course_category_id.eq.${category.id},category.eq.${category.code}`)

  if (error) throw error
  return (data || []) as CourseRow[]
}

async function activatePlaceholder(
  supabase: SupabaseClient,
  courseId: string,
  category: CategoryRow,
  city: string | null,
  existingName?: string | null,
): Promise<void> {
  const { error } = await supabase
    .from('courses')
    .update({
      status: 'waitlist',
      is_public: true,
      is_auto_waitlist: true,
      city,
      course_category_id: category.id,
      category: category.code,
      // Keep a human name if one already exists (e.g. "VKU Zürich")
      name: (existingName || '').trim() || placeholderName(category, city),
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
  city: string | null,
): Promise<string> {
  const { data, error } = await supabase
    .from('courses')
    .insert({
      tenant_id: category.tenant_id,
      name: placeholderName(category, city),
      description: 'Datum folgt — Warteliste offen',
      category: category.code,
      course_category_id: category.id,
      city,
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

function collectCityKeys(courses: CourseRow[]): Map<string, string | null> {
  /** key → display city (null for tenant-wide) */
  const cities = new Map<string, string | null>()
  for (const course of courses) {
    // Keep historical locations (incl. completed) so waitlist can reappear after the last date ends.
    // Skip cancelled — those locations were intentionally retired.
    if (course.status === 'cancelled') continue
    const city = normalizeCity(course.city)
    cities.set(cityKey(city), city)
  }
  return cities
}

async function syncOneCategory(
  supabase: SupabaseClient,
  category: CategoryRow,
  nowIso: string,
  actions: AutoWaitlistAction[],
): Promise<void> {
  const courses = await loadCategoryCourses(supabase, category)
  const cities = collectCityKeys(courses)

  // Category with waitlist but no location history yet → one tenant-wide placeholder
  if (cities.size === 0 && category.waitlist_enabled) {
    cities.set('', null)
  }

  // When waitlist is off: demote all auto placeholders and stop
  if (!category.waitlist_enabled) {
    for (const course of courses) {
      if (!course.is_auto_waitlist) continue
      if (course.status === 'waitlist') {
        await demotePlaceholder(supabase, course.id)
        actions.push({
          action: 'demoted',
          tenantId: category.tenant_id,
          categoryCode: category.code,
          city: normalizeCity(course.city),
          courseId: course.id,
          detail: 'waitlist_enabled=false',
        })
      }
    }
    return
  }

  for (const [key, city] of Array.from(cities.entries())) {
    const inCity = courses.filter((c) => cityKey(normalizeCity(c.city)) === key)
    const hasBookable = inCity.some((c) => isBookable(c, nowIso))

    const autoPlaceholders = inCity.filter(
      (c) =>
        c.is_auto_waitlist ||
        // Adopt existing empty waitlist/draft placeholders once (e.g. VKU Zürich draft)
        (
          ['waitlist', 'draft'].includes(c.status || '') &&
          !hasFutureSession(c, nowIso) &&
          (c.is_public !== false)
        ),
    )

    if (hasBookable) {
      for (const course of inCity) {
        if (!course.is_auto_waitlist || course.status !== 'waitlist') continue
        await demotePlaceholder(supabase, course.id)
        actions.push({
          action: 'demoted',
          tenantId: category.tenant_id,
          categoryCode: category.code,
          city,
          courseId: course.id,
          detail: 'bookable dates exist',
        })
      }
      continue
    }

    // No bookable dates → ensure one public waitlist placeholder
    const activeAuto = autoPlaceholders.find((c) => c.status === 'waitlist' && c.is_public !== false)
    if (activeAuto) {
      if (!activeAuto.is_auto_waitlist) {
        await activatePlaceholder(supabase, activeAuto.id, category, city, activeAuto.name)
        actions.push({
          action: 'activated',
          tenantId: category.tenant_id,
          categoryCode: category.code,
          city,
          courseId: activeAuto.id,
          detail: 'marked existing waitlist as auto',
        })
      } else {
        actions.push({
          action: 'skipped',
          tenantId: category.tenant_id,
          categoryCode: category.code,
          city,
          courseId: activeAuto.id,
          detail: 'already waitlist',
        })
      }
      continue
    }

    const draftCandidate =
      autoPlaceholders.find((c) => c.is_auto_waitlist && c.status === 'draft') ||
      autoPlaceholders.find((c) => c.status === 'draft' && !hasFutureSession(c, nowIso))

    if (draftCandidate) {
      await activatePlaceholder(supabase, draftCandidate.id, category, city, draftCandidate.name)
      actions.push({
        action: 'activated',
        tenantId: category.tenant_id,
        categoryCode: category.code,
        city,
        courseId: draftCandidate.id,
      })
      continue
    }

    const createdId = await createPlaceholder(supabase, category, city)
    actions.push({
      action: 'created',
      tenantId: category.tenant_id,
      categoryCode: category.code,
      city,
      courseId: createdId,
    })
  }
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
        city: null,
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
