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

export interface ExtendedTenantBranding {
  tenantName: string
  primaryColor: string
  secondaryColor: string
  accentColor: string
  fontFamily: string
  logoUrl: string | null
  brandTagline: string | null
  contactEmail: string | null
  contactPhone: string | null
  websiteUrl: string | null
}

export async function getTenantBrandingExtended(tenantId: string): Promise<ExtendedTenantBranding> {
  const defaults: ExtendedTenantBranding = {
    tenantName: 'Fahrschule',
    primaryColor: '#1a56db',
    secondaryColor: '#1e3a5f',
    accentColor: '#3b82f6',
    fontFamily: 'Inter, Arial, sans-serif',
    logoUrl: null,
    brandTagline: null,
    contactEmail: null,
    contactPhone: null,
    websiteUrl: null,
  }

  try {
    const supabase = getSupabaseAdmin()
    const { data } = await supabase
      .from('tenants')
      .select(
        'name, brand_name, brand_tagline, primary_color, secondary_color, accent_color, font_family, logo_url, logo_wide_url, contact_email, contact_phone, website_url'
      )
      .eq('id', tenantId)
      .single()

    if (!data) return defaults

    return {
      tenantName: data.brand_name || data.name || defaults.tenantName,
      primaryColor: data.primary_color || defaults.primaryColor,
      secondaryColor: data.secondary_color || defaults.secondaryColor,
      accentColor: data.accent_color || data.primary_color || defaults.accentColor,
      fontFamily: data.font_family || defaults.fontFamily,
      logoUrl: data.logo_wide_url || data.logo_url || null,
      brandTagline: data.brand_tagline || null,
      contactEmail: data.contact_email || null,
      contactPhone: data.contact_phone || null,
      websiteUrl: data.website_url || null,
    }
  } catch {
    return defaults
  }
}
