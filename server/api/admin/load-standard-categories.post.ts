import { defineEventHandler, readBody, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

// Copies selected standard categories (and their pricing rules) to the tenant.
// Body: { selectedIds: string[] }  — IDs from the standard categories (tenant_id IS NULL)
export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const supabase = getSupabaseAdmin()

  const body = await readBody(event)
  const { selectedIds } = body as { selectedIds: string[] }

  if (!Array.isArray(selectedIds) || selectedIds.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'selectedIds must be a non-empty array' })
  }

  // Get selected standard templates
  const { data: standardTemplates, error: fetchError } = await supabase
    .from('categories')
    .select('*')
    .is('tenant_id', null)
    .in('id', selectedIds)

  if (fetchError) throw createError({ statusCode: 500, statusMessage: fetchError.message })

  // Get existing tenant category codes to avoid duplicates
  const { data: existingData } = await supabase
    .from('categories')
    .select('code')
    .eq('tenant_id', profile.tenant_id)

  const existingCodes = (existingData ?? []).map((c: any) => c.code)
  const templatesToCopy = (standardTemplates ?? []).filter(
    (t: any) => !existingCodes.includes(t.code)
  )

  if (templatesToCopy.length === 0) {
    return { success: true, count: 0, message: 'Alle ausgewählten Kategorien existieren bereits' }
  }

  // Insert categories
  const { error: insertError } = await supabase
    .from('categories')
    .insert(
      templatesToCopy.map((t: any) => ({
        code: t.code,
        name: t.name,
        description: t.description,
        color: t.color,
        lesson_duration_minutes: t.lesson_duration_minutes,
        exam_duration_minutes: t.exam_duration_minutes,
        tenant_id: profile.tenant_id
      }))
    )

  if (insertError) throw createError({ statusCode: 500, statusMessage: insertError.message })

  // Copy standard pricing rules for each template
  for (const template of templatesToCopy) {
    const { data: standardRules } = await supabase
      .from('pricing_rules')
      .select('*')
      .eq('category_code', template.code)
      .is('tenant_id', null)
      .eq('is_active', true)

    if (standardRules && standardRules.length > 0) {
      const copiedRules = standardRules.map((rule: any) => {
        const { id, created_at, updated_at, ...rest } = rule
        return { ...rest, tenant_id: profile.tenant_id }
      })

      const { error: priceInsertError } = await supabase
        .from('pricing_rules')
        .insert(copiedRules)

      if (priceInsertError) {
        console.error(`Failed to copy pricing rules for ${template.code}:`, priceInsertError.message)
      }
    }
  }

  return {
    success: true,
    count: templatesToCopy.length,
    message: `${templatesToCopy.length} neue Standard-Templates erfolgreich geladen`
  }
})
