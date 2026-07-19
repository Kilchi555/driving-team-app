// server/api/admin/dunning-settings.get.ts
// Lädt die Mahnwesen-Einstellungen (Fristen, Gebühren, Verzugszins) des Tenants.
// Fällt auf die Plattform-Standardwerte zurück, solange der Tenant noch keine
// eigenen Einstellungen gespeichert hat.

import { defineEventHandler, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { DUNNING_SETTINGS_DEFAULTS } from '~/server/utils/invoice-dunning'

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const supabase = getSupabaseAdmin()

  const { data: tenantRow, error } = await supabase
    .from('dunning_settings')
    .select('*')
    .eq('tenant_id', profile.tenant_id)
    .maybeSingle()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  if (tenantRow) {
    return { ...tenantRow, is_default: false }
  }

  const { data: platformRow } = await supabase
    .from('dunning_settings')
    .select('*')
    .is('tenant_id', null)
    .maybeSingle()

  return {
    ...DUNNING_SETTINGS_DEFAULTS,
    ...(platformRow || {}),
    id: null,
    tenant_id: profile.tenant_id,
    is_default: true,
  }
})
