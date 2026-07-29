// server/api/tenants/business-types.get.ts
// Public endpoint: returns the active business types for the registration
// dropdown (tenant-register.vue). This is the same allowlist used server-side
// by resolveBusinessType() in server/utils/business-type-presets.ts, so the
// dropdown and the actual validation can never drift apart again.
//
// Also returns each type's `ui_labels` (business_type_presets) so the
// (anonymous, not-yet-a-tenant) registration flow can source its wording —
// "Fahrlehrer" vs. "Berater" vs. "Coach", etc. — from the DB instead of only
// the hardcoded TS fallback in composables/useTerminology.ts. Only the
// non-sensitive `ui_labels` column is exposed here; `feature_flags` and
// `defaults` stay behind the super-admin-only
// /api/tenant-admin/business-type-presets endpoint.

import { getSupabaseAdmin } from '~/utils/supabase'

export default defineEventHandler(async () => {
  const supabase = getSupabaseAdmin()

  const [{ data: types, error: typesError }, { data: presets, error: presetsError }] = await Promise.all([
    supabase
      .from('business_types')
      .select('code, name, description')
      .eq('is_active', true)
      .order('name', { ascending: true }),
    supabase
      .from('business_type_presets')
      .select('business_type_code, ui_labels'),
  ])

  if (typesError) {
    throw createError({ statusCode: 500, statusMessage: `Fehler beim Laden der Business-Types: ${typesError.message}` })
  }
  if (presetsError) {
    throw createError({ statusCode: 500, statusMessage: `Fehler beim Laden der UI-Labels: ${presetsError.message}` })
  }

  const uiLabelsByCode = new Map((presets || []).map((p: any) => [p.business_type_code, p.ui_labels || {}]))
  const businessTypes = (types || []).map(t => ({ ...t, ui_labels: uiLabelsByCode.get(t.code) || {} }))

  return { businessTypes }
})
