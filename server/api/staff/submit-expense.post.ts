import { defineEventHandler, readBody, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

/**
 * POST /api/staff/submit-expense
 * Staff member submits an expense for admin approval.
 */
export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event, ['staff', 'admin', 'superadmin'])
  const supabase = getSupabaseAdmin()
  const body = await readBody(event)

  const { amount_chf, description, entry_date, receipt_url, receipt_filename, notes } = body

  if (!amount_chf || Number(amount_chf) <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Betrag erforderlich' })
  }
  if (!description?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Beschreibung erforderlich' })
  }
  if (!receipt_url) {
    throw createError({ statusCode: 400, statusMessage: 'Bitte zuerst Beleg hochladen' })
  }

  const amount_rappen = Math.round(Number(amount_chf) * 100)

  const { data, error } = await supabase
    .from('accounting_entries')
    .insert({
      tenant_id:            profile.tenant_id,
      type:                 'expense',
      amount_rappen,
      description:          description.trim(),
      entry_date:           entry_date || new Date().toISOString().split('T')[0],
      receipt_url,
      receipt_filename:     receipt_filename ?? null,
      notes:                notes?.trim() ?? null,
      approval_status:      'pending',
      submitted_by_user_id: profile.id,
      created_by:           profile.id,
      is_paid:              false,
    })
    .select()
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { success: true, data }
})
