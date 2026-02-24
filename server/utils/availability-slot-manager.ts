import { logger } from '~/utils/logger'

interface AvailabilitySlot {
  id: string
  staff_id: string
  start_time: string
  end_time: string
  is_available: boolean
  reserved_until?: string
  reserved_by_session?: string
  [key: string]: any
}

/**
 * Centralized utility for managing availability slots
 * Handles releasing, reserving, and invalidating slots
 */
export class AvailabilitySlotManager {
  constructor(private supabase: any) {}

  /**
   * Release slots - mark as available again (is_available = true)
   * Used when: appointment is cancelled, edit releases old slots, external busy time is removed
   */
  async releaseSlots(
    staffId: string,
    startTime: string,
    endTime: string,
    tenantId?: string
  ): Promise<{ success: boolean; releasedCount: number }> {
    try {
      logger.debug('🔓 Releasing overlapping slots:', {
        staffId: staffId.substring(0, 8),
        startTime,
        endTime
      })

      let query = this.supabase
        .from('availability_slots')
        .update({
          is_available: true,
          reserved_until: null,
          reserved_by_session: null,
          updated_at: new Date().toISOString()
        })
        .eq('staff_id', staffId)
        .lte('start_time', endTime)  // slot starts at or before appointment ends
        .gte('end_time', startTime)   // slot ends at or after appointment starts

      if (tenantId) {
        query = query.eq('tenant_id', tenantId)
      }

      const { error, data } = await query.select()

      if (error) {
        logger.error('❌ Error releasing slots:', error)
        return { success: false, releasedCount: 0 }
      }

      const releasedCount = data?.length || 0
      if (releasedCount > 0) {
        logger.debug(`✅ Released ${releasedCount} overlapping slots`, {
          releasedCount,
          appointmentStart: startTime,
          appointmentEnd: endTime
        })
      } else {
        logger.debug('ℹ️ No overlapping slots to release', {
          appointmentStart: startTime,
          appointmentEnd: endTime
        })
      }

      return { success: true, releasedCount }
    } catch (error: any) {
      logger.error('❌ Exception in releaseSlots:', error)
      return { success: false, releasedCount: 0 }
    }
  }

  /**
   * Invalidate slots - mark as unavailable (is_available = false)
   * Used when: appointment is created, appointment is moved to new time, external busy time is added
   */
  async invalidateSlots(
    staffId: string,
    startTime: string,
    endTime: string,
    tenantId?: string,
    sessionId?: string
  ): Promise<{ success: boolean; invalidatedCount: number }> {
    try {
      logger.debug('🔒 Invalidating overlapping slots:', {
        staffId: staffId.substring(0, 8),
        startTime,
        endTime,
        hasSession: !!sessionId
      })

      const updateData: any = {
        is_available: false,
        updated_at: new Date().toISOString()
      }

      // If sessionId provided (from booking reservation), set reserved_until
      if (sessionId) {
        updateData.reserved_by_session = sessionId
        // Reserve for 15 minutes by default
        const reservedUntil = new Date(Date.now() + 15 * 60 * 1000)
        updateData.reserved_until = reservedUntil.toISOString()
      }

      // Find overlapping slots:
      // Slot overlaps with appointment if:
      // - slot.start_time < appointment.end_time AND
      // - slot.end_time > appointment.start_time
      let query = this.supabase
        .from('availability_slots')
        .update(updateData)
        .eq('staff_id', staffId)
        .lte('start_time', endTime)  // slot starts at or before appointment ends
        .gte('end_time', startTime)   // slot ends at or after appointment starts

      if (tenantId) {
        query = query.eq('tenant_id', tenantId)
      }

      const { error, data } = await query.select()

      if (error) {
        logger.error('❌ Error invalidating slots:', error)
        return { success: false, invalidatedCount: 0 }
      }

      const invalidatedCount = data?.length || 0
      if (invalidatedCount > 0) {
        logger.debug(`✅ Invalidated ${invalidatedCount} overlapping slots`, {
          invalidatedCount,
          appointmentStart: startTime,
          appointmentEnd: endTime
        })
      } else {
        logger.debug('ℹ️ No overlapping slots to invalidate', {
          appointmentStart: startTime,
          appointmentEnd: endTime
        })
      }

      return { success: true, invalidatedCount }
    } catch (error: any) {
      logger.error('❌ Exception in invalidateSlots:', error)
      return { success: false, invalidatedCount: 0 }
    }
  }

  /**
   * Reserve specific slot for booking session
   * Used when: customer clicks on slot during booking flow
   */
  async reserveSlot(
    slotId: string,
    sessionId: string,
    tenantId?: string
  ): Promise<{ success: boolean; slot?: AvailabilitySlot }> {
    try {
      logger.debug('🔐 Reserving specific slot:', {
        slotId: slotId.substring(0, 8),
        sessionId: sessionId.substring(0, 8)
      })

      const reservedUntil = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes

      let query = this.supabase
        .from('availability_slots')
        .update({
          is_available: false,
          reserved_by_session: sessionId,
          reserved_until: reservedUntil.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', slotId)
        .eq('is_available', true)

      if (tenantId) {
        query = query.eq('tenant_id', tenantId)
      }

      const { error, data } = await query.select().single()

      if (error || !data) {
        logger.warn('❌ Could not reserve slot (already taken?):', slotId)
        return { success: false }
      }

      logger.debug('✅ Slot reserved successfully')
      return { success: true, slot: data }
    } catch (error: any) {
      logger.error('❌ Exception in reserveSlot:', error)
      return { success: false }
    }
  }

  /**
   * Find all overlapping slots for a time range
   * Used for analysis/debugging
   */
  async findOverlappingSlots(
    staffId: string,
    startTime: string,
    endTime: string,
    tenantId?: string
  ): Promise<AvailabilitySlot[]> {
    try {
      const startDate = new Date(startTime)
      const endDate = new Date(endTime)

      let query = this.supabase
        .from('availability_slots')
        .select('*')
        .eq('staff_id', staffId)
        .lt('start_time', endDate.toISOString())
        .gt('end_time', startDate.toISOString())

      if (tenantId) {
        query = query.eq('tenant_id', tenantId)
      }

      const { error, data } = await query

      if (error) {
        logger.error('❌ Error finding overlapping slots:', error)
        return []
      }

      return data || []
    } catch (error: any) {
      logger.error('❌ Exception in findOverlappingSlots:', error)
      return []
    }
  }

  /**
   * Get slot statistics for a day
   */
  async getSlotStats(
    staffId: string,
    date: string,
    tenantId?: string
  ): Promise<{ total: number; available: number; reserved: number; booked: number }> {
    try {
      const dayStart = new Date(date)
      dayStart.setUTCHours(0, 0, 0, 0)
      const dayEnd = new Date(date)
      dayEnd.setUTCHours(23, 59, 59, 999)

      let query = this.supabase
        .from('availability_slots')
        .select('id, is_available, reserved_until', { count: 'exact' })
        .eq('staff_id', staffId)
        .gte('start_time', dayStart.toISOString())
        .lte('start_time', dayEnd.toISOString())

      if (tenantId) {
        query = query.eq('tenant_id', tenantId)
      }

      const { data, count, error } = await query

      if (error) {
        logger.error('❌ Error getting slot stats:', error)
        return { total: 0, available: 0, reserved: 0, booked: 0 }
      }

      const total = count || 0
      const available = data?.filter(s => s.is_available)?.length || 0
      const reserved = data?.filter(s => !s.is_available && s.reserved_until)?.length || 0
      const booked = data?.filter(s => !s.is_available && !s.reserved_until)?.length || 0

      return { total, available, reserved, booked }
    } catch (error: any) {
      logger.error('❌ Exception in getSlotStats:', error)
      return { total: 0, available: 0, reserved: 0, booked: 0 }
    }
  }
}

/**
 * Factory function to create manager instance
 */
export function createAvailabilitySlotManager(supabase: any): AvailabilitySlotManager {
  return new AvailabilitySlotManager(supabase)
}
