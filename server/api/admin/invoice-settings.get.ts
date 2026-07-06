import { defineEventHandler, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from('tenants')
    .select('qr_iban, invoice_street, invoice_street_nr, invoice_zip, invoice_city, invoice_number_prefix, default_vat_rate, invoice_intro_text, invoice_payment_terms, invoice_footer_text')
    .eq('id', profile.tenant_id)
    .maybeSingle()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data ?? {}
})
