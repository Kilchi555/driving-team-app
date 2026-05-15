import { defineEventHandler, readBody, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

// Creates or updates a category and syncs its pricing rules.
// Body: {
//   id?: number,  // if provided → update; otherwise → create
//   code, name, description?, color, lesson_duration_minutes, exam_duration_minutes,
//   price_per_lesson_chf, admin_fee_chf, admin_fee_applies_from,
//   theory_enabled, theory_price_chf, theory_duration_minutes,
//   consultation_enabled, consultation_price_chf, consultation_duration_minutes
// }
export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const supabase = getSupabaseAdmin()

  const body = await readBody(event)
  const {
    id,
    code, name, description, color,
    lesson_duration_minutes, exam_duration_minutes,
    price_per_lesson_chf, admin_fee_chf, admin_fee_applies_from,
    theory_enabled, theory_price_chf, theory_duration_minutes,
    consultation_enabled, consultation_price_chf, consultation_duration_minutes
  } = body

  if (!code || !name) {
    throw createError({ statusCode: 400, statusMessage: 'code and name are required' })
  }

  const categoryData = {
    code,
    name,
    description: description ?? '',
    color: color ?? '#3B82F6',
    lesson_duration_minutes: lesson_duration_minutes ?? [45],
    exam_duration_minutes: exam_duration_minutes ?? 45
  }

  if (id) {
    // Update — verify ownership
    const { data: existing } = await supabase
      .from('categories')
      .select('tenant_id')
      .eq('id', id)
      .single()

    if (!existing || existing.tenant_id !== profile.tenant_id) {
      throw createError({ statusCode: 403, statusMessage: 'Forbidden – category does not belong to your tenant' })
    }

    const { error } = await supabase
      .from('categories')
      .update(categoryData)
      .eq('id', id)

    if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  } else {
    // Create
    const { error } = await supabase
      .from('categories')
      .insert({ ...categoryData, tenant_id: profile.tenant_id })

    if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  }

  // Sync pricing rules
  await syncPricingRules(supabase, profile.tenant_id, code, {
    price_per_lesson_chf: price_per_lesson_chf ?? 0,
    admin_fee_chf: admin_fee_chf ?? 0,
    admin_fee_applies_from: admin_fee_applies_from ?? 2,
    lesson_duration_minutes: lesson_duration_minutes ?? [45],
    theory_enabled: !!theory_enabled,
    theory_price_chf: theory_price_chf ?? 0,
    theory_duration_minutes: theory_duration_minutes ?? 45,
    consultation_enabled: !!consultation_enabled,
    consultation_price_chf: consultation_price_chf ?? 0,
    consultation_duration_minutes: consultation_duration_minutes ?? 60
  })

  return { success: true }
})

async function syncPricingRules(supabase: any, tenantId: string, categoryCode: string, pricing: {
  price_per_lesson_chf: number
  admin_fee_chf: number
  admin_fee_applies_from: number
  lesson_duration_minutes: number[]
  theory_enabled: boolean
  theory_price_chf: number
  theory_duration_minutes: number
  consultation_enabled: boolean
  consultation_price_chf: number
  consultation_duration_minutes: number
}) {
  // Delete existing rules for this category
  const { error: deleteError } = await supabase
    .from('pricing_rules')
    .delete()
    .eq('category_code', categoryCode)
    .eq('tenant_id', tenantId)

  if (deleteError) throw createError({ statusCode: 500, statusMessage: deleteError.message })

  const today = new Date().toISOString().split('T')[0]
  const baseDurationMinutes = pricing.lesson_duration_minutes[0] ?? 45
  const pricePerMinuteRappen = (pricing.price_per_lesson_chf / 45) * 100
  const adminFeeRappen = Math.round(pricing.admin_fee_chf * 100)

  const rules: any[] = [
    {
      rule_name: `Kategorie ${categoryCode} - Grundpreis`,
      rule_type: 'base_price',
      category_code: categoryCode,
      price_per_minute_rappen: pricePerMinuteRappen,
      base_duration_minutes: 45,
      admin_fee_rappen: 0,
      admin_fee_applies_from: 999,
      valid_from: today,
      valid_until: null,
      is_active: true,
      tenant_id: tenantId
    }
  ]

  const motorcycleCategories = ['A', 'A1', 'A35kW']
  if (!motorcycleCategories.includes(categoryCode) && pricing.admin_fee_chf > 0) {
    rules.push({
      rule_name: `Kategorie ${categoryCode} - Versicherung`,
      rule_type: 'admin_fee',
      category_code: categoryCode,
      price_per_minute_rappen: 0,
      base_duration_minutes: baseDurationMinutes,
      admin_fee_rappen: adminFeeRappen,
      admin_fee_applies_from: pricing.admin_fee_applies_from,
      valid_from: today,
      valid_until: null,
      is_active: true,
      tenant_id: tenantId
    })
  }

  if (pricing.theory_enabled && pricing.theory_price_chf > 0) {
    const theoryPricePerMinuteRappen = (pricing.theory_price_chf / pricing.theory_duration_minutes) * 100
    rules.push({
      rule_name: `Kategorie ${categoryCode} - Theorielektion`,
      rule_type: 'theory',
      category_code: categoryCode,
      price_per_minute_rappen: theoryPricePerMinuteRappen,
      base_duration_minutes: pricing.theory_duration_minutes,
      admin_fee_rappen: 0,
      admin_fee_applies_from: 999,
      valid_from: today,
      valid_until: null,
      is_active: true,
      tenant_id: tenantId
    })
  }

  if (pricing.consultation_enabled && pricing.consultation_price_chf > 0) {
    const consultationPricePerMinuteRappen = (pricing.consultation_price_chf / pricing.consultation_duration_minutes) * 100
    rules.push({
      rule_name: `Kategorie ${categoryCode} - Beratung`,
      rule_type: 'consultation',
      category_code: categoryCode,
      price_per_minute_rappen: consultationPricePerMinuteRappen,
      base_duration_minutes: pricing.consultation_duration_minutes,
      admin_fee_rappen: 0,
      admin_fee_applies_from: 999,
      valid_from: today,
      valid_until: null,
      is_active: true,
      tenant_id: tenantId
    })
  }

  const { error: insertError } = await supabase.from('pricing_rules').insert(rules)
  if (insertError) throw createError({ statusCode: 500, statusMessage: insertError.message })
}
