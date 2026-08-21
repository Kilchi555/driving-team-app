import { defineEventHandler, getRouterParam, createError } from 'h3'
import { requireAccountingAccess } from '~/server/utils/accountant-access'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { employeeDeductionRappen, employerContributionRappen, employerCostRappen, payoutRappen, payrollMonthLabel } from '~/server/utils/payroll'
import { syncEntryLedger } from '~/server/utils/accounting-ledger-db'

/**
 * POST /api/admin/payroll/runs/:id/pay
 * Marks a payroll run as paid and creates an accounting entry (expense).
 */
export default defineEventHandler(async (event) => {
  const profile = await requireAccountingAccess(event, { write: true })
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
  const monthLabel = payrollMonthLabel(run.year, run.month)
  const description = `Lohn ${employee.first_name} ${employee.last_name} – ${monthLabel}`

  const totalEmployerCost = employerCostRappen(run)
  const anAbzuege = employeeDeductionRappen(run)
  const agKosten = employerContributionRappen(run)

  const notesParts = [
    `Nettolohn: CHF ${((run.net_rappen ?? 0) / 100).toFixed(2)}`,
    `AN-Abzüge: CHF ${(anAbzuege / 100).toFixed(2)}`,
    `AG-Anteil: CHF ${(agKosten / 100).toFixed(2)}`,
  ]
  if ((run.monthly_spesen_rappen ?? 0) > 0)
    notesParts.push(`Spesen: CHF ${((run.monthly_spesen_rappen) / 100).toFixed(2)}`)
  if ((run.child_allowance_rappen ?? 0) > 0)
    notesParts.push(`Kinderzulage: CHF ${((run.child_allowance_rappen) / 100).toFixed(2)}`)
  notesParts.push(`Auszahlung: CHF ${(payoutRappen(run) / 100).toFixed(2)}`)

  const { data: wageCategory } = await supabase
    .from('accounting_categories')
    .select('id')
    .eq('tenant_id', profile.tenant_id)
    .eq('type', 'expense')
    .eq('name', 'Lohnaufwand')
    .eq('is_active', true)
    .maybeSingle()

  const { data: entry, error: entryErr } = await supabase
    .from('accounting_entries')
    .insert({
      tenant_id: profile.tenant_id,
      type: 'expense',
      amount_rappen: totalEmployerCost,
      description,
      entry_date: new Date(run.year, run.month - 1, 1).toISOString().split('T')[0],
      notes: notesParts.join(' | '),
      category_id: wageCategory?.id ?? null,
      is_paid: true,
      paid_date: new Date().toISOString().split('T')[0],
      approval_status: 'approved',
    })
    .select()
    .single()

  if (entryErr) throw createError({ statusCode: 500, statusMessage: entryErr.message })
  if (entry?.id) await syncEntryLedger(supabase, profile.tenant_id, entry.id)

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
