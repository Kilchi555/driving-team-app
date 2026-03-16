// server/api/shop/products.get.ts
// Public endpoint — returns active shop products for a given tenant slug or ID
// No authentication required (shop is public)

import { defineEventHandler, getQuery, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const { tenant, tenantId } = getQuery(event) as { tenant?: string; tenantId?: string }

  if (!tenant && !tenantId) {
    throw createError({ statusCode: 400, message: 'tenant or tenantId query parameter required' })
  }

  const supabase = getSupabaseAdmin()

  let resolvedTenantId = tenantId as string | undefined

  // Resolve slug → ID if only slug provided
  if (!resolvedTenantId && tenant) {
    const { data: tenantRow } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', tenant)
      .single()

    if (!tenantRow) {
      throw createError({ statusCode: 404, message: 'Tenant nicht gefunden' })
    }
    resolvedTenantId = tenantRow.id
  }

  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, description, price_rappen, category, display_order, is_voucher, allow_custom_amount, min_amount_rappen, max_amount_rappen')
    .eq('is_active', true)
    .eq('tenant_id', resolvedTenantId!)
    .order('display_order')

  if (error) {
    throw createError({ statusCode: 500, message: 'Fehler beim Laden der Produkte' })
  }

  return { products: products || [], tenantId: resolvedTenantId }
})
