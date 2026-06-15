import { defineEventHandler, getRouterParam, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

/**
 * POST /api/admin/payroll/runs/:id/pay
 * Marks a payroll run as paid and creates an accounting entry (expense).
 */
export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const id = getRouterParam(event, 'id')
  const supabase = getSupabaseAdmin()

  const { data: run, error: runErr } = await supabase
    .from('payroll_runs')
    .select('*, employee:payroll_employees(first_name, last_name)')
    .eq('id', id!)
    .eq('tenant_id', profile.tenant_id)
    .single()

  if (runErr || !run) throw createError({ statusCode: 404, statusMessage: 'Lohnabrechnung nicht gefunden' })
  if (run.status === 'paid') throw createError({ statusCode: 409, statusMessage: 'Bereits als bezahlt markiert' })

  const employee = run.employee as any
  const monthLabel = new Date(run.year, run.month - 1, 1).toLocaleDateString('de-CH', { month: 'long', year: 'numeric' })
  const description = `Lohn ${employee.first_name} ${employee.last_name} – ${monthLabel}`

  // 1. Create accounting entry (total employer cost = gross + all employer contributions + spesen + kinderzulage)
  const totalEmployerCost = (run.gross_rappen ?? 0)
    + (run.ahv_employer_rappen ?? 0)
    + (run.alv_employer_rappen ?? 0)
    + (run.bu_employer_rappen  ?? 0)
    + (run.bvg_employer_rappen ?? 0)
    + (run.monthly_spesen_rappen  ?? 0)
    + (run.child_allowance_rappen ?? 0)

  const anAbzuege = (run.ahv_employee_rappen ?? 0) + (run.alv_employee_rappen ?? 0)
    + (run.nbu_employee_rappen ?? 0) + (run.bvg_employee_rappen ?? 0)
  const agKosten = (run.ahv_employer_rappen ?? 0) + (run.alv_employer_rappen ?? 0)
    + (run.bu_employer_rappen ?? 0) + (run.bvg_employer_rappen ?? 0)

  const notesParts = [
    `Nettolohn: CHF ${((run.net_rappen ?? 0) / 100).toFixed(2)}`,
    `AN-Abzüge: CHF ${(anAbzuege / 100).toFixed(2)}`,
    `AG-Anteil: CHF ${(agKosten / 100).toFixed(2)}`,
  ]
  if ((run.monthly_spesen_rappen ?? 0) > 0)
    notesParts.push(`Spesen: CHF ${((run.monthly_spesen_rappen) / 100).toFixed(2)}`)
  if ((run.child_allowance_rappen ?? 0) > 0)
    notesParts.push(`Kinderzulage: CHF ${((run.child_allowance_rappen) / 100).toFixed(2)}`)
  notesParts.push(`Auszahlung: CHF ${((run.total_payout_rappen ?? run.net_rappen ?? 0) / 100).toFixed(2)}`)

  const { data: entry, error: entryErr } = await supabase
    .from('accounting_entries')
    .insert({
      tenant_id: profile.tenant_id,
      type: 'expense',
      amount_rappen: totalEmployerCost,
      description,
      entry_date: new Date(run.year, run.month - 1, 1).toISOString().split('T')[0],
      notes: notesParts.join(' | '),
    })
    .select()
    .single()

  if (entryErr) throw createError({ statusCode: 500, statusMessage: entryErr.message })

  // 2. Mark run as paid
  const { data: updated, error: updateErr } = await supabase
    .from('payroll_runs')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      accounting_entry_id: entry.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id!)
    .select()
    .single()

  if (updateErr) throw createError({ statusCode: 500, statusMessage: updateErr.message })
  return { success: true, data: updated }
})
