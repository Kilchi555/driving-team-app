// server/api/billing-address/create.post.ts
import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/utils/supabase'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { STAFF_ADMIN_ROLES } from '~/server/utils/require-staff-or-internal'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    const authUser = await getAuthenticatedUser(event)
    if (!authUser?.id) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    const body = await readBody(event)
    const { addressData } = body

    if (!addressData) {
      throw createError({ statusCode: 400, statusMessage: 'Address data is required' })
    }

    const role = authUser.role || ''
    const isPrivileged = (STAFF_ADMIN_ROLES as readonly string[]).includes(role)
    const callerDbId = authUser.db_user_id || authUser.profile?.id
    const callerTenant = authUser.tenant_id || authUser.profile?.tenant_id

    if (!callerTenant || !callerDbId) {
      throw createError({ statusCode: 403, statusMessage: 'User profile not found' })
    }

    // Force tenant from caller; clients may only create for themselves
    const targetUserId = isPrivileged
      ? (addressData.user_id || callerDbId)
      : callerDbId

    if (!isPrivileged && addressData.user_id && addressData.user_id !== callerDbId) {
      throw createError({ statusCode: 403, statusMessage: 'Forbidden – can only create own billing address' })
    }

    const supabase = getSupabaseAdmin()

    if (isPrivileged && targetUserId !== callerDbId) {
      const { data: target } = await supabase
        .from('users')
        .select('id, tenant_id')
        .eq('id', targetUserId)
        .maybeSingle()
      if (!target || (role !== 'super_admin' && target.tenant_id !== callerTenant)) {
        throw createError({ statusCode: 403, statusMessage: 'Forbidden – tenant mismatch' })
      }
    }

    const sanitized = {
      ...addressData,
      user_id: targetUserId,
      tenant_id: callerTenant,
    }

    logger.debug('📋 Server: Creating billing address:', {
      user_id: sanitized.user_id,
      tenant_id: sanitized.tenant_id,
      company_name: sanitized.company_name
    })

    const { data: address, error } = await supabase
      .from('company_billing_addresses')
      .insert([sanitized])
      .select()
      .single()

    if (error) {
      logger.error('❌ Error creating billing address:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      })
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to create billing address: ${error.message}`
      })
    }

    logger.debug('✅ Billing address created successfully:', address.id)

    return {
      success: true,
      data: address
    }
  } catch (err: any) {
    if (err?.statusCode) throw err
    logger.error('❌ Error in create billing address endpoint:', err)
    throw createError({
      statusCode: 500,
      statusMessage: err.message || 'Failed to create billing address'
    })
  }
})
