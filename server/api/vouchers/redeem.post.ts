// API Endpoint: Redeem Voucher Code
// Description: Allows students to redeem voucher codes for credit top-up

import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin, getSupabaseServerWithSession } from '~/utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    console.log('🎫 [redeem] Handler started')
    
    const body = await readBody(event)
    const { code } = body

    if (!code || typeof code !== 'string') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Voucher code is required'
      })
    }

    console.log('🎫 [redeem] Redeeming voucher:', code)

    // Get Supabase client with user session from cookies
    console.log('🎫 [redeem] Calling getSupabaseServerWithSession')
    const userClient = getSupabaseServerWithSession(event)
    console.log('🎫 [redeem] Got userClient')

    // Get current authenticated user
    console.log('🎫 [redeem] Getting user from auth')
    const { data: { user: authUser }, error: authError } = await userClient.auth.getUser()
    console.log('🎫 [redeem] Auth result:', { hasUser: !!authUser, hasError: !!authError })
    
    if (authError || !authUser) {
      console.error('❌ Auth error:', authError)
      throw createError({
        statusCode: 401,
        statusMessage: 'Not authenticated'
      })
    }

    console.log('✅ Authenticated user:', authUser.id, authUser.email)

    // Use admin client for database operations to bypass RLS
    const supabaseAdmin = getSupabaseAdmin()

    // Get user profile with tenant_id
    const { data: userProfile, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, tenant_id, first_name, last_name')
      .eq('auth_user_id', authUser.id)
      .single()

    if (userError || !userProfile) {
      throw createError({
        statusCode: 404,
        statusMessage: 'User profile not found'
      })
    }

    console.log('🎫 Redeeming voucher:', {
      code: code.toUpperCase(),
      userId: userProfile.id,
      tenantId: userProfile.tenant_id
    })

    // 1. Find and validate voucher
    const { data: voucher, error: voucherError } = await supabaseAdmin
      .from('voucher_codes')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('tenant_id', userProfile.tenant_id)
      .eq('is_active', true)
      .single()

    if (voucherError || !voucher) {
      console.error('❌ Voucher not found:', voucherError)
      throw createError({
        statusCode: 404,
        statusMessage: 'Ungültiger Gutschein-Code'
      })
    }

    // 2. Validate voucher conditions
    const now = new Date()

    // Check validity period
    if (voucher.valid_from && new Date(voucher.valid_from) > now) {
      throw createError({
        statusCode: 400,
        statusMessage: `Dieser Gutschein ist erst ab ${new Date(voucher.valid_from).toLocaleDateString('de-CH')} gültig`
      })
    }

    if (voucher.valid_until && new Date(voucher.valid_until) < now) {
      throw createError({
        statusCode: 400,
        statusMessage: `Dieser Gutschein ist abgelaufen (gültig bis ${new Date(voucher.valid_until).toLocaleDateString('de-CH')})`
      })
    }

    // Check redemption limit
    if (voucher.current_redemptions >= voucher.max_redemptions) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Dieser Gutschein wurde bereits vollständig eingelöst'
      })
    }

    // Check if user already redeemed this voucher (if single-use)
    const { data: existingRedemption } = await supabaseAdmin
      .from('voucher_redemptions')
      .select('id')
      .eq('voucher_id', voucher.id)
      .eq('user_id', userProfile.id)
      .single()

    if (existingRedemption) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Sie haben diesen Gutschein bereits eingelöst'
      })
    }

    console.log('✅ Voucher is valid:', {
      code: voucher.code,
      creditAmount: (voucher.credit_amount_rappen / 100).toFixed(2)
    })

    // 3. Get current student credit
    const { data: studentCredit, error: creditError } = await supabaseAdmin
      .from('student_credits')
      .select('id, balance_rappen')
      .eq('user_id', userProfile.id)
      .single()

    if (creditError) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Fehler beim Laden des Guthabens'
      })
    }

    const oldBalance = studentCredit.balance_rappen || 0
    const newBalance = oldBalance + voucher.credit_amount_rappen

    // 4. Update student credit balance
    const { error: updateError } = await supabaseAdmin
      .from('student_credits')
      .update({
        balance_rappen: newBalance,
        updated_at: new Date().toISOString()
      })
      .eq('id', studentCredit.id)

    if (updateError) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Fehler beim Aktualisieren des Guthabens'
      })
    }

    console.log('💰 Credit balance updated:', {
      oldBalance: (oldBalance / 100).toFixed(2),
      creditAdded: (voucher.credit_amount_rappen / 100).toFixed(2),
      newBalance: (newBalance / 100).toFixed(2)
    })

    // 5. Create credit transaction
    const { data: creditTransaction, error: txError } = await supabaseAdmin
      .from('credit_transactions')
      .insert({
        user_id: userProfile.id,
        transaction_type: 'voucher',
        amount_rappen: voucher.credit_amount_rappen,
        balance_before_rappen: oldBalance,
        balance_after_rappen: newBalance,
        payment_method: 'voucher',
        reference_id: voucher.id,
        reference_type: 'voucher',
        created_by: userProfile.id,
        notes: `Gutschein eingelöst: ${voucher.code} - ${voucher.description || 'Guthaben-Aufladung'}`,
        tenant_id: userProfile.tenant_id
      })
      .select('id')
      .single()

    if (txError) {
      console.error('❌ Error creating credit transaction:', txError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Fehler beim Erstellen der Transaktion'
      })
    }

    // 6. Create voucher redemption record (trigger will auto-increment counter)
    const { error: redemptionError } = await supabaseAdmin
      .from('voucher_redemptions')
      .insert({
        voucher_id: voucher.id,
        user_id: userProfile.id,
        credit_transaction_id: creditTransaction.id,
        credit_amount_rappen: voucher.credit_amount_rappen,
        redeemed_at: new Date().toISOString(),
        tenant_id: userProfile.tenant_id
      })

    if (redemptionError) {
      console.error('❌ Error creating redemption record:', redemptionError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Fehler beim Speichern der Einlösung'
      })
    }

    console.log('✅ Voucher redeemed successfully:', {
      voucherId: voucher.id,
      userId: userProfile.id,
      creditAdded: (voucher.credit_amount_rappen / 100).toFixed(2)
    })

    return {
      success: true,
      message: `Gutschein erfolgreich eingelöst! CHF ${(voucher.credit_amount_rappen / 100).toFixed(2)} wurden Ihrem Guthaben gutgeschrieben.`,
      voucher: {
        code: voucher.code,
        description: voucher.description,
        credit_amount_chf: (voucher.credit_amount_rappen / 100).toFixed(2)
      },
      credit: {
        old_balance_chf: (oldBalance / 100).toFixed(2),
        new_balance_chf: (newBalance / 100).toFixed(2),
        added_chf: (voucher.credit_amount_rappen / 100).toFixed(2)
      }
    }

  } catch (error: any) {
    console.error('❌ Error redeeming voucher:', error)
    
    if (error.statusCode) {
      throw error
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Ein Fehler ist beim Einlösen des Gutscheins aufgetreten'
    })
  }
})
