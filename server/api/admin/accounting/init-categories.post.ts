import { defineEventHandler, createError } from 'h3'
import { requireAccountingAccess } from '~/server/utils/accountant-access'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { DEFAULT_ACCOUNTING_CATEGORIES } from '~/server/utils/accounting'

export default defineEventHandler(async (event) => {
  const profile = await requireAccountingAccess(event)
  const supabase = getSupabaseAdmin()

  const { data: existing, error: existingError } = await supabase
    .from('accounting_categories')
    .select('name, type')
    .eq('tenant_id', profile.tenant_id)

  if (existingError) throw createError({ statusCode: 500, statusMessage: existingError.message })

  const have = new Set((existing ?? []).map(c => `${c.type}:${c.name}`))
  const missing = DEFAULT_ACCOUNTING_CATEGORIES.filter(c => !have.has(`${c.type}:${c.name}`))

  let created = 0
  if (missing.length > 0) {
    const { data, error } = await supabase
      .from('accounting_categories')
      .insert(missing.map(c => ({ ...c, tenant_id: profile.tenant_id })))
      .select()
    if (error) throw createError({ statusCode: 500, statusMessage: error.message })
    created = data?.length ?? 0
  }

  const { data: incomeCats } = await supabase
    .from('accounting_categories')
    .select('id, name')
    .eq('tenant_id', profile.tenant_id)
    .eq('type', 'income')

  const termineId = incomeCats?.find(c => c.name === 'Termine')?.id
  if (termineId) {
    await supabase
      .from('accounting_entries')
      .update({ category_id: termineId })
      .eq('tenant_id', profile.tenant_id)
      .is('category_id', null)
      .not('linked_payment_id', 'is', null)
      .eq('type', 'income')
  }

  return { success: true, created }
})
