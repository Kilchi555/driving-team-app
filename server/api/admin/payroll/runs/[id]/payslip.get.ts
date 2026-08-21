import { defineEventHandler, getRouterParam, createError, setResponseHeader } from 'h3'
import { requireAccountingAccess } from '~/server/utils/accountant-access'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { buildPayslipPdf } from '~/server/utils/payroll-payslip-pdf'

export default defineEventHandler(async (event) => {
  const profile = await requireAccountingAccess(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID fehlt' })
  const supabase = getSupabaseAdmin()

  const [{ data: run, error: runErr }, { data: tenant }] = await Promise.all([
    supabase
      .from('payroll_runs')
      .select('*, employee:payroll_employees(first_name, last_name, email, ahv_number, iban, employment_type)')
      .eq('id', id)
      .eq('tenant_id', profile.tenant_id)
      .single(),
    supabase
      .from('tenants')
      .select('name, legal_company_name, uid_number, invoice_street, invoice_street_nr, invoice_zip, invoice_city')
      .eq('id', profile.tenant_id)
      .single(),
  ])

  if (runErr || !run) throw createError({ statusCode: 404, statusMessage: 'Lohnabrechnung nicht gefunden' })

  const employee = (run.employee ?? {}) as {
    first_name?: string
    last_name?: string
  }
  const last = (employee.last_name ?? 'mitarbeiter').toLowerCase().replace(/[^a-z0-9]+/g, '-')
  const filename = `lohnblatt_${last}_${run.year}-${String(run.month).padStart(2, '0')}.pdf`

  try {
    const pdfBuffer = await buildPayslipPdf({
      tenant: tenant ?? {},
      employee,
      run,
    })
    setResponseHeader(event, 'Content-Type', 'application/pdf')
    setResponseHeader(event, 'Content-Disposition', `attachment; filename="${filename}"`)
    setResponseHeader(event, 'Content-Length', pdfBuffer.length.toString())
    return pdfBuffer
  } catch (err: unknown) {
    throw createError({ statusCode: 500, statusMessage: (err as Error).message })
  }
})
