import { defineEventHandler, readBody, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const supabase = getSupabaseAdmin()
  const body = await readBody(event)

  const { action, id, name, type, color, vat_rate } = body

  if (action === 'delete' && id) {
    const { error } = await supabase
      .from('accounting_categories')
      .update({ is_active: false })
      .eq('id', id)
      .eq('tenant_id', profile.tenant_id)
    if (error) throw createError({ statusCode: 500, statusMessage: error.message })
    return { success: true }
  }

  if (action === 'update' && id) {
    const { data, error } = await supabase
      .from('accounting_categories')
      .update({ name, color, vat_rate: vat_rate ?? null })
      .eq('id', id)
      .eq('tenant_id', profile.tenant_id)
      .select()
      .single()
    if (error) throw createError({ statusCode: 500, statusMessage: error.message })
    return { success: true, data }
  }

  // Create
  if (!name || !type) throw createError({ statusCode: 400, statusMessage: 'name und type sind erforderlich' })
  if (!['income', 'expense'].includes(type)) throw createError({ statusCode: 400, statusMessage: 'type muss income oder expense sein' })

  const { data, error } = await supabase
    .from('accounting_categories')
    .insert({
      name,
      type,
      color: color ?? '#6366f1',
      vat_rate: vat_rate ?? null,
      tenant_id: profile.tenant_id,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') throw createError({ statusCode: 409, statusMessage: 'Kategorie existiert bereits' })
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return { success: true, data }
})
