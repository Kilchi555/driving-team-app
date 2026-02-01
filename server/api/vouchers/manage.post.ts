// server/api/vouchers/manage.post.ts
import { getSupabaseAdmin } from '~/utils/supabase'
import { logger } from '~/utils/logger'
import { getHeader } from 'h3'

interface ManageVouchersBody {
  action: 'load' | 'create' | 'find-by-code' | 'redeem'
  userId?: string
  voucherData?: any
  code?: string
  voucherId?: string
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody<ManageVouchersBody>(event)
    const { action } = body

    logger.debug('🎫 Vouchers action:', action)

    const supabaseAdmin = getSupabaseAdmin()
    const authorization = getHeader(event, 'authorization')
    const token = authorization?.replace('Bearer ', '')

    if (!token) {
      throw new Error('No authorization token')
    }

    // Get current user
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    // ========== LOAD VOUCHERS ==========
    if (action === 'load') {
      const userId = body.userId || user.id

      logger.debug('📋 Loading vouchers for user:', userId)

      const { data: vouchers, error } = await supabaseAdmin
        .from('discounts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        throw new Error(error.message)
      }

      logger.debug('✅ Vouchers loaded:', vouchers?.length || 0)

      return {
        success: true,
        data: vouchers || []
      }
    }

    // ========== FIND BY CODE ==========
    if (action === 'find-by-code') {
      if (!body.code) {
        throw new Error('Code required')
      }

      logger.debug('🔍 Finding voucher by code:', body.code)

      const { data: voucher, error } = await supabaseAdmin
        .from('discounts')
        .select('*')
        .eq('code', body.code)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw new Error(error.message)
      }

      logger.debug('✅ Voucher lookup:', voucher ? 'found' : 'not found')

      return {
        success: true,
        data: voucher || null
      }
    }

    // ========== CREATE VOUCHER ==========
    if (action === 'create') {
      if (!body.voucherData) {
        throw new Error('Voucher data required')
      }

      logger.debug('➕ Creating voucher')

      // Verify user can create (must be admin or owner)
      const { data: userProfile, error: userError } = await supabaseAdmin
        .from('users')
        .select('is_admin, tenant_id')
        .eq('id', user.id)
        .single()

      if (userError || (!userProfile?.is_admin && body.voucherData.user_id !== user.id)) {
        throw new Error('Unauthorized to create vouchers')
      }

      const { data: created, error } = await supabaseAdmin
        .from('discounts')
        .insert([body.voucherData])
        .select()
        .single()

      if (error) {
        throw new Error(error.message)
      }

      logger.debug('✅ Voucher created:', created.id)

      return {
        success: true,
        data: created
      }
    }

    // ========== REDEEM VOUCHER ==========
    if (action === 'redeem') {
      if (!body.voucherId) {
        throw new Error('Voucher ID required')
      }

      logger.debug('🎁 Redeeming voucher:', body.voucherId)

      // Get voucher
      const { data: voucher, error: fetchError } = await supabaseAdmin
        .from('discounts')
        .select('*')
        .eq('id', body.voucherId)
        .single()

      if (fetchError) {
        throw new Error('Voucher not found')
      }

      // Mark as redeemed
      const { data: redeemed, error: updateError } = await supabaseAdmin
        .from('discounts')
        .update({ is_used: true, used_at: new Date().toISOString() })
        .eq('id', body.voucherId)
        .select()
        .single()

      if (updateError) {
        throw new Error(updateError.message)
      }

      logger.debug('✅ Voucher redeemed')

      return {
        success: true,
        data: redeemed
      }
    }

    throw new Error('Unknown action: ' + action)

  } catch (error: any) {
    logger.error('❌ Error managing vouchers:', error)
    throw createError({
      statusCode: 400,
      statusMessage: error.message || 'Failed to manage vouchers'
    })
  }
})
