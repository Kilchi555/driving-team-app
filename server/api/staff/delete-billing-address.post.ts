import { defineEventHandler, createError, readBody } from 'h3'
import { getAuthUserFromRequest } from '~/server/utils/auth-helper'
import { createClient } from '@supabase/supabase-js'
import logger from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    const authUser = await getAuthUserFromRequest(event)
    if (!authUser) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    const { data: staffProfile } = await supabaseAdmin
      .from('users')
      .select('id, tenant_id, role')
      .eq('auth_user_id', authUser.id)
      .single()

    if (!staffProfile || !['staff', 'admin'].includes(staffProfile.role)) {
      throw createError({ statusCode: 403, statusMessage: 'Not authorized' })
    }

    const { id } = await readBody(event)
    if (!id) throw createError({ statusCode: 400, statusMessage: 'id is required' })

    const { error } = await supabaseAdmin
      .from('company_billing_addresses')
      .delete()
      .eq('id', id)
      .eq('tenant_id', staffProfile.tenant_id)

    if (error) throw createError({ statusCode: 500, statusMessage: 'Failed to delete: ' + error.message })

    logger.debug('✅ Billing address deleted:', id)
    return { success: true }
  } catch (error: any) {
    if (error.statusCode) throw error
    throw createError({ statusCode: 500, statusMessage: error.message })
  }
})
