import { defineEventHandler, getQuery, createError, setResponseHeader } from 'h3'
import { requireAccountingAccess } from '~/server/utils/accountant-access'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { buildAccountingYearPdf } from '~/server/utils/accounting-year-pdf'

export default defineEventHandler(async (event) => {
  const profile = await requireAccountingAccess(event)
  const supabase = getSupabaseAdmin()
  const query = getQuery(event)
  const year = query.year ? parseInt(query.year as string) : new Date().getFullYear()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('name')
    .eq('id', profile.tenant_id)
    .single()

  let pdfBuffer: Buffer
  try {
    pdfBuffer = await buildAccountingYearPdf({
      supabase,
      tenantId: profile.tenant_id,
      tenantName: tenant?.name ?? '',
      year,
    })
  } catch (err: unknown) {
    throw createError({ statusCode: 500, statusMessage: (err as Error).message })
  }

  setResponseHeader(event, 'Content-Type', 'application/pdf')
  setResponseHeader(event, 'Content-Disposition', `attachment; filename="jahresabschluss_${year}.pdf"`)
  setResponseHeader(event, 'Content-Length', pdfBuffer.length.toString())
  return pdfBuffer
})
