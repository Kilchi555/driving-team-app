// server/api/admin/dunning-templates.get.ts
// Liefert die drei Mahnstufen-Vorlagen für den Tenant. Für Stufen, die der
// Tenant noch nicht selbst angepasst hat, wird die Plattform-Standardvorlage
// zurückgegeben (is_custom: false) — der Admin kann sie im UI anpassen und
// speichern, wodurch für seinen Tenant eine eigene Kopie entsteht.

import { defineEventHandler, getQuery, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { DUNNING_STAGES } from '~/server/utils/invoice-dunning'

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const supabase = getSupabaseAdmin()
  const query = getQuery(event)
  const language = (query.language as string) || 'de'

  const [{ data: tenantTemplates, error: tenantError }, { data: platformTemplates, error: platformError }] = await Promise.all([
    supabase.from('dunning_templates').select('*').eq('tenant_id', profile.tenant_id).eq('language', language),
    supabase.from('dunning_templates').select('*').is('tenant_id', null).eq('language', language),
  ])

  if (tenantError) throw createError({ statusCode: 500, statusMessage: tenantError.message })
  if (platformError) throw createError({ statusCode: 500, statusMessage: platformError.message })

  const tenantByStage = new Map((tenantTemplates || []).map((t: any) => [t.stage, t]))
  const platformByStage = new Map((platformTemplates || []).map((t: any) => [t.stage, t]))

  const result = DUNNING_STAGES.map(def => {
    const custom = tenantByStage.get(def.stage)
    const platform = platformByStage.get(def.stage)
    const base = custom || platform
    return {
      stage: def.stage,
      stage_key: def.key,
      label: def.label,
      language,
      id: custom?.id ?? null,
      name: base?.name ?? def.label,
      subject: base?.subject ?? '',
      body: base?.body ?? '',
      is_active: base?.is_active ?? true,
      is_custom: !!custom,
      updated_at: base?.updated_at ?? null,
    }
  })

  return result
})
