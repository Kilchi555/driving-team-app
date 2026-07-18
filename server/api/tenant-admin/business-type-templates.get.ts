// GET /api/tenant-admin/business-type-templates?business_type=mental_coach
// Returns the template rows (tenant_id IS NULL) that new tenants of this
// business type receive at registration — categories and event types.
// Super-admin only.

import { requireSuperAdmin } from '~/server/utils/require-super-admin'
import { getSupabaseAdmin } from '~/utils/supabase'

export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)

  const query = getQuery(event)
  const businessType = String(query.business_type || '')
  if (!businessType) {
    throw createError({ statusCode: 400, statusMessage: 'business_type is required' })
  }

  const supabase = getSupabaseAdmin()

  const [{ data: categories, error: catErr }, { data: eventTypes, error: etErr }] = await Promise.all([
    supabase
      .from('categories')
      .select('id, code, name, description, color, is_active, parent_category_id, exam_duration_minutes, lesson_duration_minutes')
      .is('tenant_id', null)
      .eq('business_type', businessType)
      .order('code', { ascending: true }),
    supabase
      .from('event_types')
      .select('id, code, name, emoji, description, default_duration_minutes, default_color, is_active, require_payment, public_bookable, display_order')
      .is('tenant_id', null)
      .eq('business_type', businessType)
      .order('display_order', { ascending: true }),
  ])

  if (catErr || etErr) {
    throw createError({ statusCode: 500, statusMessage: `Fehler beim Laden der Templates: ${catErr?.message || etErr?.message}` })
  }

  return { categories: categories || [], eventTypes: eventTypes || [] }
})
