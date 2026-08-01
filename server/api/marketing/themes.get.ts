/**
 * GET /api/marketing/themes?tenantId=
 * Returns theme presets filtered for this tenant + dynamic suggestions
 * from course_categories / license categories (VKU, Motorrad, Kat. B, …).
 */
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { isFeatureEnabled } from '~/server/utils/require-feature'
import {
  OFFER_PLACEHOLDERS,
  buildThemeSuggestions,
  filterThemesForTenant,
  type ThemeFeature,
  type TenantThemeContext,
} from '~/server/utils/marketing-theme-presets'

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const query = getQuery(event)
  const tenantId = (query.tenantId as string) || authUser.tenant_id
  if (!tenantId) {
    throw createError({ statusCode: 400, statusMessage: 'tenantId required' })
  }
  if (authUser.role !== 'super_admin' && tenantId !== authUser.tenant_id) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const supabase = getSupabaseAdmin()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, business_type, slug')
    .eq('id', tenantId)
    .single()

  const businessType = tenant?.business_type || 'driving_school'

  const featureKeys: ThemeFeature[] = ['courses_enabled', 'affiliate_enabled', 'discounts_enabled']
  const featureEntries = await Promise.all(
    featureKeys.map(async (key) => [key, await isFeatureEnabled(tenantId, key)] as const),
  )
  const features = Object.fromEntries(featureEntries) as TenantThemeContext['features']

  // For non-driving schools, skip Fahrschule catalogs
  let courseCategories: { code: string; name: string }[] = []
  let licenseCategories: { code: string; name: string }[] = []

  if (businessType === 'driving_school') {
    const [ccRes, catRes] = await Promise.all([
      features.courses_enabled
        ? supabase
            .from('course_categories')
            .select('code, name')
            .eq('tenant_id', tenantId)
            .eq('is_active', true)
            .order('code')
        : Promise.resolve({ data: [] as any[] }),
      supabase
        .from('categories')
        .select('code, name, parent_category_id')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('code'),
    ])

    courseCategories = (ccRes.data || []).map((r: any) => ({
      code: r.code,
      name: r.name || r.code,
    }))

    // Prefer top-level license categories; if none, use all active
    const allCats = catRes.data || []
    const parents = allCats.filter((c: any) => !c.parent_category_id)
    licenseCategories = (parents.length ? parents : allCats).map((r: any) => ({
      code: r.code,
      name: r.name || r.code,
    }))
  }

  const ctx: TenantThemeContext = {
    businessType,
    features,
    courseCategories,
    licenseCategories,
  }

  const themes = filterThemesForTenant(ctx).map(t => ({
    key: t.key,
    title: t.title,
    description: t.description,
    creatives: t.creatives.map(c => ({
      id: c.id,
      label: c.label,
      subject: c.subject,
      html_body: c.html_body,
    })),
  }))

  const suggestions = buildThemeSuggestions(ctx)

  return {
    themes,
    suggestions,
    context: {
      businessType,
      features,
      courseCategories,
      licenseCategories,
      slug: tenant?.slug || null,
    },
    placeholders: OFFER_PLACEHOLDERS,
  }
})
