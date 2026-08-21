/** Snapshot totals for a stored payroll run (rappen). */

export const PAYSLIP_DISCLAIMER =
  'Dieses Lohnblatt ist eine vereinfachte Monatsabrechnung und ersetzt keinen amtlichen Lohnausweis (Formular 11) und keine Swissdec-Meldung. Bitte mit dem Treuhänder prüfen. Die Verantwortung für Sozialversicherungs- und Steuerdeklarationen liegt beim Unternehmen.'

export type PayrollRunSnapshot = {
  gross_rappen?: number | null
  ahv_employee_rappen?: number | null
  iv_employee_rappen?: number | null
  alv_employee_rappen?: number | null
  nbu_employee_rappen?: number | null
  bvg_employee_rappen?: number | null
  ahv_employer_rappen?: number | null
  alv_employer_rappen?: number | null
  bu_employer_rappen?: number | null
  bvg_employer_rappen?: number | null
  monthly_spesen_rappen?: number | null
  child_allowance_rappen?: number | null
  net_rappen?: number | null
  total_payout_rappen?: number | null
}

export function employeeDeductionRappen(run: PayrollRunSnapshot): number {
  return (run.ahv_employee_rappen ?? 0)
    + (run.iv_employee_rappen ?? 0)
    + (run.alv_employee_rappen ?? 0)
    + (run.nbu_employee_rappen ?? 0)
    + (run.bvg_employee_rappen ?? 0)
}

export function employerContributionRappen(run: PayrollRunSnapshot): number {
  return (run.ahv_employer_rappen ?? 0)
    + (run.alv_employer_rappen ?? 0)
    + (run.bu_employer_rappen ?? 0)
    + (run.bvg_employer_rappen ?? 0)
}

export function extraPayoutRappen(run: PayrollRunSnapshot): number {
  return (run.monthly_spesen_rappen ?? 0) + (run.child_allowance_rappen ?? 0)
}

export function payoutRappen(run: PayrollRunSnapshot): number {
  if (run.total_payout_rappen != null) return run.total_payout_rappen
  return (run.net_rappen ?? 0) + extraPayoutRappen(run)
}

export function employerCostRappen(run: PayrollRunSnapshot): number {
  return (run.gross_rappen ?? 0) + employerContributionRappen(run) + extraPayoutRappen(run)
}

export function formatAhvNumber(raw?: string | null): string {
  const trimmed = (raw ?? '').trim()
  if (!trimmed) return '—'
  const digits = trimmed.replace(/\D/g, '')
  if (digits.length === 13) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 7)}.${digits.slice(7, 11)}.${digits.slice(11)}`
  }
  return trimmed
}

const MONTHS_DE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']

export function payrollMonthLabel(year: number, month: number): string {
  return `${MONTHS_DE[month - 1] ?? month} ${year}`
}
