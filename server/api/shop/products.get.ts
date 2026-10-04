// server/api/shop/products.get.ts
// Public shop catalog. Tenant, is_active, and show_in_shop are enforced here.
// The anon table policy does not expose other tenants or non-shop products.
// Credit amounts are not selected.

import { defineEventHandler, getQuery, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const { tenant, tenantId } = getQuery(event) as { tenant?: string; tenantId?: string }

  if (!tenant && !tenantId) {
    throw createError({ statusCode: 400, message: 'tenant oder tenantId Parameter erforderlich' })
  }

  const supabase = getSupabaseAdmin()

  let resolvedTenantId = tenantId as string | undefined

  // Resolve slug → ID via tenants table (anon_read_tenants policy allows this)
  if (!resolvedTenantId && tenant) {
    const { data: tenantRow } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', tenant)
      .eq('is_active', true)
      .single()

    if (!tenantRow) {
      throw createError({ statusCode: 404, message: 'Tenant nicht gefunden' })
    }
    resolvedTenantId = tenantRow.id
  }

  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, description, price_rappen, category, display_order, is_voucher, allow_custom_amount, min_amount_rappen, max_amount_rappen')
    .eq('tenant_id', resolvedTenantId!)
    .eq('is_active', true)
    .eq('show_in_shop', true)
    .order('display_order')

  if (error) {
    throw createError({ statusCode: 500, message: 'Fehler beim Laden der Produkte' })
  }

  return { products: products || [], tenantId: resolvedTenantId }
})
