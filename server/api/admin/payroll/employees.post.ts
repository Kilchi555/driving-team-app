import { defineEventHandler, readBody, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const body = await readBody(event)
  const supabase = getSupabaseAdmin()

  const { first_name, last_name, email, employment_type, gross_salary_rappen,
    hours_per_month, ahv_number, iban, start_date, notes, user_id,
    ahv_employee_rate, ahv_employer_rate, alv_employee_rate, alv_employer_rate,
    nbu_rate, bu_rate, bvg_employee_rate, bvg_employer_rate, bvg_coordination_rappen,
    monthly_spesen_rappen, child_allowance_rappen, spesen_items } = body

  if (!first_name || !last_name || !employment_type || gross_salary_rappen == null) {
    throw createError({ statusCode: 400, statusMessage: 'Pflichtfelder fehlen' })
  }

  const { data, error } = await supabase
    .from('payroll_employees')
    .insert({
      tenant_id: profile.tenant_id,
      user_id: user_id ?? null,
      first_name,
      last_name,
      email: email ?? null,
      employment_type,
      gross_salary_rappen,
      hours_per_month: hours_per_month ?? null,
      ahv_number: ahv_number ?? null,
      iban: iban ?? null,
      start_date: start_date ?? new Date().toISOString().split('T')[0],
      notes: notes ?? null,
      ahv_employee_rate: ahv_employee_rate ?? 0.053,
      ahv_employer_rate: ahv_employer_rate ?? 0.053,
      alv_employee_rate: alv_employee_rate ?? 0.011,
      alv_employer_rate: alv_employer_rate ?? 0.011,
      nbu_rate: nbu_rate ?? 0.0068,
      bu_rate: bu_rate ?? 0.0039,
      bvg_employee_rate: bvg_employee_rate ?? 0.05,
      bvg_employer_rate: bvg_employer_rate ?? 0.05,
      bvg_coordination_rappen: bvg_coordination_rappen ?? 220500,
      monthly_spesen_rappen: monthly_spesen_rappen ?? 0,
      child_allowance_rappen: child_allowance_rappen ?? 0,
      spesen_items: spesen_items ?? [],
    })
    .select()
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { success: true, data }
})
