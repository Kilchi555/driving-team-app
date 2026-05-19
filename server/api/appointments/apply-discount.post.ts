import { defineEventHandler, createError, readBody } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { logger } from '~/utils/logger'
import { roundToNearest5Rappen } from '~/utils/rounding'

/**
 * POST /api/appointments/apply-discount
 * Applies a discount code to an existing pending payment.
 * Updates both `payments` and `appointments` tables.
 */
export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { paymentId, code } = body

    if (!paymentId || !code) {
      throw createError({ statusCode: 400, statusMessage: 'paymentId and code are required' })
    }

    const authUser = await getAuthenticatedUser(event)
    if (!authUser) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    const supabase = getSupabaseAdmin()

    // Load user profile
    const { data: userProfile } = await supabase
      .from('users')
      .select('id, tenant_id, role')
      .eq('auth_user_id', authUser.id)
      .single()

    if (!userProfile) {
      throw createError({ statusCode: 404, statusMessage: 'User profile not found' })
    }
    if (userProfile.role !== 'client') {
      throw createError({ statusCode: 403, statusMessage: 'Nur Kunden können Rabattcodes anwenden' })
    }

    const tenantId = userProfile.tenant_id

    // Load payment – verify it belongs to the user and is still pending
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('id, user_id, appointment_id, lesson_price_rappen, admin_fee_rappen, products_price_rappen, credit_used_rappen, discount_amount_rappen, total_amount_rappen, payment_status, tenant_id, metadata')
      .eq('id', paymentId)
      .eq('user_id', userProfile.id)
      .eq('tenant_id', tenantId)
      .single()

    if (paymentError || !payment) {
      throw createError({ statusCode: 404, statusMessage: 'Zahlung nicht gefunden' })
    }
    if (payment.payment_status !== 'pending') {
      throw createError({ statusCode: 409, statusMessage: 'Rabattcode kann nur auf offene Zahlungen angewendet werden' })
    }
    if (payment.discount_amount_rappen > 0) {
      throw createError({ statusCode: 409, statusMessage: 'Auf diese Zahlung wurde bereits ein Rabatt angewendet' })
    }

    // ── Determine payment type ────────────────────────────────────────────────
    const meta = typeof payment.metadata === 'string'
      ? (() => { try { return JSON.parse(payment.metadata) } catch { return {} } })()
      : (payment.metadata || {})

    const isTopup = !!meta.is_topup
    const isLessonPayment = !isTopup && !!payment.appointment_id
    const isProductPayment = !isTopup && !payment.appointment_id &&
                             (payment.products_price_rappen || 0) > 0

    if (isTopup) {
      return { isValid: false, error: 'Rabattcodes können nicht auf Guthaben-Aufladungen angewendet werden' }
    }

    // The gross amount to calculate the discount against (lesson + fee + products)
    const grossRappen = (payment.lesson_price_rappen || 0) +
                        (payment.admin_fee_rappen || 0) +
                        (payment.products_price_rappen || 0)

    // ── Validate the discount code (same logic as validate.post.ts) ──────────
    let discountAmountRappen = 0
    let discountCode: string | null = null

    // 1. Try voucher_codes
    const { data: voucherData } = await supabase
      .from('voucher_codes')
      .select('*')
      .ilike('code', code)
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .maybeSingle()

    if (voucherData) {
      const now = new Date()
      const validUntil = voucherData.valid_until ? new Date(voucherData.valid_until) : null
      const validFrom = new Date(voucherData.valid_from)

      if (now < validFrom || (validUntil && now > validUntil)) {
        return { isValid: false, error: 'Gutschein ist nicht gültig' }
      }
      if (voucherData.max_redemptions && voucherData.current_redemptions >= voucherData.max_redemptions) {
        return { isValid: false, error: 'Gutschein hat das Nutzungslimit erreicht' }
      }
      if (!voucherData.type || voucherData.type === 'credit') {
        return { isValid: false, error: 'Dieser Code ist ein Guthaben-Gutschein. Bitte lösen Sie ihn unter "Guthaben" → "Code einlösen" ein.' }
      }

      // applies_to check (default: 'appointments')
      const appliesTo = voucherData.applies_to || 'appointments'
      if (appliesTo !== 'all') {
        if (appliesTo === 'appointments' && !isLessonPayment) {
          return { isValid: false, error: 'Dieser Code gilt nur für Fahrstunden-Buchungen' }
        }
        if (appliesTo === 'products' && !isProductPayment) {
          return { isValid: false, error: 'Dieser Code gilt nur für Produktkäufe' }
        }
      }

      if (voucherData.discount_type === 'percentage') {
        discountAmountRappen = Math.round((grossRappen * voucherData.discount_value) / 100)
        if (voucherData.max_discount_rappen) {
          discountAmountRappen = Math.min(discountAmountRappen, voucherData.max_discount_rappen)
        }
      } else if (voucherData.discount_type === 'fixed') {
        discountAmountRappen = voucherData.discount_value || 0
      }
      discountAmountRappen = Math.min(discountAmountRappen, grossRappen)
      discountCode = voucherData.code

      // Increment usage
      supabase.from('voucher_codes').update({
        current_redemptions: (voucherData.current_redemptions || 0) + 1
      }).eq('id', voucherData.id).then(() => {})
    }

    // 2. Try vouchers (gift cards)
    if (!discountCode) {
      const { data: giftCard } = await supabase
        .from('vouchers')
        .select('*')
        .ilike('code', code)
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .maybeSingle()

      if (giftCard) {
        if (giftCard.redeemed_at) {
          return { isValid: false, error: 'Dieser Gutschein wurde bereits eingelöst' }
        }
        if (giftCard.valid_until && new Date(giftCard.valid_until) < new Date()) {
          return { isValid: false, error: 'Dieser Gutschein ist abgelaufen' }
        }
        discountAmountRappen = Math.min(giftCard.amount_rappen, grossRappen)
        discountCode = giftCard.code
      }
    }

    // 3. Try discounts table
    if (!discountCode) {
      const { data: discountData } = await supabase
        .from('discounts')
        .select('*')
        .ilike('code', code)
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .maybeSingle()

      if (!discountData) {
        return { isValid: false, error: 'Gutscheincode nicht gefunden' }
      }

      const now = new Date()
      const validFrom = new Date(discountData.valid_from)
      const validUntil = discountData.valid_until ? new Date(discountData.valid_until) : null

      if (now < validFrom || (validUntil && now > validUntil)) {
        return { isValid: false, error: 'Gutschein ist nicht gültig' }
      }
      if (grossRappen < discountData.min_amount_rappen) {
        return { isValid: false, error: `Mindestbetrag von CHF ${(discountData.min_amount_rappen / 100).toFixed(2)} nicht erreicht` }
      }
      if (discountData.usage_limit && discountData.usage_count >= discountData.usage_limit) {
        return { isValid: false, error: 'Gutschein wurde bereits maximal genutzt' }
      }

      // applies_to check (default: 'appointments' – falls Feld nicht gesetzt)
      const appliesTo = discountData.applies_to || 'appointments'
      if (appliesTo !== 'all') {
        if (appliesTo === 'appointments' && !isLessonPayment) {
          return { isValid: false, error: 'Dieser Code gilt nur für Fahrstunden-Buchungen' }
        }
        if (appliesTo === 'products' && !isProductPayment) {
          return { isValid: false, error: 'Dieser Code gilt nur für Produktkäufe' }
        }
      }

      if (discountData.first_lesson_only) {
        const { count } = await supabase
          .from('appointments')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userProfile.id)
          .eq('tenant_id', tenantId)
          .in('status', ['confirmed', 'completed'])

        if ((count ?? 0) > 1) {
          // > 1 because the current appointment already exists as confirmed
          return { isValid: false, error: 'Dieser Code gilt nur für die erste Fahrstunde' }
        }
      }

      switch (discountData.discount_type) {
        case 'percentage':
          discountAmountRappen = Math.round((grossRappen * discountData.discount_value) / 100)
          break
        case 'fixed':
          discountAmountRappen = Math.round(discountData.discount_value * 100)
          break
        case 'free_lesson':
        case 'free_product':
          discountAmountRappen = grossRappen
          break
      }
      if (discountData.max_discount_rappen && discountAmountRappen > discountData.max_discount_rappen) {
        discountAmountRappen = discountData.max_discount_rappen
      }
      discountAmountRappen = Math.min(discountAmountRappen, grossRappen)
      discountCode = discountData.code

      // Increment usage count
      supabase.from('discounts').update({
        usage_count: (discountData.usage_count || 0) + 1
      }).eq('id', discountData.id).then(() => {})
    }

    if (!discountCode || discountAmountRappen <= 0) {
      return { isValid: false, error: 'Ungültiger Rabattcode' }
    }

    // ── Recalculate totals ────────────────────────────────────────────────────
    const newTotal = roundToNearest5Rappen(
      Math.max(0, grossRappen - discountAmountRappen - (payment.credit_used_rappen || 0))
    )

    // ── Persist changes ───────────────────────────────────────────────────────
    // Check if this is a Dauerrabatt (auto_apply) — register it for the user automatically
    let isAutoApply = false
    const discountRecord = await supabase
      .from('discounts')
      .select('id, auto_apply, valid_until, first_lesson_only')
      .ilike('code', discountCode)
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .maybeSingle()

    if (discountRecord.data?.auto_apply && !discountRecord.data.first_lesson_only) {
      isAutoApply = true
      // Register silently – ignore if already registered
      const { data: existingUdc } = await supabase
        .from('user_discount_codes')
        .select('id, is_active')
        .eq('user_id', userProfile.id)
        .eq('tenant_id', tenantId)
        .ilike('code', discountCode)
        .maybeSingle()

      if (!existingUdc) {
        await supabase.from('user_discount_codes').insert({
          user_id: userProfile.id,
          tenant_id: tenantId,
          code: discountCode.toUpperCase(),
          discount_id: discountRecord.data.id,
          expires_at: discountRecord.data.valid_until ?? null,
        })
      } else if (!existingUdc.is_active) {
        await supabase.from('user_discount_codes')
          .update({ is_active: true })
          .eq('id', existingUdc.id)
      }
    }

    const [paymentUpdate, appointmentUpdate] = await Promise.all([
      supabase
        .from('payments')
        .update({
          discount_amount_rappen: discountAmountRappen,
          total_amount_rappen: newTotal
        })
        .eq('id', paymentId),

      payment.appointment_id
        ? supabase
            .from('appointments')
            .update({
              discount_amount_rappen: discountAmountRappen,
              discount_code: discountCode
            })
            .eq('id', payment.appointment_id)
        : Promise.resolve({ error: null })
    ])

    if (paymentUpdate.error) {
      logger.error('❌ Failed to update payment with discount:', paymentUpdate.error)
      throw createError({ statusCode: 500, statusMessage: 'Fehler beim Speichern des Rabatts' })
    }

    logger.debug('✅ Discount applied:', { paymentId, code: discountCode, discountAmountRappen, newTotal })

    return {
      isValid: true,
      discount_amount_rappen: discountAmountRappen,
      new_total_rappen: newTotal,
      code: discountCode,
      isAutoApply,
    }
  } catch (err: any) {
    logger.error('❌ Error in POST /api/appointments/apply-discount:', err.message)
    throw createError({
      statusCode: err.statusCode || 500,
      statusMessage: err.statusMessage || 'Fehler beim Anwenden des Rabatts'
    })
  }
})
