import { defineEventHandler, getQuery, createError } from 'h3'
import { requireAccountingAccess } from '~/server/utils/accountant-access'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { loadVatYearInput } from '~/server/utils/accounting-vat-data'
import { computeVatYear } from '~/server/utils/accounting-vat'

export default defineEventHandler(async (event) => {
  const profile = await requireAccountingAccess(event)
  const year = Number(getQuery(event).year) || new Date().getFullYear()
  if (year < 2000 || year > 2100) {
    throw createError({ statusCode: 400, statusMessage: 'Ungültiges Jahr' })
  }

  try {
    const { tenant, input } = await loadVatYearInput(getSupabaseAdmin(), profile.tenant_id, year)
    const summary = computeVatYear(year, input, tenant.mwst_obligated)
    return {
      success: true,
      tenant,
      ...summary,
    }
  } catch (err: unknown) {
    throw createError({ statusCode: 500, statusMessage: (err as Error).message })
  }
})
