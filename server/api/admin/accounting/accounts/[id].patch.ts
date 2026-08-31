import { defineEventHandler, readBody, createError } from 'h3'
import { requireAccountingAccess } from '~/server/utils/accountant-access'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { SYSTEM_ACCOUNT_NUMBERS, accountClassFromNumber } from '~/server/utils/accounting-ledger'

export default defineEventHandler(async (event) => {
  const profile = await requireAccountingAccess(event, { write: true })
  const supabase = getSupabaseAdmin()
  const id = event.context.params?.id
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID fehlt' })

  const { data: existing } = await supabase
    .from('accounting_accounts')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', profile.tenant_id)
    .single()
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Konto nicht gefunden' })

  const body = await readBody(event)
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (typeof body.name === 'string' && body.name.trim()) updates.name = body.name.trim()
  if (typeof body.number === 'string' && body.number.trim() && body.number.trim() !== existing.number) {
    if (existing.is_system || SYSTEM_ACCOUNT_NUMBERS.has(existing.number)) {
      throw createError({ statusCode: 403, statusMessage: 'Systemkonto-Nummer kann nicht geändert werden' })
    }
    updates.number = body.number.trim()
    updates.class = accountClassFromNumber(body.number.trim())
  }
  if (typeof body.is_active === 'boolean') {
    if (!body.is_active && (existing.is_system || SYSTEM_ACCOUNT_NUMBERS.has(existing.number))) {
      throw createError({ statusCode: 403, statusMessage: 'Systemkonto kann nicht deaktiviert werden' })
    }
    updates.is_active = body.is_active
  }
  if (body.type && ['asset', 'liability', 'equity', 'income', 'expense'].includes(body.type) && !existing.is_system) {
    updates.type = body.type
  }

  const { data, error } = await supabase
    .from('accounting_accounts')
    .update(updates)
    .eq('id', id)
    .eq('tenant_id', profile.tenant_id)
    .select()
    .single()
  if (error) {
    if (error.code === '23505') throw createError({ statusCode: 409, statusMessage: 'Kontonummer existiert bereits' })
    throw createError({ statusCode: 500, statusMessage: error.message })
  }
  return { success: true, data }
})
