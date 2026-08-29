// API Endpoint: Redeem Voucher Code
// Description: Allows students to redeem voucher codes for credit top-up
// Supports two types:
//   1. voucher_codes table — admin-created promo codes (type='credit')
//   2. vouchers table — purchased gift cards from the shop

import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'
import { getAuthenticatedUser, requireAdminProfile } from '~/server/utils/auth'
import { incrementStudentCredit, redeemGiftCardForWallet, redeemPromoForWallet, VoucherRedeemError } from '~/server/utils/wallet-atomic'

export default defineEventHandler(async (event) => {
  try {
    logger.debug('🎫 [redeem] Handler started')
    
    const body = await readBody(event)
    const { code } = body

    if (!code || typeof code !== 'string') {
      throw createError({ statusCode: 400, message: 'Voucher code is required' })
    }

    const normalizedCode = code.trim().toUpperCase()
    logger.debug('🎫 [redeem] Redeeming voucher:', normalizedCode)

    // ── Auth ──────────────────────────────────────────────
    // Support both authenticated users AND guest users (from shop)
    // - Authenticated: auth.uid() exists
    // - Guest: user_id provided in body (created by find-or-create-guest-user)
    
    const authUser = await getAuthenticatedUser(event)
    const guestUserId = body.user_id // For guest checkout (passed from shop)
    const targetUserId = body.target_user_id // For staff redeeming on behalf of a student
    
    let userId: string
    let staffTenantId: string | null = null

    if (authUser && targetUserId && typeof targetUserId === 'string') {
      const staff = await requireAdminProfile(event, ['admin', 'staff', 'super_admin', 'tenant_admin'])
      userId = targetUserId
      staffTenantId = staff.role === 'super_admin' ? null : staff.tenant_id
      logger.debug('🎫 [redeem] Staff redeeming for student:', targetUserId)
    } else if (authUser) {
      // Authenticated user (student or staff for self)
      userId = authUser.db_user_id || authUser.id
      logger.debug('🎫 [redeem] Authenticated user:', userId)
    } else if (guestUserId && typeof guestUserId === 'string') {
      // Guest user from shop
      userId = guestUserId
      logger.debug('🎫 [redeem] Guest user:', userId)
    } else {
      throw createError({ statusCode: 401, message: 'Authentication required or guest user_id missing' })
    }

    const supabaseAdmin = getSupabaseAdmin()

    // Get user profile with tenant_id
    const { data: userProfile, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, tenant_id, first_name, last_name')
      .eq('id', userId)
      .single()

    if (userError || !userProfile) {
      throw createError({ statusCode: 404, message: 'User profile not found' })
    }

    if (staffTenantId && userProfile.tenant_id !== staffTenantId) {
      throw createError({ statusCode: 403, message: 'Forbidden – tenant mismatch' })
    }

    const now = new Date()

    // ── PATH A: voucher_codes table (admin promo codes) ────────────────────
    const { data: promoCode } = await supabaseAdmin
      .from('voucher_codes')
      .select('*')
      .eq('code', normalizedCode)
      .eq('tenant_id', userProfile.tenant_id)
      .eq('is_active', true)
      .maybeSingle()

    if (promoCode) {
      // Discount-type codes are applied at checkout, not redeemed for credit
      if (promoCode.type === 'discount') {
        throw createError({
          statusCode: 400,
          message: 'Dieser Code ist ein Rabattcode und kann nicht als Guthaben eingelöst werden. Bitte geben Sie ihn beim Bezahlen als Rabattcode ein.'
        })
      }

      if (promoCode.valid_from && new Date(promoCode.valid_from) > now) {
        throw createError({ statusCode: 400, message: `Dieser Gutschein ist erst ab ${new Date(promoCode.valid_from).toLocaleDateString('de-CH')} gültig` })
      }
      if (promoCode.valid_until && new Date(promoCode.valid_until) < now) {
        throw createError({ statusCode: 400, message: `Dieser Gutschein ist abgelaufen (gültig bis ${new Date(promoCode.valid_until).toLocaleDateString('de-CH')})` })
      }
      if (promoCode.current_redemptions >= promoCode.max_redemptions) {
        throw createError({ statusCode: 400, message: 'Dieser Gutschein wurde bereits vollständig eingelöst' })
      }

      const { data: existingRedemption } = await supabaseAdmin
        .from('voucher_redemptions')
        .select('id')
        .eq('voucher_id', promoCode.id)
        .eq('user_id', userProfile.id)
        .maybeSingle()

      if (existingRedemption) {
        throw createError({ statusCode: 400, message: 'Sie haben diesen Gutschein bereits eingelöst' })
      }

      return await applyCredit({
        supabaseAdmin,
        userProfile,
        creditAmountRappen: promoCode.credit_amount_rappen,
        code: promoCode.code,
        description: promoCode.description,
        alreadyCredited: await redeemPromoForWallet(supabaseAdmin, {
          userId: userProfile.id,
          tenantId: userProfile.tenant_id,
          voucherId: promoCode.id,
          amountRappen: promoCode.credit_amount_rappen,
        }),
      })
    }

    // ── PATH B: vouchers table (purchased gift cards from shop) ────────────
    const { data: giftCard } = await supabaseAdmin
      .from('vouchers')
      .select('*')
      .eq('code', normalizedCode)
      .eq('tenant_id', userProfile.tenant_id)
      .eq('is_active', true)
      .maybeSingle()

    if (giftCard) {
      if (giftCard.redeemed_at) {
        throw createError({ statusCode: 400, message: 'Dieser Gutschein wurde bereits eingelöst' })
      }
      if (
        giftCard.reserved_for_payment_id
        && giftCard.reserved_until
        && new Date(giftCard.reserved_until) > now
      ) {
        throw createError({
          statusCode: 409,
          message: 'Dieser Gutschein wird gerade in einer anderen Zahlung verwendet. Warte, bis die Zahlung abgeschlossen oder abgebrochen ist.',
        })
      }
      if (giftCard.valid_until && new Date(giftCard.valid_until) < now) {
        throw createError({ statusCode: 400, message: `Dieser Gutschein ist abgelaufen (gültig bis ${new Date(giftCard.valid_until).toLocaleDateString('de-CH')})` })
      }

      const credited = await redeemGiftCardForWallet(supabaseAdmin, {
        userId: userProfile.id,
        tenantId: userProfile.tenant_id,
        code: giftCard.code,
      })
      return await applyCredit({
        supabaseAdmin,
        userProfile,
        creditAmountRappen: credited.amount_rappen,
        code: giftCard.code,
        description: giftCard.description || giftCard.name,
        alreadyCredited: { old_balance: credited.old_balance, new_balance: credited.new_balance },
      })
    }

    // Not found in either table
    throw createError({ statusCode: 404, message: 'Ungültiger Gutschein-Code' })

  } catch (error: any) {
    console.error('❌ Error redeeming voucher:', error)
    if (error instanceof VoucherRedeemError) {
      throw createError({ statusCode: 400, message: error.message })
    }
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      message: error.message || 'Ein Fehler ist beim Einlösen des Gutscheins aufgetreten'
    })
  }
})

// ── Shared credit application logic ───────────────────────────────────────
async function applyCredit({
  supabaseAdmin,
  userProfile,
  creditAmountRappen,
  code,
  description,
  alreadyCredited,
}: {
  supabaseAdmin: any
  userProfile: { id: string; tenant_id: string }
  creditAmountRappen: number
  code: string
  description?: string
  alreadyCredited?: { old_balance: number; new_balance: number }
}) {
  const credited = alreadyCredited || await incrementStudentCredit(supabaseAdmin, {
    userId: userProfile.id,
    tenantId: userProfile.tenant_id,
    amountRappen: creditAmountRappen,
  }).then(row => ({ old_balance: row.balance_rappen - creditAmountRappen, new_balance: row.balance_rappen }))
  const newBalance = credited.new_balance
  const oldBalance = credited.old_balance

  const { error: txError } = await supabaseAdmin
    .from('credit_transactions')
    .insert({
      user_id: userProfile.id,
      transaction_type: 'voucher',
      amount_rappen: creditAmountRappen,
      balance_before_rappen: oldBalance,
      balance_after_rappen: newBalance,
      payment_method: 'voucher',
      reference_type: 'voucher',
      created_by: userProfile.id,
      notes: `Gutschein eingelöst: ${code}${description ? ` - ${description}` : ''}`,
      tenant_id: userProfile.tenant_id
    })

  if (txError) {
    logger.warn('⚠️ Credit transaction log failed after redeem (wallet already credited)', txError)
  }

  logger.debug('✅ Voucher redeemed:', { code, creditAmountRappen, newBalance })

  return {
    success: true,
    message: `Gutschein erfolgreich eingelöst! CHF ${(creditAmountRappen / 100).toFixed(2)} wurden Ihrem Guthaben gutgeschrieben.`,
    voucher: { code, description, credit_amount_chf: (creditAmountRappen / 100).toFixed(2) },
    credit: {
      old_balance_chf: (oldBalance / 100).toFixed(2),
      new_balance_chf: (newBalance / 100).toFixed(2),
      added_chf: (creditAmountRappen / 100).toFixed(2)
    }
  }
}
