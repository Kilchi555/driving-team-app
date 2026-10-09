/**
 * POST /api/admin/tenants/:id/hard-delete/execute
 * Superadmin-only permanent tenant hard-delete.
 *
 * Body: { confirmation: "DELETE <exact tenant name>" }
 * Route param :id MUST be the tenant UUID (never name/slug).
 */
import { defineEventHandler, getRouterParam, readBody, createError, getHeader } from 'h3'
import { requireSuperAdmin } from '~/server/utils/require-super-admin'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { isTenantUuid } from '~/server/utils/tenant-hard-delete-inventory'
import { executeTenantHardDelete } from '~/server/utils/tenant-hard-delete'
import { logAudit } from '~/server/utils/audit'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  const authUser = await requireSuperAdmin(event)

  const tenantId = getRouterParam(event, 'id')
  if (!tenantId || !isTenantUuid(tenantId)) {
    throw createError({ statusCode: 400, statusMessage: 'tenant_id must be a valid UUID' })
  }

  const body = await readBody(event).catch(() => ({}))
  const confirmation = typeof body?.confirmation === 'string' ? body.confirmation : ''

  // Never trust client booleans alone — require typed phrase
  if (!confirmation || confirmation === 'DELETE' || !confirmation.startsWith('DELETE ')) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Confirmation required: type DELETE <exact tenant name>',
    })
  }

  const supabase = getSupabaseAdmin()

  // Resolve app user id for audit (optional)
  const { data: profile } = await supabase
    .from('users')
    .select('id, email, role')
    .eq('auth_user_id', authUser.id)
    .eq('role', 'super_admin')
    .maybeSingle()

  if (!profile || profile.role !== 'super_admin') {
    throw createError({ statusCode: 403, statusMessage: 'Super admin access required' })
  }

  const ip = getHeader(event, 'x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'

  try {
    const result = await executeTenantHardDelete(supabase, {
      tenantId,
      confirmation,
      requestedByUserId: profile.id,
      requestedByAuthUserId: authUser.id,
      requestedByEmail: profile.email,
    })

    await logAudit(
      {
        user_id: profile.id,
        auth_user_id: authUser.id,
        tenant_id: null,
        action: 'tenant_hard_delete',
        resource_type: 'tenants',
        resource_id: tenantId,
        status: result.status === 'COMPLETED' ? 'success' : 'error',
        details: {
          job_id: result.jobId,
          tenant_name: result.tenantName,
          status: result.status,
          email_sent: result.emailSent,
          auth_deleted_count: result.authDeleted.length,
          storage_deleted_count: result.storageDeleted.length,
          verification_ok: result.verification.ok,
          leftover_tables: result.verification.leftovers.map((l) => l.table),
        },
        ip_address: ip,
      },
      event
    ).catch((e) => logger.warn('[hard-delete] audit failed:', e))

    if (result.status === 'FAILED') {
      throw createError({
        statusCode: 500,
        statusMessage: result.error || 'Tenant hard-delete failed',
        data: result,
      })
    }

    return result
  } catch (err: any) {
    if (err?.statusCode) throw err
    logger.error('[hard-delete] execute error:', err)
    throw createError({
      statusCode: err?.statusCode || 500,
      statusMessage: err?.message || 'Tenant hard-delete failed',
    })
  }
})
