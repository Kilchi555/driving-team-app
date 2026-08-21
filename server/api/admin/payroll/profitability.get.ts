import { defineEventHandler, getQuery, createError } from 'h3'
import { requireAccountingAccess } from '~/server/utils/accountant-access'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { buildProfitabilityReport } from '~/server/utils/accounting-profitability'
import { loadPayrollCalendarHoursYear } from '~/server/utils/payroll-calendar-hours'
import { employerCostRappen } from '~/server/utils/payroll'
import { todayZurichIso } from '~/server/utils/invoice-quote'

export default defineEventHandler(async (event) => {
  const profile = await requireAccountingAccess(event)
  const supabase = getSupabaseAdmin()
  const query = getQuery(event)
  const year = query.year ? parseInt(query.year as string) : new Date().getFullYear()
  const dateFrom = `${year}-01-01`
  const dateTo = `${year}-12-31`
  const today = todayZurichIso()
  const todayYear = Number(today.slice(0, 4))
  const todayMonth = Number(today.slice(5, 7))

  const { data: rpcData, error: rpcError } = await supabase
    .rpc('get_payments_monthly_summary', {
      p_tenant_id: profile.tenant_id,
      p_year: year,
    })
  if (rpcError) throw createError({ statusCode: 500, statusMessage: rpcError.message })

  const paymentsIncomeByMonth = Array.from({ length: 12 }, () => 0)
  for (const row of (rpcData ?? [])) {
    const month = Number(row.month)
    if (month >= 1 && month <= 12) paymentsIncomeByMonth[month - 1] = Number(row.total_rappen ?? 0)
  }

  const { data: entriesData, error: entriesError } = await supabase
    .from('accounting_entries')
    .select('type, amount_rappen, entry_date, category_id, linked_payment_id, document_kind, external_reference, category:accounting_categories(name)')
    .eq('tenant_id', profile.tenant_id)
    .eq('approval_status', 'approved')
    .is('deleted_at', null)
    .gte('entry_date', dateFrom)
    .lte('entry_date', dateTo)
  if (entriesError) throw createError({ statusCode: 500, statusMessage: entriesError.message })

  const report = buildProfitabilityReport({
    year,
    todayYear,
    todayMonth,
    paymentsIncomeByMonth,
    entries: entriesData ?? [],
  })

  const { data: paymentsData } = await supabase
    .from('payments')
    .select('total_amount_rappen, appointment:appointments(staff_id, staff:users!staff_id(id, first_name, last_name))')
    .eq('tenant_id', profile.tenant_id)
    .eq('payment_status', 'completed')
    .gte('created_at', `${dateFrom}T00:00:00Z`)
    .lte('created_at', `${dateTo}T23:59:59Z`)
    .limit(9999)

  const { data: payrollData } = await supabase
    .from('payroll_runs')
    .select('gross_rappen, ahv_employer_rappen, alv_employer_rappen, bu_employer_rappen, bvg_employer_rappen, monthly_spesen_rappen, child_allowance_rappen, employee:payroll_employees(id, first_name, last_name, user_id)')
    .eq('tenant_id', profile.tenant_id)
    .eq('status', 'paid')
    .eq('year', year)

  const { data: employeesData } = await supabase
    .from('payroll_employees')
    .select('id, first_name, last_name, user_id')
    .eq('tenant_id', profile.tenant_id)
    .is('end_date', null)

  const byInstructor = new Map<string, {
    user_id: string
    name: string
    revenue_rappen: number
    payroll_rappen: number
    payments_count: number
    employee_id: string | null
  }>()

  for (const payment of (paymentsData ?? [])) {
    const appt = payment.appointment as any
    if (!appt?.staff_id) continue
    const staff = appt.staff as any
    const uid = appt.staff_id
    if (!byInstructor.has(uid)) {
      byInstructor.set(uid, {
        user_id: uid,
        name: staff ? `${staff.first_name} ${staff.last_name}` : uid,
        revenue_rappen: 0,
        payroll_rappen: 0,
        payments_count: 0,
        employee_id: null,
      })
    }
    const row = byInstructor.get(uid)!
    row.revenue_rappen += payment.total_amount_rappen ?? 0
    row.payments_count++
  }

  for (const run of (payrollData ?? [])) {
    const emp = run.employee as any
    if (!emp?.user_id) continue
    if (!byInstructor.has(emp.user_id)) {
      byInstructor.set(emp.user_id, {
        user_id: emp.user_id,
        name: `${emp.first_name} ${emp.last_name}`,
        revenue_rappen: 0,
        payroll_rappen: 0,
        payments_count: 0,
        employee_id: emp.id,
      })
    }
    const row = byInstructor.get(emp.user_id)!
    row.payroll_rappen += employerCostRappen(run)
    row.employee_id = emp.id
  }

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

  const staffIds = [...byInstructor.keys()]
  const hoursByStaff = await loadPayrollCalendarHoursYear(supabase, profile.tenant_id, year, staffIds)

  const instructors = Array.from(byInstructor.values())
    .map(row => ({
      ...row,
      hours: hoursByStaff.get(row.user_id) ?? 0,
      result_rappen: row.revenue_rappen - row.payroll_rappen,
      margin_pct: row.revenue_rappen > 0
        ? Math.round(((row.revenue_rappen - row.payroll_rappen) / row.revenue_rappen) * 100)
        : null,
    }))
    .sort((a, b) => b.revenue_rappen - a.revenue_rappen)

  return {
    success: true,
    year,
    summary: {
      ...report.summary,
      employee_count: (employeesData ?? []).length,
    },
    monthly: report.monthly,
    closed_months: report.closed_months,
    instructors,
  }
})
