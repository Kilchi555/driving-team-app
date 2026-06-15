import { defineEventHandler, readBody, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const body = await readBody(event)
  const supabase = getSupabaseAdmin()

  const { first_name, last_name, email, employment_type, gross_salary_rappen,
    hours_per_month, ahv_number, iban, start_date, notes, user_id } = body

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
    })
    .select()
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { success: true, data }
})
