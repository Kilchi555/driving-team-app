import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { logAudit } from '~/server/utils/audit'
import { getClientIP } from '~/server/utils/ip-utils'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    const authUser = await getAuthenticatedUser(event)
    if (!authUser?.id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

    const body = await readBody<{ id: string }>(event)
    if (!body.id) throw createError({ statusCode: 400, statusMessage: 'Missing id' })

    const supabase = getSupabaseAdmin()
    const clientIP = getClientIP(event)

    // Load caller's tenant
    const { data: callerUser } = await supabase
      .from('users')
      .select('id, tenant_id, role')
      .eq('auth_user_id', authUser.id)
      .single()

    if (!callerUser) throw createError({ statusCode: 403, statusMessage: 'Access denied' })

    // Only admins can delete billing addresses
    if (!['admin', 'super_admin'].includes(callerUser.role)) {
      throw createError({ statusCode: 403, statusMessage: 'Admin role required' })
    }

    // Verify address belongs to caller's tenant
    const { data: existing } = await supabase
      .from('company_billing_addresses')
      .select('id, tenant_id')
      .eq('id', body.id)
      .single()

    if (!existing || existing.tenant_id !== callerUser.tenant_id) {
      throw createError({ statusCode: 404, statusMessage: 'Billing address not found' })
    }

    const { error: deleteError } = await supabase
      .from('company_billing_addresses')
      .delete()
      .eq('id', body.id)

    if (deleteError) throw deleteError

    await logAudit({
      user_id: authUser.id,
      action: 'delete_billing_address',
      resource_type: 'company_billing_address',
      resource_id: body.id,
      status: 'success',
      ip_address: clientIP
    })

    return { success: true }

  } catch (err: any) {
    logger.error('❌ Error deleting billing address:', err)
    if (err.statusCode) throw err
    throw createError({ statusCode: 500, statusMessage: 'Failed to delete billing address' })
  }
})
