import { defineEventHandler, readBody, createError } from 'h3'
import { requireAccountingAccess } from '~/server/utils/accountant-access'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const profile = await requireAccountingAccess(event, { write: true })
  const supabase = getSupabaseAdmin()
  const body = await readBody(event)
  const year = Number(body?.year)
  const lines = Array.isArray(body?.lines) ? body.lines : []

  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw createError({ statusCode: 400, statusMessage: 'Ungültiges Jahr' })
  }

  const rows = lines.map((line: any) => ({
    tenant_id: profile.tenant_id,
    year,
    type: line.type === 'income' ? 'income' : 'expense',
    category_id: line.category_id || null,
    amount_rappen: Math.max(0, Math.round(Number(line.amount_rappen) || 0)),
  }))

  const { error: delError } = await supabase
    .from('accounting_budget_lines')
    .delete()
    .eq('tenant_id', profile.tenant_id)
    .eq('year', year)
  if (delError) throw createError({ statusCode: 500, statusMessage: delError.message })

  if (rows.length) {
    const { error: insError } = await supabase
      .from('accounting_budget_lines')
      .insert(rows)
    if (insError) throw createError({ statusCode: 500, statusMessage: insError.message })
  }

  return { success: true, year, count: rows.length }
})
