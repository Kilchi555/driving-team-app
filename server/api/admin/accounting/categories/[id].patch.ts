import { defineEventHandler, readBody, createError } from 'h3'
import { requireAccountingAccess } from '~/server/utils/accountant-access'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const profile = await requireAccountingAccess(event, { write: true })
  const supabase = getSupabaseAdmin()
  const id = event.context.params?.id
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID fehlt' })

  const body = await readBody(event)
  if (!body.account_id) throw createError({ statusCode: 400, statusMessage: 'account_id fehlt' })

  const { data: account } = await supabase
    .from('accounting_accounts')
    .select('id')
    .eq('id', body.account_id)
    .eq('tenant_id', profile.tenant_id)
    .single()
  if (!account) throw createError({ statusCode: 404, statusMessage: 'Konto nicht gefunden' })

  const { data, error } = await supabase
    .from('accounting_categories')
    .update({ account_id: account.id })
    .eq('id', id)
    .eq('tenant_id', profile.tenant_id)
    .select()
    .single()
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { success: true, data }
})
