// utils/reglementPlaceholders.ts
// Utility functions for replacing placeholders in reglement content with tenant data

import { getSupabase } from '~/utils/supabase'

export interface TenantData {
  name?: string
  address?: string
  email?: string
  phone?: string
  website?: string
  city?: string
  zip?: string
  country?: string
  cancellationHoursBefore?: number
}

/**
 * Load tenant data for placeholder replacement
 */
export async function loadTenantData(tenantId: string): Promise<TenantData> {
  const supabase = getSupabase()
  
  try {
    // Load tenant data
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('name, address, contact_email, contact_phone, website_url')
      .eq('id', tenantId)
      .single()

    if (tenantError) {
      console.warn('⚠️ Could not load tenant data:', tenantError)
      return {}
    }

    // Load cancellation policy
    let cancellationHoursBefore = 24 // Default fallback
    try {
      const { data: cancellationPolicy } = await supabase
        .from('cancellation_policies')
        .select(`
          *,
          rules:cancellation_rules(*)
        `)
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('is_default', { ascending: false })
        .limit(1)
        .single()

      if (cancellationPolicy?.rules && Array.isArray(cancellationPolicy.rules)) {
        // Find the threshold for free cancellation
        const freeRule = cancellationPolicy.rules.find((rule: any) => rule.charge_percentage === 0)
        if (freeRule) {
          cancellationHoursBefore = freeRule.hours_before_appointment
        } else if (cancellationPolicy.rules.length > 0) {
          cancellationHoursBefore = Math.max(...cancellationPolicy.rules.map((r: any) => r.hours_before_appointment))
        }
      }
    } catch (err) {
      console.warn('⚠️ Could not load cancellation policy, using default 24 hours:', err)
    }

    // Try to parse city, zip, country from address if possible
    let city = ''
    let zip = ''
    let country = 'Schweiz' // Default to Schweiz
    
    if (tenant?.address) {
      // Try to parse address format like "Musterweg 1, 8000 Zürich"
      const addressParts = tenant.address.split(',')
      if (addressParts.length > 1) {
        const zipCityPart = addressParts[addressParts.length - 1].trim()
        // Try to match "8000 Zürich" pattern
        const zipCityMatch = zipCityPart.match(/^(\d{4})\s+(.+)$/)
        if (zipCityMatch) {
          zip = zipCityMatch[1]
          city = zipCityMatch[2]
        } else {
          city = zipCityPart
        }
      }
    }

    return {
      name: tenant?.name || '',
      address: tenant?.address || '',
      email: tenant?.contact_email || '',
      phone: tenant?.contact_phone || '',
      website: tenant?.website_url || '',
      city: city,
      zip: zip,
      country: country,
      cancellationHoursBefore: cancellationHoursBefore
    }
  } catch (err) {
    console.error('❌ Error loading tenant data:', err)
    return {}
  }
}

/**
 * Replace placeholders in content with tenant data
 */
export function replacePlaceholders(content: string, tenantData: TenantData): string {
  if (!content) return ''
  
  let result = content
  
  // Replace placeholders
  result = result.replace(/\{\{tenant_name\}\}/g, tenantData.name || '{{tenant_name}}')
  result = result.replace(/\{\{tenant_address\}\}/g, tenantData.address || '{{tenant_address}}')
  result = result.replace(/\{\{tenant_email\}\}/g, tenantData.email || '{{tenant_email}}')
  result = result.replace(/\{\{tenant_phone\}\}/g, tenantData.phone || '{{tenant_phone}}')
  result = result.replace(/\{\{tenant_website\}\}/g, tenantData.website || '{{tenant_website}}')
  result = result.replace(/\{\{tenant_city\}\}/g, tenantData.city || '{{tenant_city}}')
  result = result.replace(/\{\{tenant_zip\}\}/g, tenantData.zip || '{{tenant_zip}}')
  result = result.replace(/\{\{tenant_country\}\}/g, tenantData.country || '{{tenant_country}}')
  result = result.replace(/\{\{cancellation_hours_before\}\}/g, String(tenantData.cancellationHoursBefore || 24))
  
  // Full address format
  const fullAddress = [
    tenantData.address,
    tenantData.zip && tenantData.city ? `${tenantData.zip} ${tenantData.city}` : tenantData.city,
    tenantData.country
  ].filter(Boolean).join(', ')
  
  result = result.replace(/\{\{tenant_full_address\}\}/g, fullAddress || '{{tenant_full_address}}')
  
  return result
}

/**
 * Get list of available placeholders for help text
 */
export function getAvailablePlaceholders(): Array<{ placeholder: string; description: string }> {
  return [
    { placeholder: '{{tenant_name}}', description: 'Name der Fahrschule' },
    { placeholder: '{{tenant_address}}', description: 'Adresse der Fahrschule' },
    { placeholder: '{{tenant_email}}', description: 'E-Mail-Adresse' },
    { placeholder: '{{tenant_phone}}', description: 'Telefonnummer' },
    { placeholder: '{{tenant_website}}', description: 'Website-URL' },
    { placeholder: '{{tenant_city}}', description: 'Stadt' },
    { placeholder: '{{tenant_zip}}', description: 'PLZ' },
    { placeholder: '{{tenant_country}}', description: 'Land' },
    { placeholder: '{{tenant_full_address}}', description: 'Vollständige Adresse' },
    { placeholder: '{{cancellation_hours_before}}', description: 'Stunden vor Termin für kostenlose Stornierung (z.B. 24)' }
  ]
}

