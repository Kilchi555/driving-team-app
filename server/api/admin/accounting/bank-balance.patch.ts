import { defineEventHandler, readBody, createError } from 'h3'
import { requireAccountingAccess } from '~/server/utils/accountant-access'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const profile = await requireAccountingAccess(event, { write: true })
  const body = await readBody<{ bank_balance_rappen?: number }>(event)
  const amount = Math.round(Number(body.bank_balance_rappen))
  if (!Number.isFinite(amount) || amount < 0) {
    throw createError({ statusCode: 400, statusMessage: 'Bankbestand muss ≥ 0 sein' })
  }

  const supabase = getSupabaseAdmin()
  const { error } = await supabase
    .from('tenants')
    .update({ bank_balance_rappen: amount })
    .eq('id', profile.tenant_id)

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { success: true, bank_balance_rappen: amount }
})
