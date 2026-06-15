import { defineEventHandler, readBody, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

// CH 2025 legal defaults (used as fallback only — all rates are configurable per employee)
export const DEFAULT_RATES = {
  ahv_employee: 0.053,
  ahv_employer: 0.053,
  alv_employee: 0.011,
  alv_employer: 0.011,
  nbu_employee: 0.0068,
  bu_employer:  0.0039,
  bvg_employee: 0.05,
  bvg_employer: 0.05,
}

interface EmployeeRates {
  ahvEmployeeRate:      number
  ahvEmployerRate:      number
  alvEmployeeRate:      number
  alvEmployerRate:      number
  nbuRate:              number
  buRate:               number
  bvgEmployeeRate:      number
  bvgEmployerRate:      number
  bvgCoordRappen:       number
  monthlySpesRappen:    number
  childAllowanceRappen: number
}

export function computeDeductions(grossRappen: number, rates: EmployeeRates) {
  const r = Math.round

  // All rates are configurable per employee
  const ahv_employee = r(grossRappen * rates.ahvEmployeeRate)
  const alv_employee = r(grossRappen * rates.alvEmployeeRate)
  const nbu_employee = r(grossRappen * rates.nbuRate)
  const ahv_employer = r(grossRappen * rates.ahvEmployerRate)
  const alv_employer = r(grossRappen * rates.alvEmployerRate)
  const bu_employer  = r(grossRappen * rates.buRate)

  // 2. BVG (auf koordiniertes Gehalt = Brutto - Koordinationsabzug)
  const coordinated = Math.max(0, grossRappen - rates.bvgCoordRappen)
  const bvg_employee = r(coordinated * rates.bvgEmployeeRate)
  const bvg_employer = r(coordinated * rates.bvgEmployerRate)

  // 3. Nettolohn (Brutto - alle AN-Abzüge)
  const net_rappen = grossRappen - ahv_employee - alv_employee - nbu_employee - bvg_employee

  // 4. Auszahlung (Netto + Spesen + Kinderzulage)
  const total_payout = net_rappen + rates.monthlySpesRappen + rates.childAllowanceRappen

  return {
    ahv_employee_rappen:    ahv_employee,
    iv_employee_rappen:     0,
    alv_employee_rappen:    alv_employee,
    nbu_employee_rappen:    nbu_employee,
    bvg_employee_rappen:    bvg_employee,
    ahv_employer_rappen:    ahv_employer,
    alv_employer_rappen:    alv_employer,
    bu_employer_rappen:     bu_employer,
    bvg_employer_rappen:    bvg_employer,
    monthly_spesen_rappen:  rates.monthlySpesRappen,
    child_allowance_rappen: rates.childAllowanceRappen,
    net_rappen,
    total_payout_rappen:    total_payout,
  }
}

/**
 * POST /api/admin/payroll/calculate
 * Creates or updates payroll runs for one or more employees for a given month.
 */
export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const body = await readBody(event)
  const supabase = getSupabaseAdmin()

  const { year, month, runs } = body as {
    year: number
    month: number
    runs: Array<{ employee_id: string; hours_worked?: number }>
  }

  if (!year || !month || !Array.isArray(runs) || runs.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'year, month und runs erforderlich' })
  }

  const employeeIds = runs.map(r => r.employee_id)
  const { data: employees, error: empErr } = await supabase
    .from('payroll_employees')
    .select(`id, employment_type, gross_salary_rappen, hours_per_month,
      ahv_employee_rate, ahv_employer_rate, alv_employee_rate, alv_employer_rate,
      nbu_rate, bu_rate,
      bvg_employee_rate, bvg_employer_rate, bvg_coordination_rappen,
      monthly_spesen_rappen, child_allowance_rappen, salary_items`)
    .eq('tenant_id', profile.tenant_id)
    .in('id', employeeIds)

  if (empErr) throw createError({ statusCode: 500, statusMessage: empErr.message })

  const empMap = new Map((employees ?? []).map(e => [e.id, e]))
  const upserts = []

  for (const run of runs) {
    const emp = empMap.get(run.employee_id)
    if (!emp) continue

    // Additional taxable salary components (bruttopflichtig)
    const salaryItemsRappen = Array.isArray((emp as any).salary_items)
      ? (emp as any).salary_items.reduce((sum: number, item: any) => sum + Math.round((item.amount_chf || 0) * 100), 0)
      : 0

    let grossRappen = emp.gross_salary_rappen + salaryItemsRappen
    if (emp.employment_type === 'hourly' && run.hours_worked != null) {
      grossRappen = Math.round(emp.gross_salary_rappen * run.hours_worked) + salaryItemsRappen
    }

    const rates: EmployeeRates = {
      ahvEmployeeRate:      emp.ahv_employee_rate      ?? DEFAULT_RATES.ahv_employee,
      ahvEmployerRate:      emp.ahv_employer_rate      ?? DEFAULT_RATES.ahv_employer,
      alvEmployeeRate:      emp.alv_employee_rate      ?? DEFAULT_RATES.alv_employee,
      alvEmployerRate:      emp.alv_employer_rate      ?? DEFAULT_RATES.alv_employer,
      nbuRate:              emp.nbu_rate               ?? DEFAULT_RATES.nbu_employee,
      buRate:               emp.bu_rate                ?? DEFAULT_RATES.bu_employer,
      bvgEmployeeRate:      emp.bvg_employee_rate      ?? DEFAULT_RATES.bvg_employee,
      bvgEmployerRate:      emp.bvg_employer_rate      ?? DEFAULT_RATES.bvg_employer,
      bvgCoordRappen:       emp.bvg_coordination_rappen ?? 220500,
      monthlySpesRappen:    emp.monthly_spesen_rappen   ?? 0,
      childAllowanceRappen: emp.child_allowance_rappen  ?? 0,
    }

    const deductions = computeDeductions(grossRappen, rates)

    upserts.push({
      tenant_id:   profile.tenant_id,
      employee_id: run.employee_id,
      year,
      month,
      gross_rappen:  grossRappen,
      hours_worked:  run.hours_worked ?? null,
      ...deductions,
      status:       'draft',
      updated_at:   new Date().toISOString(),
    })
  }

  const { data, error } = await supabase
    .from('payroll_runs')
    .upsert(upserts, { onConflict: 'employee_id,year,month' })
    .select()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { success: true, data }
})
