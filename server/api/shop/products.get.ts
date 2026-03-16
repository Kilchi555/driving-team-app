// server/api/shop/products.get.ts
// Public endpoint — returns active shop products for a given tenant slug or ID
// Uses the anon Supabase client so RLS policies govern access (no service role key)
// Requires DB migration: add_products_public_read_policy.sql

import { defineEventHandler, getQuery, createError } from 'h3'
import { getSupabaseAnon } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const { tenant, tenantId } = getQuery(event) as { tenant?: string; tenantId?: string }

  if (!tenant && !tenantId) {
    throw createError({ statusCode: 400, message: 'tenant oder tenantId Parameter erforderlich' })
  }

  const supabase = getSupabaseAnon()

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

  // RLS policy "products_public_read" filters to is_active = true
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, description, price_rappen, category, display_order, is_voucher, allow_custom_amount, min_amount_rappen, max_amount_rappen')
    .eq('tenant_id', resolvedTenantId!)
    .order('display_order')

  if (error) {
    throw createError({ statusCode: 500, message: 'Fehler beim Laden der Produkte' })
  }

  return { products: products || [], tenantId: resolvedTenantId }
})
