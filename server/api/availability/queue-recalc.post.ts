/**
 * Staff-Specific Availability Recalculation Queue
 *
 * Internal/staff only. Body tenant_id is a resource identifier after auth.
 */

import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { requireStaffOrInternal } from '~/server/utils/require-staff-or-internal'
import {
  assertSelfOrTenantAdmin,
  loadStaffInTenant,
} from '~/server/utils/require-tenant-auth'
import { logger } from '~/utils/logger'

const TRIGGERS = new Set([
  'working_hours',
  'external_event',
  'appointment',
  'appointment_edit',
  'settings_change',
])

interface StaffRecalcRequest {
  staff_id: string
  tenant_id: string
  trigger: string
}

export default defineEventHandler(async (event) => {
  const authz = await requireStaffOrInternal(event)

  try {
    const body = await readBody(event) as StaffRecalcRequest
    const { staff_id, trigger } = body || {}

    if (!staff_id || !trigger || !TRIGGERS.has(trigger)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'staff_id, tenant_id, and trigger are required',
      })
    }

    const supabase = getSupabaseAdmin()
    let tenantId: string

    if (authz.mode === 'staff' && authz.profile) {
      tenantId = authz.profile.tenant_id
      const staff = await loadStaffInTenant(supabase, staff_id, tenantId)
      assertSelfOrTenantAdmin(authz.profile, staff.id)
    } else {
      tenantId = typeof body.tenant_id === 'string' ? body.tenant_id : ''
      if (!tenantId) {
        throw createError({
          statusCode: 400,
          statusMessage: 'staff_id, tenant_id, and trigger are required',
        })
      }
      await loadStaffInTenant(supabase, staff_id, tenantId)
    }

    logger.debug(`📋 Queueing staff for recalculation`, {
      staff_id,
      tenant_id: tenantId,
      trigger,
    })

    const { error: queueError } = await supabase
      .from('availability_recalc_queue')
      .upsert(
        {
          staff_id,
          tenant_id: tenantId,
          trigger,
          queued_at: new Date().toISOString(),
          processed: false,
        },
        { onConflict: 'staff_id,tenant_id' },
      )

    if (queueError) {
      logger.error('❌ Error queuing staff for recalculation:', queueError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to queue recalculation',
      })
    }

    logger.debug(`✅ Staff queued for recalculation: ${staff_id}`)

    const cronSecret = process.env.CRON_SECRET?.trim()
    if (cronSecret) {
      $fetch('/api/cron/process-recalc-queue', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cronSecret}`,
        },
      }).then((cronResponse: any) => {
        logger.debug(`✅ Cron executed in background:`, {
          processed: cronResponse.processed,
          failed: cronResponse.failed,
          duration_ms: cronResponse.duration_ms,
        })
      }).catch((cronError: any) => {
        logger.warn(`⚠️ Background cron failed (non-critical):`, cronError.message)
      })
    }

    return {
      success: true,
      message: 'Staff queued for availability recalculation',
      queued: {
        staff_id,
        tenant_id: tenantId,
        trigger,
      },
    }
  } catch (error: any) {
    logger.error('❌ Error in queue-recalc API:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to queue recalculation',
    })
  }
})
