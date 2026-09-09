/**
 * API: Manage external busy times (from external calendars)
 *
 * Create, update, or delete external busy times after a tenant staff session
 * is established. Resource tenant and staff ownership are taken from the
 * session and the stored row — not from client-supplied tenant_id / id alone.
 */

import { defineEventHandler, createError, readBody } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'
import { createAvailabilitySlotManager } from '~/server/utils/availability-slot-manager'
import {
  requireTenantStaff,
  loadStaffInTenant,
  assertSelfOrTenantAdmin,
  type TenantActor,
} from '~/server/utils/require-tenant-auth'
import type { SupabaseClient } from '@supabase/supabase-js'

interface CreateExternalBusyTimeRequest {
  action: 'create'
  staff_id: string
  start_time: string
  end_time: string
  tenant_id?: string
  title?: string
  source?: string
}

interface UpdateExternalBusyTimeRequest {
  action: 'update'
  id: string
  staff_id?: string
  old_start_time?: string
  old_end_time?: string
  start_time: string
  end_time: string
  tenant_id?: string
}

interface DeleteExternalBusyTimeRequest {
  action: 'delete'
  id: string
  staff_id?: string
  start_time?: string
  end_time?: string
  tenant_id?: string
}

type ManageBusyTimeRequest =
  | CreateExternalBusyTimeRequest
  | UpdateExternalBusyTimeRequest
  | DeleteExternalBusyTimeRequest

async function loadBusyTimeInTenant(
  supabase: SupabaseClient,
  id: string,
  tenantId: string,
) {
  if (!id || typeof id !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'id is required' })
  }
  const { data, error } = await supabase
    .from('external_busy_times')
    .select('id, staff_id, tenant_id, start_time, end_time')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (error || !data) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }
  return data
}

async function authorizeStaffResource(
  supabase: SupabaseClient,
  actor: TenantActor,
  staffId: string,
) {
  const staff = await loadStaffInTenant(supabase, staffId, actor.tenant_id, {
    allowInactive: true,
  })
  assertSelfOrTenantAdmin(actor, staff.id)
  return staff
}

async function queueRecalc(staffId: string, tenantId: string) {
  try {
    await $fetch('/api/availability/queue-recalc', {
      method: 'POST',
      body: {
        staff_id: staffId,
        tenant_id: tenantId,
        trigger: 'external_event',
      },
    })
    logger.debug('✅ Queued recalculation after external busy time change')
  } catch (queueError: any) {
    logger.warn('⚠️ Failed to queue recalculation:', queueError.message)
  }
}

export default defineEventHandler(async (event) => {
  const actor = await requireTenantStaff(event)

  try {
    const supabase = getSupabaseAdmin()
    const slotManager = createAvailabilitySlotManager(supabase)

    const body = await readBody<ManageBusyTimeRequest>(event)
    const action = body?.action

    logger.debug('🔄 External busy time action:', action)

    if (action === 'create') {
      const { staff_id, start_time, end_time, title, source } = body as CreateExternalBusyTimeRequest
      if (!staff_id || !start_time || !end_time) {
        throw createError({
          statusCode: 400,
          statusMessage: 'staff_id, start_time, and end_time are required',
        })
      }

      const staff = await authorizeStaffResource(supabase, actor, staff_id)

      const { data: busyTime, error: insertError } = await supabase
        .from('external_busy_times')
        .insert({
          staff_id: staff.id,
          start_time,
          end_time,
          tenant_id: actor.tenant_id,
          title: title || 'Busy Time',
          source: source || 'manual',
        })
        .select()
        .single()

      if (insertError) {
        logger.error('❌ Error creating external busy time:', insertError)
        throw createError({
          statusCode: 500,
          statusMessage: 'Failed to create external busy time',
        })
      }

      try {
        const invalidateResult = await slotManager.invalidateSlots(
          staff.id,
          start_time,
          end_time,
          actor.tenant_id,
        )
        logger.debug(`✅ Invalidated ${invalidateResult.invalidatedCount} overlapping slots`)
      } catch (slotError: any) {
        logger.warn('⚠️ Failed to invalidate slots (non-critical):', slotError.message)
      }

      await queueRecalc(staff.id, actor.tenant_id)

      return {
        success: true,
        message: 'External busy time created',
        data: busyTime,
      }
    }

    if (action === 'update') {
      const { id, start_time, end_time } = body as UpdateExternalBusyTimeRequest
      if (!start_time || !end_time) {
        throw createError({
          statusCode: 400,
          statusMessage: 'start_time and end_time are required',
        })
      }

      const existing = await loadBusyTimeInTenant(supabase, id, actor.tenant_id)
      await authorizeStaffResource(supabase, actor, existing.staff_id)

      const { data: busyTime, error: updateError } = await supabase
        .from('external_busy_times')
        .update({
          start_time,
          end_time,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .eq('tenant_id', actor.tenant_id)
        .select()
        .single()

      if (updateError) {
        logger.error('❌ Error updating external busy time:', updateError)
        throw createError({
          statusCode: 500,
          statusMessage: 'Failed to update external busy time',
        })
      }

      try {
        const releaseResult = await slotManager.releaseSlots(
          existing.staff_id,
          existing.start_time,
          existing.end_time,
          actor.tenant_id,
        )
        logger.debug(`✅ Released ${releaseResult.releasedCount} slots from old time`)
      } catch (slotError: any) {
        logger.warn('⚠️ Failed to release old slots (non-critical):', slotError.message)
      }

      try {
        const invalidateResult = await slotManager.invalidateSlots(
          existing.staff_id,
          start_time,
          end_time,
          actor.tenant_id,
        )
        logger.debug(`✅ Invalidated ${invalidateResult.invalidatedCount} slots for new time`)
      } catch (slotError: any) {
        logger.warn('⚠️ Failed to invalidate new slots (non-critical):', slotError.message)
      }

      await queueRecalc(existing.staff_id, actor.tenant_id)

      return {
        success: true,
        message: 'External busy time updated',
        data: busyTime,
      }
    }

    if (action === 'delete') {
      const { id } = body as DeleteExternalBusyTimeRequest
      const existing = await loadBusyTimeInTenant(supabase, id, actor.tenant_id)
      await authorizeStaffResource(supabase, actor, existing.staff_id)

      const { error: deleteError } = await supabase
        .from('external_busy_times')
        .delete()
        .eq('id', existing.id)
        .eq('tenant_id', actor.tenant_id)

      if (deleteError) {
        logger.error('❌ Error deleting external busy time:', deleteError)
        throw createError({
          statusCode: 500,
          statusMessage: 'Failed to delete external busy time',
        })
      }

      try {
        const releaseResult = await slotManager.releaseSlots(
          existing.staff_id,
          existing.start_time,
          existing.end_time,
          actor.tenant_id,
        )
        logger.debug(`✅ Released ${releaseResult.releasedCount} overlapping slots`)
      } catch (slotError: any) {
        logger.warn('⚠️ Failed to release slots (non-critical):', slotError.message)
      }

      await queueRecalc(existing.staff_id, actor.tenant_id)

      return {
        success: true,
        message: 'External busy time deleted',
      }
    }

    throw createError({
      statusCode: 400,
      statusMessage: `Unknown action: ${action}`,
    })
  } catch (error: any) {
    if (error.statusCode) {
      throw error
    }
    logger.error('❌ Error managing external busy time:', error)
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to manage external busy time',
    })
  }
})
