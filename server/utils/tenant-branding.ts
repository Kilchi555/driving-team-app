// server/utils/tenant-branding.ts
// Helper to load tenant branding data for emails and PDFs

import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import type { VoucherBranding } from '~/utils/voucherGenerator'

export async function getTenantBranding(tenantId: string): Promise<VoucherBranding> {
  try {
    const supabase = getSupabaseAdmin()
    const { data } = await supabase
      .from('tenants')
      .select('name, brand_name, primary_color, logo_url, logo_wide_url')
      .eq('id', tenantId)
      .single()

    if (!data) return {}

    return {
      tenantName: data.brand_name || data.name || undefined,
      primaryColor: data.primary_color || undefined,
      logoUrl: data.logo_wide_url || data.logo_url || undefined
    }
  } catch {
    return {}
  }
}
