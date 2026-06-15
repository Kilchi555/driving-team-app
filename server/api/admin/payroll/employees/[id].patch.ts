import { defineEventHandler, readBody, createError, getRouterParam } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  const supabase = getSupabaseAdmin()

  const allowed = ['first_name', 'last_name', 'email', 'employment_type', 'gross_salary_rappen',
    'hours_per_month', 'ahv_number', 'iban', 'start_date', 'end_date', 'notes', 'user_id',
    'ahv_employee_rate', 'ahv_employer_rate', 'alv_employee_rate', 'alv_employer_rate',
    'nbu_rate', 'bu_rate',
    'bvg_employee_rate', 'bvg_employer_rate', 'bvg_coordination_rappen',
    'monthly_spesen_rappen', 'child_allowance_rappen', 'spesen_items', 'salary_items',
    'bvg_entry_threshold_rappen']
  const updates: Record<string, any> = { updated_at: new Date().toISOString() }
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  const { data, error } = await supabase
    .from('payroll_employees')
    .update(updates)
    .eq('id', id!)
    .eq('tenant_id', profile.tenant_id)
    .select()
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { success: true, data }
})
