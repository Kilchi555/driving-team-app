import { defineEventHandler, getQuery, createError, setResponseHeader } from 'h3'
import { requireAccountingAccess } from '~/server/utils/accountant-access'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { buildMonthPayslipsPdf } from '~/server/utils/payroll-payslip-pdf'

export default defineEventHandler(async (event) => {
  const profile = await requireAccountingAccess(event)
  const query = getQuery(event)
  const year = Number(query.year) || new Date().getFullYear()
  const month = Number(query.month)
  if (year < 2000 || year > 2100 || month < 1 || month > 12) {
    throw createError({ statusCode: 400, statusMessage: 'Jahr und Monat erforderlich' })
  }

  const supabase = getSupabaseAdmin()
  const [{ data: runs, error }, { data: tenant }] = await Promise.all([
    supabase
      .from('payroll_runs')
      .select('*, employee:payroll_employees(first_name, last_name, email, ahv_number, iban, employment_type)')
      .eq('tenant_id', profile.tenant_id)
      .eq('year', year)
      .eq('month', month)
      .order('created_at'),
    supabase
      .from('tenants')
      .select('name, legal_company_name, uid_number, invoice_street, invoice_street_nr, invoice_zip, invoice_city')
      .eq('id', profile.tenant_id)
      .single(),
  ])

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  if (!runs?.length) {
    throw createError({ statusCode: 404, statusMessage: 'Keine Lohnabrechnungen in diesem Monat' })
  }

  const sorted = [...runs].sort((a, b) => {
    const ea = a.employee as { last_name?: string; first_name?: string } | null
    const eb = b.employee as { last_name?: string; first_name?: string } | null
    return `${ea?.last_name ?? ''} ${ea?.first_name ?? ''}`.localeCompare(`${eb?.last_name ?? ''} ${eb?.first_name ?? ''}`, 'de-CH')
  })

  try {
    const pdfBuffer = await buildMonthPayslipsPdf({
      tenant: tenant ?? {},
      slips: sorted.map(run => ({
        employee: (run.employee ?? {}) as { first_name?: string; last_name?: string },
        run,
      })),
    })
    setResponseHeader(event, 'Content-Type', 'application/pdf')
    setResponseHeader(event, 'Content-Disposition', `attachment; filename="lohnblaetter_${year}-${String(month).padStart(2, '0')}.pdf"`)
    setResponseHeader(event, 'Content-Length', pdfBuffer.length.toString())
    return pdfBuffer
  } catch (err: unknown) {
    throw createError({ statusCode: 500, statusMessage: (err as Error).message })
  }
})
