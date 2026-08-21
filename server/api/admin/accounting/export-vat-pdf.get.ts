import { defineEventHandler, getQuery, createError, setResponseHeader } from 'h3'
import { requireAccountingAccess } from '~/server/utils/accountant-access'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { loadVatYearInput } from '~/server/utils/accounting-vat-data'
import { computeVatQuarter } from '~/server/utils/accounting-vat'
import { buildVatQuarterPdf } from '~/server/utils/accounting-vat-pdf'

export default defineEventHandler(async (event) => {
  const profile = await requireAccountingAccess(event)
  const query = getQuery(event)
  const year = Number(query.year) || new Date().getFullYear()
  const quarter = Number(query.quarter)
  if (year < 2000 || year > 2100 || ![1, 2, 3, 4].includes(quarter)) {
    throw createError({ statusCode: 400, statusMessage: 'Jahr und Quartal (1–4) erforderlich' })
  }

  try {
    const { tenant, input } = await loadVatYearInput(getSupabaseAdmin(), profile.tenant_id, year)
    const result = computeVatQuarter(year, quarter, input, tenant.mwst_obligated)
    const pdfBuffer = await buildVatQuarterPdf({ tenant, quarter: result })
    setResponseHeader(event, 'Content-Type', 'application/pdf')
    setResponseHeader(event, 'Content-Disposition', `attachment; filename="mwst_q${quarter}_${year}.pdf"`)
    setResponseHeader(event, 'Content-Length', pdfBuffer.length.toString())
    return pdfBuffer
  } catch (err: unknown) {
    throw createError({ statusCode: 500, statusMessage: (err as Error).message })
  }
})
