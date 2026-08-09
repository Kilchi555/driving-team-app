/**
 * Load tenant fields needed for reglement placeholder replacement (server-side).
 * Mirrors utils/reglementPlaceholders.loadTenantData but uses the admin client.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type { TenantData } from '~/utils/reglementPlaceholders'
import { replacePlaceholders } from '~/utils/reglementPlaceholders'

export async function loadReglementTenantData(
  supabase: SupabaseClient,
  tenantId: string,
): Promise<TenantData> {
  const { data: tenant } = await supabase
    .from('tenants')
    .select('name, address, contact_email, contact_phone, website_url')
    .eq('id', tenantId)
    .maybeSingle()

  let cancellationHoursBefore = 24

  try {
    let policyId: string | null = null

    const { data: tenantPolicy } = await supabase
      .from('cancellation_policies')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('is_default', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (tenantPolicy?.id) {
      policyId = tenantPolicy.id
    } else {
      const { data: globalPolicy } = await supabase
        .from('cancellation_policies')
        .select('id')
        .is('tenant_id', null)
        .eq('is_active', true)
        .order('is_default', { ascending: false })
        .limit(1)
        .maybeSingle()
      policyId = globalPolicy?.id ?? null
    }

    if (policyId) {
      const { data: rules } = await supabase
        .from('cancellation_rules')
        .select('charge_percentage, hours_before_appointment')
        .eq('policy_id', policyId)

      if (rules?.length) {
        const freeRule = rules.find((r: any) => Number(r.charge_percentage) === 0)
        if (freeRule) {
          cancellationHoursBefore = Number(freeRule.hours_before_appointment) || 24
        } else {
          cancellationHoursBefore = Math.max(
            ...rules.map((r: any) => Number(r.hours_before_appointment) || 0),
            24,
          )
        }
      }
    }
  } catch {
    // keep default 24
  }

  let city = ''
  let zip = ''
  const country = 'Schweiz'
  if (tenant?.address) {
    const addressParts = String(tenant.address).split(',')
    if (addressParts.length > 1) {
      const zipCityPart = addressParts[addressParts.length - 1].trim()
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
    city,
    zip,
    country,
    cancellationHoursBefore,
  }
}

export function resolveReglementContent(content: string, tenantData: TenantData): string {
  return replacePlaceholders(content || '', tenantData)
}
