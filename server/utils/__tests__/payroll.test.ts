import { describe, expect, it } from 'vitest'
import {
  employeeDeductionRappen,
  employerContributionRappen,
  employerCostRappen,
  extraPayoutRappen,
  formatAhvNumber,
  payoutRappen,
  payrollMonthLabel,
} from '../payroll'
import { buildPayslipPdf } from '../payroll-payslip-pdf'

const run = {
  gross_rappen: 500_000,
  ahv_employee_rappen: 26_500,
  iv_employee_rappen: 0,
  alv_employee_rappen: 5_500,
  nbu_employee_rappen: 3_400,
  bvg_employee_rappen: 13_975,
  ahv_employer_rappen: 26_500,
  alv_employer_rappen: 5_500,
  bu_employer_rappen: 1_950,
  bvg_employer_rappen: 13_975,
  monthly_spesen_rappen: 2_000,
  child_allowance_rappen: 25_000,
  net_rappen: 450_625,
  total_payout_rappen: 477_625,
}

describe('payroll payslip totals', () => {
  it('sums employee deductions including BVG', () => {
    expect(employeeDeductionRappen(run)).toBe(49_375)
  })

  it('sums employer contributions and total cost', () => {
    expect(employerContributionRappen(run)).toBe(47_925)
    expect(extraPayoutRappen(run)).toBe(27_000)
    expect(employerCostRappen(run)).toBe(574_925)
  })

  it('uses stored payout and falls back to net + extras', () => {
    expect(payoutRappen(run)).toBe(477_625)
    expect(payoutRappen({ net_rappen: 100, monthly_spesen_rappen: 20 })).toBe(120)
  })

  it('formats AHV numbers and month labels', () => {
    expect(formatAhvNumber('7561234567890')).toBe('756.1234.5678.90')
    expect(formatAhvNumber('756.1234.5678.90')).toBe('756.1234.5678.90')
    expect(formatAhvNumber(null)).toBe('—')
    expect(payrollMonthLabel(2026, 8)).toBe('August 2026')
  })

  it('renders a Lohnblatt PDF', async () => {
    const pdf = await buildPayslipPdf({
      tenant: { name: 'Fahrschule Test', uid_number: 'CHE-123.456.789' },
      employee: { first_name: 'Anna', last_name: 'Muster', ahv_number: '7561234567890' },
      run: { ...run, year: 2026, month: 8, status: 'draft' },
    })
    expect(pdf.subarray(0, 4).toString()).toBe('%PDF')
    expect(pdf.length).toBeGreaterThan(500)
  })
})
