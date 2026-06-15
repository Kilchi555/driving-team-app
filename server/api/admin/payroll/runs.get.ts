import { defineEventHandler, getQuery, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const supabase = getSupabaseAdmin()
  const query = getQuery(event)
  const year  = query.year  ? parseInt(query.year  as string) : new Date().getFullYear()
  const month = query.month ? parseInt(query.month as string) : null

  let q = supabase
    .from('payroll_runs')
    .select('*, employee:payroll_employees(id, first_name, last_name, employment_type)')
    .eq('tenant_id', profile.tenant_id)
    .eq('year', year)
    .order('month', { ascending: true })

  if (month) q = q.eq('month', month)

  const { data, error } = await q

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { success: true, data: data ?? [] }
})
