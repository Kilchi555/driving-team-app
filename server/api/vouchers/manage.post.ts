// server/api/vouchers/manage.post.ts
// F-04: session ownership + tenant isolation — never trust body userId/tenant_id alone.
import { createError, readBody, defineEventHandler } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'
import { getAuthenticatedUserWithDbId } from '~/server/utils/auth'

const STAFF_ROLES = new Set(['admin', 'staff', 'super_admin', 'tenant_admin'])

const CREATE_ALLOWLIST = [
  'name',
  'code',
  'discount_type',
  'discount_value',
  'max_discount_rappen',
  'remaining_amount_rappen',
  'min_amount_rappen',
  'usage_limit',
  'usage_count',
  'is_active',
  'is_voucher',
  'voucher_recipient_name',
  'voucher_recipient_email',
  'voucher_buyer_name',
  'voucher_buyer_email',
  'payment_id',
  'applies_to',
  'valid_until',
  'description',
] as const

interface ManageVouchersBody {
  action: 'load' | 'create' | 'find-by-code' | 'redeem'
  userId?: string
  voucherData?: Record<string, unknown>
  code?: string
  voucherId?: string
}

function generateVoucherCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let out = ''
  for (let i = 0; i < 10; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return out
}

function pickAllowedCreateFields(input: Record<string, unknown>) {
  const out: Record<string, unknown> = {}
  for (const key of CREATE_ALLOWLIST) {
    if (Object.prototype.hasOwnProperty.call(input, key) && input[key] !== undefined) {
      out[key] = input[key]
    }
  }
  return out
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody<ManageVouchersBody>(event)
    const action = body?.action

    if (!action) {
      throw createError({ statusCode: 400, statusMessage: 'action required' })
    }

    logger.debug('🎫 Vouchers action:', action)

    const user = await getAuthenticatedUserWithDbId(event)
    if (!user?.id || !user.tenant_id) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    const dbUserId = user.id
    const tenantId = user.tenant_id
    const role = String(user.role || '')
    const isStaff = STAFF_ROLES.has(role)
    const supabaseAdmin = getSupabaseAdmin()

    // ========== LOAD VOUCHERS ==========
    if (action === 'load') {
      let targetUserId = dbUserId

      if (body.userId && body.userId !== dbUserId) {
        if (!isStaff) {
          throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
        }
        const { data: target, error: targetError } = await supabaseAdmin
          .from('users')
          .select('id, tenant_id')
          .eq('id', body.userId)
          .maybeSingle()

        if (targetError || !target?.id || target.tenant_id !== tenantId) {
          throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
        }
        targetUserId = target.id
      }

      logger.debug('📋 Loading vouchers for user:', targetUserId)

      const { data: vouchers, error } = await supabaseAdmin
        .from('discounts')
        .select('*')
        .eq('user_id', targetUserId)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })

      if (error) {
        throw createError({ statusCode: 500, statusMessage: error.message })
      }

      return { success: true, data: vouchers || [] }
    }

    // ========== FIND BY CODE ==========
    if (action === 'find-by-code') {
      if (!body.code || typeof body.code !== 'string') {
        throw createError({ statusCode: 400, statusMessage: 'Code required' })
      }

      const code = body.code.trim()
      logger.debug('🔍 Finding voucher by code in tenant:', tenantId)

      const { data: voucher, error } = await supabaseAdmin
        .from('discounts')
        .select('*')
        .eq('code', code)
        .eq('tenant_id', tenantId)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') {
        throw createError({ statusCode: 500, statusMessage: error.message })
      }

      return { success: true, data: voucher || null }
    }

    // ========== CREATE VOUCHER ==========
    // F-04 invariant: customers must not mint unpaid discounts via this endpoint.
    // Paid issuance stays on /api/vouchers/create-after-purchase (internal secret).
    if (action === 'create') {
      if (!isStaff) {
        throw createError({
          statusCode: 403,
          statusMessage: 'Forbidden — voucher create requires staff role',
        })
      }

      if (!body.voucherData || typeof body.voucherData !== 'object') {
        throw createError({ statusCode: 400, statusMessage: 'Voucher data required' })
      }

      const raw = body.voucherData
      const requestedOwnerId =
        typeof raw.user_id === 'string' && raw.user_id.trim() ? raw.user_id.trim() : dbUserId

      let ownerUserId = dbUserId
      if (requestedOwnerId !== dbUserId) {
        const { data: owner, error: ownerError } = await supabaseAdmin
          .from('users')
          .select('id, tenant_id')
          .eq('id', requestedOwnerId)
          .maybeSingle()
        if (ownerError || !owner?.id || owner.tenant_id !== tenantId) {
          throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
        }
        ownerUserId = owner.id
      }

      const allowed = pickAllowedCreateFields(raw)

      const code =
        typeof allowed.code === 'string' && allowed.code.trim()
          ? allowed.code.trim()
          : generateVoucherCode()

      const insertRow = {
        ...allowed,
        code,
        user_id: ownerUserId,
        tenant_id: tenantId,
        discount_type: allowed.discount_type || 'fixed',
        usage_count: typeof allowed.usage_count === 'number' ? allowed.usage_count : 0,
        is_active: allowed.is_active !== false,
        is_voucher: allowed.is_voucher !== false,
      }

      logger.debug('➕ Creating voucher for user/tenant:', { ownerUserId, tenantId })

      const { data: created, error } = await supabaseAdmin
        .from('discounts')
        .insert([insertRow])
        .select()
        .single()

      if (error) {
        throw createError({ statusCode: 500, statusMessage: error.message })
      }

      return { success: true, data: created }
    }

    // ========== REDEEM VOUCHER ==========
    if (action === 'redeem') {
      if (!body.voucherId || typeof body.voucherId !== 'string') {
        throw createError({ statusCode: 400, statusMessage: 'Voucher ID required' })
      }

      logger.debug('🎁 Redeeming voucher:', body.voucherId)

      const { data: voucher, error: fetchError } = await supabaseAdmin
        .from('discounts')
        .select('*')
        .eq('id', body.voucherId)
        .eq('tenant_id', tenantId)
        .maybeSingle()

      if (fetchError || !voucher) {
        throw createError({ statusCode: 404, statusMessage: 'Voucher not found' })
      }

      if (!isStaff && voucher.user_id && voucher.user_id !== dbUserId) {
        throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
      }

      const { data: redeemed, error: updateError } = await supabaseAdmin
        .from('discounts')
        .update({ is_used: true, used_at: new Date().toISOString() })
        .eq('id', body.voucherId)
        .eq('tenant_id', tenantId)
        .select()
        .single()

      if (updateError) {
        throw createError({ statusCode: 500, statusMessage: updateError.message })
      }

      return { success: true, data: redeemed }
    }

    throw createError({ statusCode: 400, statusMessage: 'Unknown action: ' + action })
  } catch (error: any) {
    if (error?.statusCode) throw error
    logger.error('❌ Error managing vouchers:', error)
    throw createError({
      statusCode: 500,
      statusMessage: error?.message || 'Failed to manage vouchers',
    })
  }
})
