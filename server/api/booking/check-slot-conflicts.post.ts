/**
 * API: Check Customer Appointment Conflicts
 * 
 * PURPOSE:
 * Pre-checks if proposed slots have conflicts with customer's existing appointments
 * including travel time calculations.
 * 
 * USAGE:
 * POST /api/booking/check-slot-conflicts
 * Body: {
 *   existingAppointments: [{ location_id, postal_code, start_time, end_time }, ...],
 *   proposedSlots: [{ id, start_time, end_time }, ...],
 *   proposedLocationPostalCode: string
 * }
 */

import { defineEventHandler, readBody, createError } from 'h3'
import { getTravelTime, isPeakTime } from '~/utils/plzDistanceCache'
import { logger } from '~/utils/logger'

interface ExistingAppointment {
  location_id: string
  postal_code?: string
  start_time: string
  end_time: string
}

interface ProposedSlot {
  id: string
  start_time: string
  end_time: string
}

interface SlotConflictResult {
  slot_id: string
  has_conflict: boolean
  conflict_reason?: string
  travel_time_minutes?: number
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    
    const existingAppointments = body.existingAppointments as ExistingAppointment[]
    const proposedSlots = body.proposedSlots as ProposedSlot[]
    const proposedLocationPostalCode = body.proposedLocationPostalCode as string

    if (!Array.isArray(existingAppointments) || !Array.isArray(proposedSlots) || !proposedLocationPostalCode) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required parameters'
      })
    }

    logger.debug('🔍 Checking slot conflicts...', {
      existingAppointments: existingAppointments.length,
      proposedSlots: proposedSlots.length,
      proposedLocation: proposedLocationPostalCode
    })

    if (existingAppointments.length === 0) {
      // No conflicts possible
      return {
        success: true,
        conflicts: proposedSlots.map(slot => ({
          slot_id: slot.id,
          has_conflict: false
        }))
      }
    }

    // Pre-fetch all required travel times
    const travelTimeCache = new Map<string, number>()
    const googleApiKey = process.env.GOOGLE_MAPS_API_KEY || ''

    for (const apt of existingAppointments) {
      if (apt.postal_code && apt.postal_code !== proposedLocationPostalCode) {
        const cacheKey = `${apt.postal_code}-${proposedLocationPostalCode}`
        
        if (!travelTimeCache.has(cacheKey)) {
          try {
            const travelTime = await getTravelTime(
              apt.postal_code,
              proposedLocationPostalCode,
              new Date(),
              googleApiKey,
              {
                morning_start: '07:00',
                morning_end: '09:00',
                evening_start: '17:00',
                evening_end: '19:00'
              }
            )

            if (travelTime !== null) {
              travelTimeCache.set(cacheKey, travelTime)
            }
          } catch (err: any) {
            logger.warn('⚠️ Error fetching travel time:', err.message)
          }
        }
      }
    }

    // Check each slot for conflicts
    const results: SlotConflictResult[] = []

    for (const slot of proposedSlots) {
      const slotStart = new Date(slot.start_time).getTime()
      const slotEnd = new Date(slot.end_time).getTime()

      let hasConflict = false
      let conflictReason: string | undefined
      let travelTimeMinutes: number | undefined

      for (const apt of existingAppointments) {
        const aptStart = new Date(apt.start_time).getTime()
        const aptEnd = new Date(apt.end_time).getTime()

        // Direct time overlap check
        const directOverlap = (
          (slotStart >= aptStart && slotStart < aptEnd) ||
          (slotEnd > aptStart && slotEnd <= aptEnd) ||
          (slotStart <= aptStart && slotEnd >= aptEnd)
        )

        if (directOverlap) {
          hasConflict = true
          conflictReason = 'Direkter Zeitkonflikt'
          break
        }

        // Travel time check
        if (apt.postal_code && apt.postal_code !== proposedLocationPostalCode) {
          const cacheKey = `${apt.postal_code}-${proposedLocationPostalCode}`
          const travelTime = travelTimeCache.get(cacheKey)

          if (travelTime !== undefined && travelTime > 0) {
            const travelBufferMs = travelTime * 60 * 1000
            const requiredFreeTimeStart = aptEnd + travelBufferMs

            if (slotStart < requiredFreeTimeStart) {
              hasConflict = true
              travelTimeMinutes = travelTime
              const requiredTime = new Date(requiredFreeTimeStart)
              conflictReason = `Fahrtzeit-Konflikt: ${travelTime} Min. Fahrtzeit erforderlich. Frühestens ab ${requiredTime.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`
              break
            }
          }
        }
      }

      results.push({
        slot_id: slot.id,
        has_conflict: hasConflict,
        conflict_reason: conflictReason,
        travel_time_minutes: travelTimeMinutes
      })
    }

    logger.debug('✅ Conflict check complete', {
      total: results.length,
      conflicts: results.filter(r => r.has_conflict).length
    })

    return {
      success: true,
      conflicts: results
    }

  } catch (error: any) {
    logger.error('❌ Check slot conflicts API error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to check slot conflicts'
    })
  }
})
