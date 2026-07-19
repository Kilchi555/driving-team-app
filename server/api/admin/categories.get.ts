import { defineEventHandler, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

// Returns { categories, pricingRules, businessType } for the authenticated tenant.
export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const supabase = getSupabaseAdmin()

  // Get tenant business_type
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('business_type')
    .eq('id', profile.tenant_id)
    .single()

  if (tenantError) throw createError({ statusCode: 500, statusMessage: tenantError.message })

  // NOTE: previously gated to business_type === 'driving_school' only, returning
  // empty data otherwise. Categories/pricing_rules are generic per-tenant tables
  // usable by any business type (e.g. mental_coach categories like stress/focus),
  // so we always fetch them now.
  const [categoriesResult, pricingResult] = await Promise.all([
    supabase
      .from('categories')
      .select('*')
      .eq('tenant_id', profile.tenant_id)
      .order('code', { ascending: true }),
    supabase
      .from('pricing_rules')
      .select('*')
      .eq('tenant_id', profile.tenant_id)
      .eq('is_active', true)
  ])

  if (categoriesResult.error) {
    throw createError({ statusCode: 500, statusMessage: categoriesResult.error.message })
  }
  if (pricingResult.error) {
    throw createError({ statusCode: 500, statusMessage: pricingResult.error.message })
  }

  return {
    categories: categoriesResult.data ?? [],
    pricingRules: pricingResult.data ?? [],
    businessType: tenant.business_type
  }
})
