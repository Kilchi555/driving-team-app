// server/api/voucher-codes/manage.post.ts
// Admin CRUD for voucher_codes (credit codes + discount codes)

import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const supabase = getSupabaseAdmin()
  const user = await getAuthenticatedUser(event)
  if (!user || !['admin', 'tenant_admin', 'staff'].includes(user.role)) {
    throw createError({ statusCode: 403, statusMessage: 'Keine Berechtigung' })
  }

  const body = await readBody(event)
  const { action } = body

  // ── LIST ──────────────────────────────────────────────
  if (action === 'list') {
    const { data, error } = await supabase
      .from('voucher_codes')
      .select('*')
      .eq('tenant_id', user.tenant_id)
      .order('created_at', { ascending: false })

    if (error) throw createError({ statusCode: 500, statusMessage: error.message })
    return data || []
  }

  // ── CREATE ────────────────────────────────────────────
  if (action === 'create') {
    const { code, description, type, credit_amount_rappen, discount_type, discount_value, max_discount_rappen,
            valid_from, valid_until, max_redemptions, max_usage_per_user, allowed_categories, is_active } = body

    if (!code?.trim()) throw createError({ statusCode: 400, statusMessage: 'Code erforderlich' })

    // Check uniqueness within tenant
    const { data: existing } = await supabase
      .from('voucher_codes')
      .select('id')
      .eq('code', code.trim().toUpperCase())
      .eq('tenant_id', user.tenant_id)
      .maybeSingle()

    if (existing) throw createError({ statusCode: 409, statusMessage: 'Code existiert bereits' })

    const insertData: any = {
      code: code.trim().toUpperCase(),
      description: description || null,
      type: type || 'credit',
      credit_amount_rappen: type === 'credit' ? (credit_amount_rappen || 0) : 0,
      valid_from: valid_from || new Date().toISOString(),
      valid_until: valid_until || null,
      max_redemptions: max_redemptions || 1,
      max_usage_per_user: max_usage_per_user || null,
      allowed_categories: allowed_categories?.length ? allowed_categories : null,
      is_active: is_active !== false,
      tenant_id: user.tenant_id,
      created_by: user.id,
    }

    if (type === 'discount') {
      insertData.discount_type = discount_type || 'fixed'
      insertData.discount_value = discount_value || 0
      insertData.max_discount_rappen = max_discount_rappen || null
    }

    const { data, error } = await supabase
      .from('voucher_codes')
      .insert(insertData)
      .select()
      .single()

    if (error) throw createError({ statusCode: 500, statusMessage: error.message })
    return data
  }

  // ── UPDATE ────────────────────────────────────────────
  if (action === 'update') {
    const { id, ...updates } = body
    if (!id) throw createError({ statusCode: 400, statusMessage: 'ID erforderlich' })

    // Ensure tenant ownership
    const { data: existing } = await supabase
      .from('voucher_codes')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', user.tenant_id)
      .maybeSingle()

    if (!existing) throw createError({ statusCode: 404, statusMessage: 'Code nicht gefunden' })

    delete updates.action
    delete updates.tenant_id
    delete updates.created_by

    const { data, error } = await supabase
      .from('voucher_codes')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw createError({ statusCode: 500, statusMessage: error.message })
    return data
  }

  // ── DELETE ────────────────────────────────────────────
  if (action === 'delete') {
    const { id } = body
    if (!id) throw createError({ statusCode: 400, statusMessage: 'ID erforderlich' })

    const { error } = await supabase
      .from('voucher_codes')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', user.tenant_id)

    if (error) throw createError({ statusCode: 500, statusMessage: error.message })
    return { success: true }
  }

  // ── REDEMPTIONS ───────────────────────────────────────
  if (action === 'redemptions') {
    const { voucher_id } = body
    const { data, error } = await supabase
      .from('voucher_redemptions')
      .select('*, users(first_name, last_name, email)')
      .eq('voucher_id', voucher_id)
      .order('redeemed_at', { ascending: false })

    if (error) throw createError({ statusCode: 500, statusMessage: error.message })
    return data || []
  }

  throw createError({ statusCode: 400, statusMessage: 'Ungültige Aktion' })
})
