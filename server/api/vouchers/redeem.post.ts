// server/api/vouchers/redeem.post.ts
// Gutschein-Einlösung mit Termin-Zuordnung

import { getSupabase } from '~/utils/supabase'

interface RedeemVoucherRequest {
  voucherCode: string
  appointmentId?: string
  redeemerId: string
  redeemerName?: string
}

interface RedeemVoucherResponse {
  success: boolean
  message?: string
  voucher?: {
    id: string
    code: string
    name: string
    amount_chf: number
    redeemed_at: string
    redeemed_for?: string
    redeemed_by: string
  }
  error?: string
}

export default defineEventHandler(async (event): Promise<RedeemVoucherResponse> => {
  try {
    const { voucherCode, appointmentId, redeemerId, redeemerName }: RedeemVoucherRequest = await readBody(event)
    
    if (!voucherCode || !redeemerId) {
      throw new Error('Voucher code and redeemer ID are required')
    }

    console.log('🎁 Redeeming voucher:', { voucherCode, appointmentId, redeemerId })

    const supabase = getSupabase()
    
    // Finde den Gutschein
    const { data: voucher, error: voucherError } = await supabase
      .from('discounts')
      .select(`
        id,
        code,
        name,
        discount_value,
        max_discount_rappen,
        remaining_amount_rappen,
        usage_count,
        is_active,
        valid_until,
        voucher_recipient_name,
        voucher_recipient_email,
        redeemed_at,
        redeemed_by,
        redeemed_for,
        created_at
      `)
      .eq('code', voucherCode)
      .eq('is_voucher', true)
      .single()

    if (voucherError || !voucher) {
      return {
        success: false,
        error: 'Gutschein nicht gefunden'
      }
    }

    // Validiere Gutschein
    const now = new Date()
    const validUntil = voucher.valid_until ? new Date(voucher.valid_until) : null
    
    if (!voucher.is_active) {
      return {
        success: false,
        error: 'Gutschein ist nicht aktiv'
      }
    }

    if (voucher.usage_count > 0) {
      return {
        success: false,
        error: 'Gutschein wurde bereits eingelöst'
      }
    }

    if (validUntil && now > validUntil) {
      return {
        success: false,
        error: 'Gutschein ist abgelaufen'
      }
    }

    // Löse Gutschein ein
    const { data: updatedVoucher, error: redeemError } = await supabase
      .from('discounts')
      .update({
        usage_count: 1,
        redeemed_at: now.toISOString(),
        redeemed_by: redeemerId,
        redeemed_for: appointmentId || null,
        is_active: false,
        remaining_amount_rappen: 0,
        updated_at: now.toISOString()
      })
      .eq('id', voucher.id)
      .select()
      .single()

    if (redeemError) {
      console.error('❌ Error redeeming voucher:', redeemError)
      return {
        success: false,
        error: 'Fehler beim Einlösen des Gutscheins'
      }
    }

    // Log die Einlösung für Audit-Zwecke
    console.log('✅ Voucher redeemed successfully:', {
      voucherCode: updatedVoucher.code,
      voucherId: updatedVoucher.id,
      amount: updatedVoucher.discount_value,
      appointmentId,
      redeemerId,
      redeemedAt: updatedVoucher.redeemed_at,
      redeemedBy: updatedVoucher.redeemed_by,
      redeemedFor: updatedVoucher.redeemed_for
    })

    const redemptionMessage = appointmentId 
      ? `Gutschein erfolgreich für Termin ${appointmentId} eingelöst`
      : 'Gutschein erfolgreich eingelöst'

    return {
      success: true,
      message: redemptionMessage,
      voucher: {
        id: updatedVoucher.id,
        code: updatedVoucher.code,
        name: updatedVoucher.name,
        amount_chf: updatedVoucher.discount_value,
        redeemed_at: updatedVoucher.redeemed_at,
        redeemed_for: updatedVoucher.redeemed_for,
        redeemed_by: updatedVoucher.redeemed_by
      }
    }

  } catch (error: any) {
    console.error('❌ Error in voucher redemption:', error)
    return {
      success: false,
      error: error.message || 'Fehler bei der Gutschein-Einlösung'
    }
  }
})
