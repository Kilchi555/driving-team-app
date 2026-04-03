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

    const body = await readBody<{
      id: string
      updates: {
        company_name?: string
        contact_person?: string
        email?: string
        phone?: string | null
        street?: string
        street_number?: string
        zip?: string
        city?: string
        country?: string
        vat_number?: string | null
        company_register_number?: string | null
      }
    }>(event)

    if (!body.id || !body.updates) {
      throw createError({ statusCode: 400, statusMessage: 'Missing id or updates' })
    }

    const supabase = getSupabaseAdmin()
    const clientIP = getClientIP(event)

    // Load caller's tenant
    const { data: callerUser } = await supabase
      .from('users')
      .select('id, tenant_id, role')
      .eq('auth_user_id', authUser.id)
      .single()

    if (!callerUser) throw createError({ statusCode: 403, statusMessage: 'Access denied' })

    // Verify address belongs to caller's tenant
    const { data: existing } = await supabase
      .from('company_billing_addresses')
      .select('id, tenant_id')
      .eq('id', body.id)
      .single()

    if (!existing || existing.tenant_id !== callerUser.tenant_id) {
      throw createError({ statusCode: 404, statusMessage: 'Billing address not found' })
    }

    // Whitelist fields — never allow tenant_id, user_id, is_verified changes
    const allowedFields = ['company_name', 'contact_person', 'email', 'phone', 'street',
      'street_number', 'zip', 'city', 'country', 'vat_number', 'company_register_number']

    const safeUpdates: Record<string, any> = {}
    for (const field of allowedFields) {
      if (field in body.updates) {
        safeUpdates[field] = (body.updates as any)[field]
      }
    }

    const { data, error: updateError } = await supabase
      .from('company_billing_addresses')
      .update(safeUpdates)
      .eq('id', body.id)
      .select()
      .single()

    if (updateError) throw updateError

    await logAudit({
      user_id: authUser.id,
      action: 'update_billing_address',
      resource_type: 'company_billing_address',
      resource_id: body.id,
      status: 'success',
      ip_address: clientIP
    })

    return { success: true, data }

  } catch (err: any) {
    logger.error('❌ Error updating billing address:', err)
    if (err.statusCode) throw err
    throw createError({ statusCode: 500, statusMessage: 'Failed to update billing address' })
  }
})
