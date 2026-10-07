/**
 * GET /api/admin/tenants/:id/hard-delete/preview
 * Superadmin-only read-only preview of tenant hard-delete impact.
 */
import { defineEventHandler, getRouterParam, createError } from 'h3'
import { requireSuperAdmin } from '~/server/utils/require-super-admin'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import {
  expectedHardDeleteConfirmation,
  isTenantUuid,
} from '~/server/utils/tenant-hard-delete-inventory'
import { previewTenantHardDelete } from '~/server/utils/tenant-hard-delete'

export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)

  const tenantId = getRouterParam(event, 'id')
  if (!tenantId || !isTenantUuid(tenantId)) {
    throw createError({ statusCode: 400, statusMessage: 'tenant_id must be a valid UUID' })
  }

  const supabase = getSupabaseAdmin()

  try {
    const preview = await previewTenantHardDelete(supabase, tenantId)
    return {
      ...preview,
      confirmationPhrase: expectedHardDeleteConfirmation(preview.tenantName),
    }
  } catch (err: any) {
    const status = err?.statusCode || 500
    throw createError({
      statusCode: status,
      statusMessage: err?.message || 'Preview failed',
    })
  }
})
