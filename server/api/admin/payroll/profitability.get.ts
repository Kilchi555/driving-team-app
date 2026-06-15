import { defineEventHandler, getQuery, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const supabase = getSupabaseAdmin()
  const query = getQuery(event)
  const year = query.year ? parseInt(query.year as string) : new Date().getFullYear()
  const dateFrom = `${year}-01-01`
  const dateTo   = `${year}-12-31`

  // Revenue: all completed payments for this tenant in this year
  const { data: paymentsData, error: pmErr } = await supabase
    .from('payments')
    .select('total_amount_rappen, created_at, appointment_id, appointment:appointments(staff_id, staff:users!staff_id(id, first_name, last_name))')
    .eq('tenant_id', profile.tenant_id)
    .eq('payment_status', 'completed')
    .gte('created_at', `${dateFrom}T00:00:00Z`)
    .lte('created_at', `${dateTo}T23:59:59Z`)
    .limit(9999)

  if (pmErr) throw createError({ statusCode: 500, statusMessage: pmErr.message })

  // Manual accounting entries
  const { data: entriesData } = await supabase
    .from('accounting_entries')
    .select('type, amount_rappen, entry_date, category:accounting_categories(name)')
    .eq('tenant_id', profile.tenant_id)
    .is('deleted_at', null)
    .gte('entry_date', dateFrom)
    .lte('entry_date', dateTo)

  // Paid payroll runs
  const { data: payrollData } = await supabase
    .from('payroll_runs')
    .select('year, month, gross_rappen, ahv_employer_rappen, alv_employer_rappen, bu_employer_rappen, net_rappen, employee_id, employee:payroll_employees(id, first_name, last_name, user_id)')
    .eq('tenant_id', profile.tenant_id)
    .eq('status', 'paid')
    .eq('year', year)

  // Active employees with their linked user_id
  const { data: employeesData } = await supabase
    .from('payroll_employees')
    .select('id, first_name, last_name, user_id, gross_salary_rappen, employment_type, hours_per_month')
    .eq('tenant_id', profile.tenant_id)
    .is('end_date', null)

  // ── Aggregate totals ──────────────────────────────────────────────────────
  const totalRevenueRappen = (paymentsData ?? []).reduce((s, p) => s + (p.total_amount_rappen ?? 0), 0)
    + (entriesData ?? []).filter(e => e.type === 'income').reduce((s, e) => s + e.amount_rappen, 0)

  const manualExpenseRappen = (entriesData ?? [])
    .filter(e => e.type === 'expense')
    .reduce((s, e) => s + e.amount_rappen, 0)

  const payrollTotalRappen = (payrollData ?? []).reduce((s, r) =>
    s + r.gross_rappen + r.ahv_employer_rappen + r.alv_employer_rappen + r.bu_employer_rappen, 0)

  const totalCostRappen = manualExpenseRappen + payrollTotalRappen
  const resultRappen = totalRevenueRappen - totalCostRappen

  // ── Monthly breakdown ─────────────────────────────────────────────────────
  const monthly = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1
    const mStr = String(m).padStart(2, '0')

    const revenue = (paymentsData ?? [])
      .filter(p => { const d = new Date(p.created_at); return d.getMonth() + 1 === m })
      .reduce((s, p) => s + (p.total_amount_rappen ?? 0), 0)
      + (entriesData ?? [])
        .filter(e => e.type === 'income' && e.entry_date?.startsWith(`${year}-${mStr}`))
        .reduce((s, e) => s + e.amount_rappen, 0)

    const expenses = (entriesData ?? [])
      .filter(e => e.type === 'expense' && e.entry_date?.startsWith(`${year}-${mStr}`))
      .reduce((s, e) => s + e.amount_rappen, 0)

    const payroll = (payrollData ?? [])
      .filter(r => r.month === m)
      .reduce((s, r) => s + r.gross_rappen + r.ahv_employer_rappen + r.alv_employer_rappen + r.bu_employer_rappen, 0)

    return {
      month: m,
      label: new Date(year, i, 1).toLocaleDateString('de-CH', { month: 'short' }),
      revenue_rappen: revenue,
      expenses_rappen: expenses,
      payroll_rappen: payroll,
      result_rappen: revenue - expenses - payroll,
    }
  })

  // ── Per-instructor breakdown ──────────────────────────────────────────────
  // Build a map: user_id → { name, revenue_rappen, payroll_rappen, payments_count }
  const byInstructor = new Map<string, {
    user_id: string
    name: string
    revenue_rappen: number
    payroll_rappen: number
    payments_count: number
    employee_id: string | null
  }>()

  // Revenue from appointment payments
  for (const p of (paymentsData ?? [])) {
    const appt = p.appointment as any
    if (!appt?.staff_id) continue
    const staff = appt.staff as any
    const uid = appt.staff_id
    const name = staff ? `${staff.first_name} ${staff.last_name}` : uid

    if (!byInstructor.has(uid)) {
      byInstructor.set(uid, { user_id: uid, name, revenue_rappen: 0, payroll_rappen: 0, payments_count: 0, employee_id: null })
    }
    byInstructor.get(uid)!.revenue_rappen += (p.total_amount_rappen ?? 0)
    byInstructor.get(uid)!.payments_count++
  }

  // Link payroll costs via user_id on payroll_employees
  for (const run of (payrollData ?? [])) {
    const emp = run.employee as any
    if (!emp?.user_id) continue
    const uid = emp.user_id
    const name = `${emp.first_name} ${emp.last_name}`
    const cost = run.gross_rappen + run.ahv_employer_rappen + run.alv_employer_rappen + run.bu_employer_rappen

    if (!byInstructor.has(uid)) {
      byInstructor.set(uid, { user_id: uid, name, revenue_rappen: 0, payroll_rappen: 0, payments_count: 0, employee_id: emp.id })
    }
    byInstructor.get(uid)!.payroll_rappen += cost
    byInstructor.get(uid)!.employee_id = emp.id
  }

  // Add employees that have no payments yet
  for (const emp of (employeesData ?? [])) {
    if (emp.user_id && !byInstructor.has(emp.user_id)) {
      byInstructor.set(emp.user_id, {
        user_id: emp.user_id,
        name: `${emp.first_name} ${emp.last_name}`,
        revenue_rappen: 0,
        payroll_rappen: 0,
        payments_count: 0,
        employee_id: emp.id,
      })
    }
  }

  const instructors = Array.from(byInstructor.values())
    .map(i => ({
      ...i,
      result_rappen: i.revenue_rappen - i.payroll_rappen,
      margin_pct: i.revenue_rappen > 0
        ? Math.round(((i.revenue_rappen - i.payroll_rappen) / i.revenue_rappen) * 100)
        : null,
    }))
    .sort((a, b) => b.revenue_rappen - a.revenue_rappen)

  // ── Break-even ────────────────────────────────────────────────────────────
  const avgMonthlyPayroll   = payrollTotalRappen / 12
  const avgMonthlyExpenses  = manualExpenseRappen / 12
  const breakEvenMonthly    = Math.round(avgMonthlyPayroll + avgMonthlyExpenses)

  return {
    success: true,
    year,
    summary: {
      total_revenue_rappen:       totalRevenueRappen,
      total_expense_rappen:       totalCostRappen,
      manual_expense_rappen:      manualExpenseRappen,
      payroll_total_rappen:       payrollTotalRappen,
      result_rappen:              resultRappen,
      payroll_share_pct:          totalCostRappen > 0 ? Math.round((payrollTotalRappen / totalCostRappen) * 100) : 0,
      employee_count:             (employeesData ?? []).length,
      break_even_monthly_rappen:  breakEvenMonthly,
      profitable:                 resultRappen > 0,
    },
    monthly,
    instructors,
  }
})
