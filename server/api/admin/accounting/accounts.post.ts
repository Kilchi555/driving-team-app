import { defineEventHandler, readBody, createError } from 'h3'
import { requireAccountingAccess } from '~/server/utils/accountant-access'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { accountClassFromNumber } from '~/server/utils/accounting-ledger'
import { ensureTenantAccounts } from '~/server/utils/accounting-ledger-db'

export default defineEventHandler(async (event) => {
  const profile = await requireAccountingAccess(event, { write: true })
  const supabase = getSupabaseAdmin()
  await ensureTenantAccounts(supabase, profile.tenant_id)

  const body = await readBody(event)
  const number = String(body.number ?? '').trim()
  const name = String(body.name ?? '').trim()
  const type = body.type as string
  if (!number || !name) throw createError({ statusCode: 400, statusMessage: 'Nummer und Name sind erforderlich' })
  if (!['asset', 'liability', 'equity', 'income', 'expense'].includes(type)) {
    throw createError({ statusCode: 400, statusMessage: 'Ungültiger Kontotyp' })
  }

  const { data, error } = await supabase
    .from('accounting_accounts')
    .insert({
      tenant_id: profile.tenant_id,
      number,
      name,
      type,
      class: accountClassFromNumber(number),
      is_system: false,
      is_active: true,
    })
    .select()
    .single()
  if (error) {
    if (error.code === '23505') throw createError({ statusCode: 409, statusMessage: 'Kontonummer existiert bereits' })
    throw createError({ statusCode: 500, statusMessage: error.message })
  }
  return { success: true, data }
})
