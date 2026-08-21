import { defineEventHandler, createError } from 'h3'
import { requireAccountingAccess } from '~/server/utils/accountant-access'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const profile = await requireAccountingAccess(event)
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from('tenants')
    .select('legal_form, mwst_obligated, handelsregister_nr, uid_number, legal_company_name')
    .eq('id', profile.tenant_id)
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
})
