import { defineEventHandler, readBody, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const supabase = getSupabaseAdmin()
  const body = await readBody(event)

  const { id, code, description, credit_amount_rappen, valid_from, valid_until, max_redemptions, is_active } = body

  if (!code || credit_amount_rappen == null) {
    throw createError({ statusCode: 400, statusMessage: 'code and credit_amount_rappen are required' })
  }

  const voucherData = {
    code: String(code).toUpperCase(),
    description: description || null,
    credit_amount_rappen: Number(credit_amount_rappen),
    valid_from: valid_from || new Date().toISOString(),
    valid_until: valid_until || null,
    max_redemptions: max_redemptions ?? 1,
    is_active: is_active ?? true,
    created_by: profile.id,
    tenant_id: profile.tenant_id
  }

  if (id) {
    // Update existing voucher
    const { error } = await supabase
      .from('voucher_codes')
      .update(voucherData)
      .eq('id', id)
      .eq('tenant_id', profile.tenant_id)

    if (error) throw createError({ statusCode: 500, statusMessage: error.message })

    return { success: true, action: 'updated' }
  } else {
    // Create new voucher
    const { data, error } = await supabase
      .from('voucher_codes')
      .insert(voucherData)
      .select()
      .single()

    if (error) throw createError({ statusCode: 500, statusMessage: error.message })

    return { success: true, action: 'created', data }
  }
})
