// server/api/billing-address/create.post.ts
import { defineEventHandler, readBody } from 'h3'
import { getSupabaseAdmin } from '~/utils/supabase'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { addressData } = body

    if (!addressData) {
      throw new Error('Address data is required')
    }

    logger.debug('📋 Server: Creating billing address:', {
      user_id: addressData.user_id,
      tenant_id: addressData.tenant_id,
      company_name: addressData.company_name
    })

    const supabase = getSupabaseAdmin()

    // ✅ Use admin client to bypass RLS
    const { data: address, error } = await supabase
      .from('company_billing_addresses')
      .insert([addressData])
      .select()
      .single()

    if (error) {
      logger.error('❌ Error creating billing address:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        addressData
      })
      throw new Error(`Failed to create billing address: ${error.message}`)
    }

    logger.debug('✅ Billing address created successfully:', address.id)

    return {
      success: true,
      data: address
    }
  } catch (err: any) {
    logger.error('❌ Error in create billing address endpoint:', err)
    throw createError({
      statusCode: 500,
      statusMessage: err.message || 'Failed to create billing address'
    })
  }
})

