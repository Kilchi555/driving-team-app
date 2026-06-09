import { defineEventHandler, readBody, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const supabase = getSupabaseAdmin()
  const body = await readBody(event)

  const {
    type,
    amount_rappen,
    entry_date,
    description,
    category_id,
    vat_rate,
    vat_amount_rappen,
    qr_data,
    creditor_name,
    creditor_iban,
    payment_reference,
    is_paid,
    paid_date,
    external_reference,
    receipt_url,
    receipt_filename,
  } = body

  if (!type || !['income', 'expense'].includes(type)) {
    throw createError({ statusCode: 400, statusMessage: 'type muss income oder expense sein' })
  }
  if (!amount_rappen || amount_rappen <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Betrag muss > 0 sein' })
  }
  if (!entry_date) throw createError({ statusCode: 400, statusMessage: 'Datum ist erforderlich' })
  if (!description?.trim()) throw createError({ statusCode: 400, statusMessage: 'Beschreibung ist erforderlich' })

  const { data: creator } = await supabase
    .from('users')
    .select('id')
    .eq('auth_user_id', (await supabase.auth.getUser()).data.user?.id ?? '')
    .eq('tenant_id', profile.tenant_id)
    .single()

  const { data, error } = await supabase
    .from('accounting_entries')
    .insert({
      type,
      amount_rappen,
      entry_date,
      description: description.trim(),
      category_id: category_id ?? null,
      vat_rate: vat_rate ?? null,
      vat_amount_rappen: vat_amount_rappen ?? null,
      qr_data: qr_data ?? null,
      creditor_name: creditor_name ?? null,
      creditor_iban: creditor_iban ?? null,
      payment_reference: payment_reference ?? null,
      is_paid: is_paid ?? false,
      paid_date: paid_date ?? null,
      external_reference: external_reference ?? null,
      receipt_url: receipt_url ?? null,
      receipt_filename: receipt_filename ?? null,
      created_by: creator?.id ?? null,
      tenant_id: profile.tenant_id,
    })
    .select(`*, category:accounting_categories(id, name, type, color)`)
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return { success: true, data }
})
