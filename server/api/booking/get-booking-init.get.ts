// server/api/booking/get-booking-init.get.ts
// Single public endpoint for booking page initialization.
// Returns tenant + categories + locations count in ONE roundtrip,
// eliminating the sequential get-tenant-by-slug → get-availability waterfall.

import { defineEventHandler, getQuery, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const { slug } = getQuery(event)

  if (!slug || typeof slug !== 'string') {
    throw createError({ statusCode: 400, message: 'slug is required' })
  }

  const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_ANON_KEY || ''
  )

  // Resolve slug to tenant
  const { data: tenant, error: tenantErr } = await supabase
    .from('tenants')
    .select('id, name, slug, business_type, primary_color, secondary_color, accent_color, logo_url, logo_square_url, logo_wide_url')
    .eq('slug', slug)
    .single()

  if (tenantErr || !tenant) {
    throw createError({ statusCode: 404, message: `Tenant not found: ${slug}` })
  }

  let categories: any[] = []
  let locationsCount = 0

  if (tenant.business_type === 'driving_school') {
    // Load categories + locations in parallel (no extra roundtrip)
    const [categoriesResult, locationsResult] = await Promise.all([
      supabase
        .from('categories')
        .select('id, code, name, description, lesson_duration_minutes, tenant_id, parent_category_id, color, icon_svg')
        .eq('tenant_id', tenant.id)
        .eq('is_active', true)
        .order('parent_category_id', { ascending: true })
        .order('name', { ascending: true }),
      supabase
        .from('locations')
        .select('id')
        .eq('tenant_id', tenant.id)
        .eq('is_active', true),
    ])

    if (categoriesResult.error) throw categoriesResult.error
    if (locationsResult.error) throw locationsResult.error

    const allCategories = categoriesResult.data || []
    const mainCategories = allCategories.filter((c: any) => !c.parent_category_id)
    const subCategories = allCategories.filter((c: any) => !!c.parent_category_id)

    categories = mainCategories.map((main: any) => ({
      ...main,
      children: subCategories.filter((sub: any) => sub.parent_category_id === main.id),
    }))

    locationsCount = locationsResult.data?.length ?? 0
  }

  return {
    success: true,
    data: { tenant, categories, locationsCount },
  }
})
