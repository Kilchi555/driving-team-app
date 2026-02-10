/**
 * useCustomerConflictCheck
 * 
 * PURPOSE:
 * Checks if a selected appointment time conflicts with customer's existing appointments
 * across different staff and locations, INCLUDING travel time between locations.
 * 
 * EXAMPLE:
 * Customer has appointment in Uster 08:00-08:45
 * Tries to book in Zürich at 09:00
 * System checks if travel time from Uster to Zürich allows this (typically ~15-20 min)
 * 
 * USAGE:
 * const { checkConflicts, hasConflict, getConflictInfo } = useCustomerConflictCheck()
 * await checkConflicts(startDate, endDate)
 * 
 * const conflictInfo = await hasConflict({
 *   startTime: new Date('2026-02-11T09:00'),
 *   endTime: new Date('2026-02-11T09:45'),
 *   fromLocationPostalCode: '8610', // Uster
 *   toLocationPostalCode: '8048'    // Zürich
 * })
 */

import { ref, computed } from 'vue'
import { logger } from '~/utils/logger'
import { getTravelTime, isPeakTime } from '~/utils/plzDistanceCache'

interface CustomerAppointment {
  id: string
  staff_id: string
  staff_name: string
  location_id: string
  location_name: string
  start_time: string
  end_time: string
  duration_minutes: number
  status: string
  postal_code?: string
}

interface ConflictCheckParams {
  startTime: Date
  endTime: Date
  fromLocationPostalCode?: string
  toLocationPostalCode?: string
  bufferMinutes?: number
}

interface ConflictInfo {
  hasConflict: boolean
  appointment?: CustomerAppointment
  reason?: string
  travelTimeMinutes?: number
}

export const useCustomerConflictCheck = () => {
  const customerAppointments = ref<CustomerAppointment[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  /**
   * Load customer's existing appointments for a date range
   */
  const checkConflicts = async (startDate: Date, endDate: Date) => {
    try {
      isLoading.value = true
      error.value = null

      // Check if user is authenticated
      const { data: session } = await useAsyncData('session', () => 
        $fetch('/api/auth/session')
      )

      if (!session?.value?.user) {
        logger.debug('ℹ️ User not authenticated - skipping conflict check')
        customerAppointments.value = []
        return
      }

      const startStr = startDate.toISOString().split('T')[0]
      const endStr = endDate.toISOString().split('T')[0]

      logger.debug('🔍 Fetching customer appointments for conflict check...', {
        startDate: startStr,
        endDate: endStr
      })

      const response = await $fetch('/api/booking/get-customer-appointments', {
        query: {
          start_date: startStr,
          end_date: endStr
        }
      })

      if (response.success) {
        customerAppointments.value = response.appointments || []
        logger.debug('📅 Loaded customer appointments for conflict checking:', {
          count: customerAppointments.value.length,
          appointments: customerAppointments.value.map(a => ({
            date: a.start_time.split('T')[0],
            time: a.start_time.split('T')[1],
            staff: a.staff_name,
            location: a.location_name
          }))
        })
      }
    } catch (err: any) {
      // Non-critical: If not authenticated or error, just log and continue
      if (err.status === 401) {
        logger.debug('ℹ️ User not authenticated - skipping conflict check')
      } else {
        logger.warn('⚠️ Failed to fetch customer appointments for conflict check:', err.message)
      }
      customerAppointments.value = []
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Check if a proposed slot conflicts with customer's existing appointments
   * INCLUDING travel time between locations
   */
  const hasConflict = async (params: ConflictCheckParams): Promise<ConflictInfo> => {
    if (customerAppointments.value.length === 0) {
      return { hasConflict: false }
    }

    const slotStart = params.startTime.getTime()
    const slotEnd = params.endTime.getTime()
    const bufferMs = (params.bufferMinutes || 0) * 60 * 1000

    logger.debug('🔍 Checking for conflicts with travel time...', {
      proposedStart: params.startTime.toISOString(),
      proposedEnd: params.endTime.toISOString(),
      fromPostalCode: params.fromLocationPostalCode,
      toPostalCode: params.toLocationPostalCode,
      existingAppointmentsCount: customerAppointments.value.length
    })

    for (const apt of customerAppointments.value) {
      const aptStart = new Date(apt.start_time).getTime()
      const aptEnd = new Date(apt.end_time).getTime()

      // Direct time overlap check
      const directOverlap = (
        (slotStart >= aptStart - bufferMs && slotStart < aptEnd + bufferMs) ||
        (slotEnd > aptStart - bufferMs && slotEnd <= aptEnd + bufferMs) ||
        (slotStart <= aptStart - bufferMs && slotEnd >= aptEnd + bufferMs)
      )

      if (directOverlap) {
        logger.warn('⚠️ DIRECT CONFLICT DETECTED:', {
          existingAppointment: {
            staff: apt.staff_name,
            location: apt.location_name,
            start: apt.start_time,
            end: apt.end_time
          },
          proposedSlot: {
            start: params.startTime.toISOString(),
            end: params.endTime.toISOString()
          }
        })
        return {
          hasConflict: true,
          appointment: apt,
          reason: `Zeitkonflikt: Sie haben bereits einen Termin bei ${apt.staff_name} in ${apt.location_name}`
        }
      }

      // Travel time check - if different locations, ensure enough time to travel
      if (params.fromLocationPostalCode && params.toLocationPostalCode &&
          params.fromLocationPostalCode !== params.toLocationPostalCode) {
        try {
          // Get travel time from previous appointment location to new appointment location
          const travelTimeMinutes = await getTravelTime(
            apt.postal_code || params.fromLocationPostalCode,
            params.toLocationPostalCode,
            params.startTime,
            process.env.GOOGLE_MAPS_API_KEY || '',
            {
              morning_start: '07:00',
              morning_end: '09:00',
              evening_start: '17:00',
              evening_end: '19:00'
            }
          )

          if (travelTimeMinutes !== null) {
            const travelBufferMs = travelTimeMinutes * 60 * 1000
            const requiredFreeTimeStart = aptEnd + travelBufferMs

            if (slotStart < requiredFreeTimeStart) {
              logger.warn('⚠️ TRAVEL TIME CONFLICT DETECTED:', {
                previousAppointment: {
                  location: apt.location_name,
                  endTime: new Date(aptEnd).toISOString()
                },
                requiredTravelTime: travelTimeMinutes,
                proposedSlot: {
                  location: params.toLocationPostalCode,
                  startTime: params.startTime.toISOString()
                }
              })
              return {
                hasConflict: true,
                appointment: apt,
                reason: `Fahrtzeit-Konflikt: Ihr Termin bei ${apt.staff_name} endet um ${new Date(aptEnd).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}. Mit ${travelTimeMinutes} Minuten Fahrtzeit können Sie frühestens um ${new Date(requiredFreeTimeStart).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} einen Termin in einer anderen Location beginnen.`,
                travelTimeMinutes
              }
            }
          }
        } catch (err: any) {
          logger.warn('⚠️ Error checking travel time:', err.message)
          // Non-critical: continue without travel time check
        }
      }
    }

    logger.debug('✅ No conflicts detected')
    return { hasConflict: false }
  }

  /**
   * Get conflicting appointment if exists (simplified, no travel time)
   */
  const getConflictingAppointment = async (params: ConflictCheckParams): Promise<CustomerAppointment | null> => {
    const conflictInfo = await hasConflict(params)
    return conflictInfo.appointment || null
  }

  /**
   * Check if slot overlaps with any appointment (async version)
   */
  const slotHasConflict = computed(() => {
    return (params: ConflictCheckParams) => hasConflict(params)
  })

  return {
    customerAppointments,
    isLoading,
    error,
    checkConflicts,
    hasConflict,
    getConflictingAppointment,
    slotHasConflict
  }
}
