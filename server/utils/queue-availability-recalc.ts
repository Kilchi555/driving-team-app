import { internalSecretHeaders } from '~/server/utils/require-staff-or-internal'
import { logger } from '~/utils/logger'

export type AvailabilityRecalcTrigger =
  | 'working_hours'
  | 'external_event'
  | 'appointment'
  | 'appointment_edit'
  | 'settings_change'

/**
 * Server-to-server enqueue. Callers must not treat body tenant_id as
 * authorization — queue-recalc authenticates via internal secret.
 */
export async function enqueueStaffAvailabilityRecalc(opts: {
  staff_id: string
  tenant_id: string
  trigger: AvailabilityRecalcTrigger
}): Promise<void> {
  try {
    await $fetch('/api/availability/queue-recalc', {
      method: 'POST',
      body: opts,
      headers: internalSecretHeaders(),
    })
  } catch (error: any) {
    logger.warn('Failed to queue availability recalc:', error?.message || error)
  }
}
