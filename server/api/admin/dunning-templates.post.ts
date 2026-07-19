// server/api/admin/dunning-templates.post.ts
// Speichert die Vorlage einer Mahnstufe für den Tenant (Upsert nach tenant_id+stage+language).
// Body: { stage, language?, name, subject, body, is_active? }

import { defineEventHandler, readBody, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getStageKey } from '~/server/utils/invoice-dunning'

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const supabase = getSupabaseAdmin()
  const body = await readBody(event)

  const { stage, language = 'de', name, subject, body: templateBody, is_active = true } = body

  if (![1, 2, 3].includes(Number(stage))) {
    throw createError({ statusCode: 400, statusMessage: 'stage muss 1, 2 oder 3 sein' })
  }
  if (!subject?.trim() || !templateBody?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Betreff und Text sind erforderlich' })
  }

  const row = {
    tenant_id: profile.tenant_id,
    stage: Number(stage),
    stage_key: getStageKey(Number(stage)),
    language,
    name: name?.trim() || undefined,
    subject: subject.trim(),
    body: templateBody,
    is_active,
    updated_by: profile.id,
    updated_at: new Date().toISOString(),
  }

  const { data: existing } = await supabase
    .from('dunning_templates')
    .select('id')
    .eq('tenant_id', profile.tenant_id)
    .eq('stage', row.stage)
    .eq('language', language)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase.from('dunning_templates').update(row).eq('id', existing.id)
    if (error) throw createError({ statusCode: 500, statusMessage: error.message })
    return { success: true, id: existing.id, is_custom: true }
  } else {
    const { data, error } = await supabase
      .from('dunning_templates')
      .insert({ ...row, name: row.name || `Vorlage Stufe ${stage}`, created_at: new Date().toISOString() })
      .select('id')
      .single()
    if (error) throw createError({ statusCode: 500, statusMessage: error.message })
    return { success: true, id: data.id, is_custom: true }
  }
})
