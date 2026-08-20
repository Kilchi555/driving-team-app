import { defineEventHandler, createError } from 'h3'
import { requireAccountingAccess } from '~/server/utils/accountant-access'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const profile = await requireAccountingAccess(event)
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from('payroll_employees')
    .select('*')
    .eq('tenant_id', profile.tenant_id)
    .is('end_date', null)
    .order('last_name', { ascending: true })

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { success: true, data: data ?? [] }
})
