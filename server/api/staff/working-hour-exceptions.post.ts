import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import {
  requireTenantStaff,
  authorizeWorkingHoursMutation,
} from '~/server/utils/require-tenant-auth'
import { logger } from '~/utils/logger'
import { enqueueStaffAvailabilityRecalc } from '~/server/utils/queue-availability-recalc'
import {
  ExceptionInputError,
  assertCivilDate,
  validateExceptionDays,
  zurichTodayCivilDate,
  type ExceptionDayInput,
} from '~/utils/effective-working-hours'

/**
 * Date-specific working-hour exceptions.
 * Does not read or write staff_working_hours or appointments.
 * tenant_id always comes from the authenticated actor.
 */

interface ExceptionBody {
  action?: 'list' | 'upsert' | 'delete' | 'upsert_many'
  staffId?: string
  startDate?: string
  endDate?: string
  date?: string
  isClosed?: boolean
  blocks?: Array<{ start_time?: string; end_time?: string }>
  days?: Array<{
    date?: string
    isClosed?: boolean
    blocks?: Array<{ start_time?: string; end_time?: string }>
  }>
  tenant_id?: string
}

const RPC_ERROR_MARKERS = [
  'closed_exception_cannot_have_intervals',
  'open_exception_requires_interval',
  'overlapping_intervals',
  'invalid_time_range',
  'date_in_past',
  'duplicate_date',
  'too_many_blocks',
  'invalid_day_count',
  'invalid_date',
  'staff_not_in_tenant',
  'child tenant',
]

export default defineEventHandler(async (event) => {
  const actor = await requireTenantStaff(event)
  const body = await readBody<ExceptionBody>(event)
  const action = body?.action

  if (!action || !['list', 'upsert', 'delete', 'upsert_many'].includes(action)) {
    throw createError({ statusCode: 400, statusMessage: 'Action required' })
  }

  const supabase = getSupabaseAdmin()
  const target = await authorizeWorkingHoursMutation(supabase, actor, body.staffId)
  const tenantId = actor.tenant_id

  try {
    if (action === 'list') {
      const startDate = assertCivilDate(body.startDate || '')
      const endDate = assertCivilDate(body.endDate || '')
      if (startDate > endDate) {
        throw new ExceptionInputError('Invalid civil date')
      }
      return await listExceptions(supabase, tenantId, target.id, startDate, endDate)
    }

    if (action === 'delete') {
      const date = assertCivilDate(body.date || '')
      if (date < zurichTodayCivilDate()) {
        throw new ExceptionInputError('Date is before today in Europe/Zurich')
      }
      const { error } = await supabase
        .from('staff_working_hour_exceptions')
        .delete()
        .eq('tenant_id', tenantId)
        .eq('staff_id', target.id)
        .eq('exception_date', date)

      if (error) {
        throw createError({ statusCode: 500, statusMessage: 'Failed to delete working-hour exception' })
      }

      await enqueueStaffAvailabilityRecalc({
        staff_id: target.id,
        tenant_id: tenantId,
        trigger: 'working_hours',
      })

      return { success: true }
    }

    const days = action === 'upsert_many'
      ? (body.days || []).map(toDayInput)
      : [toDayInput(body)]

    let validated: ExceptionDayInput[]
    try {
      validated = validateExceptionDays(days)
    } catch (error) {
      if (error instanceof ExceptionInputError) {
        throw createError({ statusCode: 400, statusMessage: error.message })
      }
      throw error
    }

    const { error } = await supabase.rpc('replace_staff_working_hour_exceptions', {
      p_tenant_id: tenantId,
      p_staff_id: target.id,
      p_days: validated.map((day) => ({
        date: day.date,
        is_closed: day.isClosed,
        blocks: day.blocks.map((block) => ({
          start_time: block.start_time,
          end_time: block.end_time,
        })),
      })),
    })

    if (error) {
      throw mapRpcError(error)
    }

    await enqueueStaffAvailabilityRecalc({
      staff_id: target.id,
      tenant_id: tenantId,
      trigger: 'working_hours',
    })

    return { success: true, saved: validated.length }
  } catch (error: any) {
    if (error instanceof ExceptionInputError) {
      throw createError({ statusCode: 400, statusMessage: error.message })
    }
    if (error?.statusCode) throw error
    logger.error('working-hour exception API failed', error?.message || error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Working-hour exception operation failed',
    })
  }
})

function toDayInput(raw: {
  date?: string
  isClosed?: boolean
  blocks?: Array<{ start_time?: string; end_time?: string }>
}): ExceptionDayInput {
  return {
    date: raw.date || '',
    isClosed: raw.isClosed === true,
    blocks: (raw.blocks || []).map((block) => ({
      start_time: block.start_time || '',
      end_time: block.end_time || '',
    })),
  }
}

async function listExceptions(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  tenantId: string,
  staffId: string,
  startDate: string,
  endDate: string,
) {
  const { data: parents, error } = await supabase
    .from('staff_working_hour_exceptions')
    .select('id, exception_date, is_closed, timezone')
    .eq('tenant_id', tenantId)
    .eq('staff_id', staffId)
    .gte('exception_date', startDate)
    .lte('exception_date', endDate)
    .order('exception_date')

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to load working-hour exceptions' })
  }

  const rows = parents || []
  const ids = rows.map((row: { id: string }) => row.id)
  let intervals: Array<{ exception_id: string; start_time: string; end_time: string }> = []
  if (ids.length > 0) {
    const { data, error: intervalError } = await supabase
      .from('staff_working_hour_exception_intervals')
      .select('exception_id, start_time, end_time')
      .eq('tenant_id', tenantId)
      .eq('staff_id', staffId)
      .in('exception_id', ids)

    if (intervalError) {
      throw createError({ statusCode: 500, statusMessage: 'Failed to load working-hour exceptions' })
    }
    intervals = data || []
  }

  return {
    success: true,
    exceptions: rows.map((row: { id: string; exception_date: string; is_closed: boolean; timezone: string }) => ({
      id: row.id,
      date: String(row.exception_date).slice(0, 10),
      isClosed: row.is_closed,
      timezone: row.timezone,
      blocks: intervals
        .filter((interval) => interval.exception_id === row.id)
        .map((interval) => ({
          start_time: String(interval.start_time).slice(0, 5),
          end_time: String(interval.end_time).slice(0, 5),
        }))
        .sort((a, b) => a.start_time.localeCompare(b.start_time)),
    })),
  }
}

function mapRpcError(error: { message?: string }) {
  const message = error.message || ''
  const known = RPC_ERROR_MARKERS.some((marker) => message.includes(marker))
  return createError({
    statusCode: known ? 400 : 500,
    statusMessage: known ? message : 'Failed to save working-hour exceptions',
  })
}
