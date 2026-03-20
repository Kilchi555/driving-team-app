// server/api/vouchers/lookup.post.ts
// Purpose: Allow anonymous users to lookup voucher code information (non-sensitive data only)
// Security: 
//   - No authentication required (safe for shop checkout)
//   - Returns only metadata: code, name, amount, validity info
//   - Does NOT return tenant_id or sensitive internal data
//   - Rate-limited via Supabase (can add explicit rate limiting if needed)

import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseClient } from '~/server/utils/supabase'
import { logger } from '~/utils/logger'

interface LookupResponse {
  found: boolean
  type?: 'promo' | 'gift_card'
  code?: string
  name?: string
  description?: string
  amount_chf?: string
  valid_until?: string
  message?: string
}

export default defineEventHandler(async (event): Promise<LookupResponse> => {
  try {
    const body = await readBody(event)
    const { code, tenant_id } = body

    if (!code || typeof code !== 'string') {
      throw createError({ statusCode: 400, message: 'Voucher code is required' })
    }

    if (!tenant_id || typeof tenant_id !== 'string') {
      throw createError({ statusCode: 400, message: 'Tenant ID is required' })
    }

    const normalizedCode = code.trim().toUpperCase()
    logger.debug('🎫 [lookup] Anonymous voucher lookup:', { normalizedCode, tenant_id })

    // Use anon client (respects RLS policies)
    const supabase = getSupabaseClient()

    const now = new Date()

    // ── PATH A: Check voucher_codes table (admin promo codes) ────────────────
    const { data: promoCode } = await supabase
      .from('voucher_codes')
      .select('code, description, credit_amount_rappen, valid_until')
      .eq('code', normalizedCode)
      .eq('tenant_id', tenant_id)
      .eq('is_active', true)
      .maybeSingle()

    if (promoCode) {
      if (promoCode.valid_until && new Date(promoCode.valid_until) < now) {
        return {
          found: false,
          message: 'Dieser Gutschein ist abgelaufen'
        }
      }

      logger.debug('✅ [lookup] Found promo code:', normalizedCode)
      return {
        found: true,
        type: 'promo',
        code: promoCode.code,
        name: 'Guthaben-Gutschein',
        description: promoCode.description || 'Guthaben einlösen',
        amount_chf: (promoCode.credit_amount_rappen / 100).toFixed(2),
        valid_until: promoCode.valid_until ? new Date(promoCode.valid_until).toLocaleDateString('de-CH') : undefined
      }
    }

    // ── PATH B: Check vouchers table (purchased gift cards from shop) ───────
    const { data: giftCard } = await supabase
      .from('vouchers')
      .select('code, name, description, amount_rappen, valid_until, redeemed_at')
      .eq('code', normalizedCode)
      .eq('tenant_id', tenant_id)
      .eq('is_active', true)
      .maybeSingle()

    if (giftCard) {
      // Check if already redeemed
      if (giftCard.redeemed_at) {
        return {
          found: false,
          message: 'Dieser Gutschein wurde bereits eingelöst'
        }
      }

      // Check if expired
      if (giftCard.valid_until && new Date(giftCard.valid_until) < now) {
        return {
          found: false,
          message: 'Dieser Gutschein ist abgelaufen'
        }
      }

      logger.debug('✅ [lookup] Found gift card:', normalizedCode)
      return {
        found: true,
        type: 'gift_card',
        code: giftCard.code,
        name: giftCard.name || 'Geschenkgutschein',
        description: giftCard.description || 'Guthaben einlösen',
        amount_chf: (giftCard.amount_rappen / 100).toFixed(2),
        valid_until: giftCard.valid_until ? new Date(giftCard.valid_until).toLocaleDateString('de-CH') : undefined
      }
    }

    logger.debug('❌ [lookup] Voucher not found:', normalizedCode)
    return {
      found: false,
      message: 'Ungültiger Gutschein-Code'
    }

  } catch (error: any) {
    console.error('❌ Error looking up voucher:', error)
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      message: error.message || 'Ein Fehler ist beim Abfragen des Gutscheins aufgetreten'
    })
  }
})
