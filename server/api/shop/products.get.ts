// server/api/shop/products.get.ts
// Public shop catalog. Tenant, is_active, and show_in_shop are enforced here.
// The anon table policy does not expose other tenants or non-shop products.
// Credit amounts are not selected.
// voucher_creation is resolved server-side (guests cannot read tenant_settings via RLS).

import { defineEventHandler, getQuery, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import {
  parseFeatureEnabled,
  splitShopCatalog,
} from '~/server/utils/shop-voucher-feature'

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

  const [{ data: products, error }, { data: voucherSetting }] = await Promise.all([
    supabase
      .from('products')
      .select('id, name, description, price_rappen, category, display_order, is_voucher, allow_custom_amount, min_amount_rappen, max_amount_rappen')
      .eq('tenant_id', resolvedTenantId!)
      .eq('is_active', true)
      .eq('show_in_shop', true)
      .order('display_order'),
    supabase
      .from('tenant_settings')
      .select('setting_value')
      .eq('tenant_id', resolvedTenantId!)
      .eq('category', 'features')
      .eq('setting_key', 'voucher_creation')
      .maybeSingle(),
  ])

  if (error) {
    throw createError({ statusCode: 500, message: 'Fehler beim Laden der Produkte' })
  }

  const featureEnabled = parseFeatureEnabled(voucherSetting?.setting_value)
  const { catalog, customVoucherProduct } = splitShopCatalog(products || [])
  // Only expose the create-UI when both the feature flag and a custom-amount voucher product exist
  const voucherCreationEnabled = featureEnabled && !!customVoucherProduct

  return {
    products: catalog,
    tenantId: resolvedTenantId,
    voucherCreationEnabled,
    customVoucherProduct,
  }
})
