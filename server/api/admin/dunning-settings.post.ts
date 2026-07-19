// server/api/admin/dunning-settings.post.ts
// Speichert (upsert) die Mahnwesen-Einstellungen für den Tenant des Admins.

import { defineEventHandler, readBody, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const supabase = getSupabaseAdmin()
  const body = await readBody(event)

  const allowedFields = [
    'is_enabled',
    'reminder_after_days', 'first_dunning_after_days', 'second_dunning_after_days',
    'reminder_fee_rappen', 'first_dunning_fee_rappen', 'second_dunning_fee_rappen',
    'add_fee_to_invoice_total',
    'apply_interest', 'interest_rate_percent',
    'new_due_days',
  ]

  const update: Record<string, any> = { tenant_id: profile.tenant_id, updated_by: profile.id }
  for (const field of allowedFields) {
    if (body[field] !== undefined) update[field] = body[field]
  }

  for (const daysField of ['reminder_after_days', 'first_dunning_after_days', 'second_dunning_after_days']) {
    if (update[daysField] !== undefined && (!Number.isFinite(update[daysField]) || update[daysField] < 0)) {
      throw createError({ statusCode: 400, statusMessage: `${daysField} muss eine positive Zahl sein` })
    }
  }
  if (
    update.reminder_after_days !== undefined && update.first_dunning_after_days !== undefined && update.second_dunning_after_days !== undefined &&
    !(update.reminder_after_days < update.first_dunning_after_days && update.first_dunning_after_days < update.second_dunning_after_days)
  ) {
    throw createError({ statusCode: 400, statusMessage: 'Die Fristen müssen aufsteigend sein: Erinnerung < 1. Mahnung < 2. Mahnung' })
  }

  const { data: existing } = await supabase
    .from('dunning_settings')
    .select('id')
    .eq('tenant_id', profile.tenant_id)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('dunning_settings')
      .update(update)
      .eq('id', existing.id)
    if (error) throw createError({ statusCode: 500, statusMessage: error.message })
    return { success: true, id: existing.id }
  } else {
    const { data, error } = await supabase
      .from('dunning_settings')
      .insert(update)
      .select('id')
      .single()
    if (error) throw createError({ statusCode: 500, statusMessage: error.message })
    return { success: true, id: data.id }
  }
})
