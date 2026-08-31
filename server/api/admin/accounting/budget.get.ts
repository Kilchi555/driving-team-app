import { defineEventHandler, getQuery, createError } from 'h3'
import { requireAccountingAccess } from '~/server/utils/accountant-access'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import {
  aggregateActualsByCategory,
  aggregateRecurringAnnualByCategory,
  buildBudgetLines,
} from '~/server/utils/accounting-budget'
import type { RecurringInterval } from '~/server/utils/accounting-recurring'

async function paymentIncomeForYear(supabase: any, tenantId: string, year: number): Promise<number> {
  const { data, error } = await supabase.rpc('get_payments_monthly_summary', {
    p_tenant_id: tenantId,
    p_year: year,
  })
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return (data ?? []).reduce((sum: number, row: any) => sum + Number(row.total_rappen ?? 0), 0)
}

async function entriesForYear(supabase: any, tenantId: string, year: number) {
  const { data, error } = await supabase
    .from('accounting_entries')
    .select('type, amount_rappen, category_id, linked_payment_id, document_kind, external_reference')
    .eq('tenant_id', tenantId)
    .eq('approval_status', 'approved')
    .is('deleted_at', null)
    .gte('entry_date', `${year}-01-01`)
    .lte('entry_date', `${year}-12-31`)
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data ?? []
}

export default defineEventHandler(async (event) => {
  const profile = await requireAccountingAccess(event)
  const supabase = getSupabaseAdmin()
  const year = Number(getQuery(event).year) || new Date().getFullYear()

  const [categoriesRes, savedRes, recurringRes, thisYearPayments, lastYearPayments, thisYearEntries, lastYearEntries] = await Promise.all([
    supabase
      .from('accounting_categories')
      .select('id, name, type, color')
      .eq('tenant_id', profile.tenant_id)
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('accounting_budget_lines')
      .select('category_id, type, amount_rappen')
      .eq('tenant_id', profile.tenant_id)
      .eq('year', year),
    supabase
      .from('accounting_recurring_entries')
      .select('type, amount_rappen, interval, category_id, is_active, document_kind')
      .eq('tenant_id', profile.tenant_id)
      .eq('is_active', true),
    paymentIncomeForYear(supabase, profile.tenant_id, year),
    paymentIncomeForYear(supabase, profile.tenant_id, year - 1),
    entriesForYear(supabase, profile.tenant_id, year),
    entriesForYear(supabase, profile.tenant_id, year - 1),
  ])

  if (categoriesRes.error) throw createError({ statusCode: 500, statusMessage: categoriesRes.error.message })
  if (savedRes.error) throw createError({ statusCode: 500, statusMessage: savedRes.error.message })
  if (recurringRes.error) throw createError({ statusCode: 500, statusMessage: recurringRes.error.message })

  const saved = new Map<string, number>()
  for (const row of savedRes.data ?? []) {
    saved.set(`${row.type}:${row.category_id || '_'}`, row.amount_rappen || 0)
  }

  const lines = buildBudgetLines({
    categories: categoriesRes.data ?? [],
    saved,
    actuals: aggregateActualsByCategory(thisYearEntries, thisYearPayments),
    recurringAnnual: aggregateRecurringAnnualByCategory(
      (recurringRes.data ?? []).map(row => ({
        ...row,
        interval: row.interval as RecurringInterval,
      })),
    ),
    lastYearActuals: aggregateActualsByCategory(lastYearEntries, lastYearPayments),
  })

  const income = lines.filter(l => l.type === 'income')
  const expenses = lines.filter(l => l.type === 'expense')
  const sum = (rows: typeof lines, field: 'budget_rappen' | 'actual_rappen') =>
    rows.reduce((s, row) => s + row[field], 0)

  return {
    success: true,
    year,
    saved: saved.size > 0,
    lines,
    totals: {
      income_budget_rappen: sum(income, 'budget_rappen'),
      income_actual_rappen: sum(income, 'actual_rappen'),
      expense_budget_rappen: sum(expenses, 'budget_rappen'),
      expense_actual_rappen: sum(expenses, 'actual_rappen'),
    },
  }
})
