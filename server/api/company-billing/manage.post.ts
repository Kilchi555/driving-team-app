// server/api/company-billing/manage.post.ts
import { getSupabaseAdmin } from '~/utils/supabase'
import { logger } from '~/utils/logger'
import { getHeader } from 'h3'

interface ManageCompanyBillingBody {
  action: 'create' | 'load' | 'update' | 'delete' | 'get-default'
  userId?: string
  addressId?: string
  addressData?: any
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody<ManageCompanyBillingBody>(event)
    const { action } = body

    logger.debug('🏢 Company billing action:', action)

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

    // ========== CREATE ==========
    if (action === 'create') {
      if (!body.userId || !body.addressData) {
        throw new Error('User ID and address data required')
      }

      logger.debug('➕ Creating company billing address')

      // Verify user owns this
      const { data: userData, error: userCheckError } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('id', body.userId)
        .single()

      if (userCheckError || userData?.id !== user.id) {
        throw new Error('Unauthorized')
      }

      const insertData = {
        ...body.addressData,
        created_by: user.id,
        tenant_id: user.id // Assuming tenant_id is user_id for company billing
      }

      const { data, error } = await supabaseAdmin
        .from('company_billing_addresses')
        .insert(insertData)
        .select()
        .single()

      if (error) {
        throw new Error(error.message)
      }

      // Set as default if first address
      await supabaseAdmin
        .from('users')
        .update({ default_company_billing_address_id: data.id })
        .eq('id', body.userId)

      logger.debug('✅ Company billing address created:', data.id)

      return {
        success: true,
        data
      }
    }

    // ========== LOAD ==========
    if (action === 'load') {
      if (!body.userId) {
        throw new Error('User ID required')
      }

      logger.debug('📋 Loading company addresses for user:', body.userId)

      const { data, error } = await supabaseAdmin
        .from('company_billing_addresses')
        .select('*')
        .eq('created_by', body.userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) {
        throw new Error(error.message)
      }

      logger.debug('✅ Addresses loaded:', data?.length || 0)

      return {
        success: true,
        data: data || []
      }
    }

    // ========== UPDATE ==========
    if (action === 'update') {
      if (!body.addressId || !body.addressData) {
        throw new Error('Address ID and update data required')
      }

      logger.debug('📝 Updating company billing address:', body.addressId)

      // Verify ownership
      const { data: addressData, error: addressCheckError } = await supabaseAdmin
        .from('company_billing_addresses')
        .select('created_by')
        .eq('id', body.addressId)
        .single()

      if (addressCheckError || addressData?.created_by !== user.id) {
        throw new Error('Unauthorized to update this address')
      }

      const { data, error } = await supabaseAdmin
        .from('company_billing_addresses')
        .update(body.addressData)
        .eq('id', body.addressId)
        .select()
        .single()

      if (error) {
        throw new Error(error.message)
      }

      logger.debug('✅ Address updated:', data.id)

      return {
        success: true,
        data
      }
    }

    // ========== DELETE (soft delete) ==========
    if (action === 'delete') {
      if (!body.addressId) {
        throw new Error('Address ID required')
      }

      logger.debug('🗑️ Deleting company billing address:', body.addressId)

      // Verify ownership
      const { data: addressData, error: addressCheckError } = await supabaseAdmin
        .from('company_billing_addresses')
        .select('created_by')
        .eq('id', body.addressId)
        .single()

      if (addressCheckError || addressData?.created_by !== user.id) {
        throw new Error('Unauthorized to delete this address')
      }

      const { error } = await supabaseAdmin
        .from('company_billing_addresses')
        .update({ is_active: false })
        .eq('id', body.addressId)

      if (error) {
        throw new Error(error.message)
      }

      logger.debug('✅ Address deleted (soft delete)')

      return {
        success: true,
        message: 'Address deleted'
      }
    }

    // ========== GET DEFAULT ==========
    if (action === 'get-default') {
      if (!body.userId) {
        throw new Error('User ID required')
      }

      logger.debug('🔍 Getting default billing address for user:', body.userId)

      const { data: userData, error: userError } = await supabaseAdmin
        .from('users')
        .select('default_company_billing_address_id')
        .eq('id', body.userId)
        .single()

      if (userError || !userData?.default_company_billing_address_id) {
        return {
          success: true,
          data: null
        }
      }

      const { data: addressData, error: addressError } = await supabaseAdmin
        .from('company_billing_addresses')
        .select('*')
        .eq('id', userData.default_company_billing_address_id)
        .single()

      if (addressError) {
        return {
          success: true,
          data: null
        }
      }

      logger.debug('✅ Default address found')

      return {
        success: true,
        data: addressData
      }
    }

    throw new Error('Unknown action: ' + action)

  } catch (error: any) {
    logger.error('❌ Error managing company billing:', error)
    throw createError({
      statusCode: 400,
      statusMessage: error.message || 'Failed to manage company billing'
    })
  }
})
