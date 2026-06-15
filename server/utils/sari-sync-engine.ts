/**
 * SARI Sync Engine
 * Handles synchronization between SARI and Simy databases
 * Manages course syncing, student mappings, and conflict resolution
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { SARIClient, SARICourse, SARICourseGroup } from '~/utils/sariClient'
import { logger } from '~/utils/logger'
import {
  matchSariInstructorToStaff,
  lookupExternalInstructorEmail,
  createStaffCourseAppointments,
  notifyStaffAssigned,
  sendExternalInstructorInvite,
  notifyAdminMissingExternalEmail,
  notifyAdminMissingInstructors,
} from '~/server/utils/course-staff-notifications'

export interface SyncResult {
  success: boolean
  operation: string
  status: 'success' | 'error' | 'partial'
  synced_count: number
  error_count: number
  errors: string[]
  metadata: Record<string, any>
}

export interface CourseMapping {
  sari_course_id: number
  simy_course_id: string
  tenant_id: string
  sari_name: string
  simy_name: string
  last_synced_at: string
}

export interface CustomerMapping {
  sari_faberid: string
  simy_user_id: string
  tenant_id: string
  birthdate: string
  last_synced_at: string
}

export class SARISyncEngine {
  constructor(
    private supabase: SupabaseClient,
    private sari: SARIClient,
    private tenantId: string
  ) {}

  /**
   * Sync all courses for a given type (VKU or PGS)
   * Creates courses from SARI groups and course_sessions from individual parts
   */
  async syncAllCourses(courseType: 'VKU' | 'PGS'): Promise<SyncResult> {
    const logEntry = {
      tenant_id: this.tenantId,
      operation: 'SYNC_COURSES',
      status: 'pending' as const,
      result: {} as any,
      error_message: null as string | null,
      metadata: { course_type: courseType }
    }

    try {
      logger.debug(`🔄 Starting SARI course sync for ${courseType}`, {
        tenant_id: this.tenantId
      })

      // 0. Load partial enrollment config for this category type (once per sync run)
      const { data: categoryConfig } = await this.supabase
        .from('course_categories')
        .select('allow_partial_enrollment, partial_start_position, partial_price_rappen')
        .eq('tenant_id', this.tenantId)
        .eq('code', courseType)
        .maybeSingle()

      const partialConfig = categoryConfig || null

      // 1. Fetch course GROUPS from SARI (each group = 1 course with multiple sessions)
      const courseGroups = await this.sari.getCourseGroups(courseType)
      logger.debug(`📥 Fetched ${courseGroups.length} course groups from SARI`)

      let syncedCourses = 0
      let syncedSessions = 0
      let syncedParticipants = 0
      const errors: string[] = []

      // 2. Process each course GROUP
      for (const group of courseGroups) {
        try {
          const result = await this.mapAndStoreCourseGroup(group, courseType, partialConfig)
          if (result) {
            syncedCourses++
            syncedSessions += result.sessionsCreated
            syncedParticipants += result.participantsSynced || 0
          }
        } catch (err: any) {
          const errMsg = `Failed to sync course group "${group.name}": ${err.message}`
          logger.error(errMsg, { group_name: group.name })
          errors.push(errMsg)
        }
      }

      // 3. Clean up deleted courses (deactivate courses that no longer exist in SARI)
      const deletedCount = await this.cleanupDeletedCourses(courseType, courseGroups)

      // 3b. Remind admin about any SARI courses that still have no instructor
      try {
        await notifyAdminMissingInstructors(this.supabase, this.tenantId)
      } catch (e: any) {
        logger.warn('⚠️ Missing-instructor reminder failed (non-fatal):', e.message)
      }

      // 4. Log success
      logEntry.status = errors.length === 0 ? 'success' : 'partial'
      logEntry.result = {
        courses_synced: syncedCourses,
        sessions_synced: syncedSessions,
        participants_synced: syncedParticipants,
        courses_failed: errors.length,
        courses_deleted: deletedCount
      }

      await this.logSyncOperation(logEntry)

      return {
        success: errors.length === 0,
        operation: 'SYNC_COURSES',
        status: logEntry.status,
        synced_count: syncedCourses,
        error_count: errors.length,
        errors,
        metadata: {
          course_type: courseType,
          courses_synced: syncedCourses,
          sessions_synced: syncedSessions,
          participants_synced: syncedParticipants,
          courses_deleted: deletedCount
        }
      }
    } catch (error: any) {
      const errMsg = error.message || 'Unknown error'
      logger.error(`❌ SARI course sync failed: ${errMsg}`, {
        tenant_id: this.tenantId,
        course_type: courseType
      })

      logEntry.status = 'error'
      logEntry.error_message = errMsg

      await this.logSyncOperation(logEntry)

      return {
        success: false,
        operation: 'SYNC_COURSES',
        status: 'error',
        synced_count: 0,
        error_count: 1,
        errors: [errMsg],
        metadata: { course_type: courseType }
      }
    }
  }

  /**
   * Clean up deleted courses from SARI
   * Mark courses as inactive if they no longer exist in SARI
   */
  private async cleanupDeletedCourses(
    courseType: 'VKU' | 'PGS',
    activeGroups: SARICourseGroup[]
  ): Promise<number> {
    try {
      // Get all active SARI course IDs from current groups
      const activeSariIds = activeGroups.flatMap(group => 
        group.courses?.map((s: any) => s.id) || []
      )
      
      // Find group IDs for all active courses
      const activeGroupIds = activeGroups.map(group => 
        `GROUP_${(group.courses || []).map((s: any) => s.id).join('_')}`
      )

      logger.debug(`📋 Checking for deleted courses: ${activeGroupIds.length} active groups`)

      // Find all SARI-managed courses for this tenant and type that are NOT in the active list
      const { data: orphanedCourses } = await this.supabase
        .from('courses')
        .select('id, sari_course_id, name')
        .eq('tenant_id', this.tenantId)
        .eq('category', courseType)
        .eq('sari_managed', true)
        .eq('is_active', true)

      if (!orphanedCourses || orphanedCourses.length === 0) {
        logger.debug('✅ No SARI courses to check for deletion')
        return 0
      }

      let deletedCount = 0

      for (const course of orphanedCourses) {
        // Check if this course's sari_course_id is in the active list
        if (!activeGroupIds.includes(course.sari_course_id)) {
          logger.warn(`🗑️  Deactivating deleted SARI course: "${course.name}" (SARI ID: ${course.sari_course_id})`)

          // Soft delete: Set is_active to false and status to 'cancelled' (for SARI-deleted courses)
          const { error } = await this.supabase
            .from('courses')
            .update({
              is_active: false,
              status: 'cancelled',
              status_changed_at: new Date().toISOString(),
              status_changed_by: null, // System-initiated deletion
              updated_at: new Date().toISOString()
            })
            .eq('id', course.id)

          if (error) {
            logger.error(`Failed to deactivate course ${course.id}: ${error.message}`)
          } else {
            deletedCount++
            logger.info(`✅ Deactivated course ${course.id}: "${course.name}"`)
          }
        }
      }

      if (deletedCount > 0) {
        logger.info(`🧹 Cleanup: Deactivated ${deletedCount} deleted SARI courses`)
      }

      return deletedCount
    } catch (err: any) {
      logger.error(`Failed to cleanup deleted courses: ${err.message}`)
      return 0
    }
  }

  /**
   * Map a SARI course GROUP to a Simy course + sessions
   * Group = "Verkehrskunde Lachen" with sessions Teil 1, 2, 3, 4
   */
  private async mapAndStoreCourseGroup(
    group: SARICourseGroup,
    courseType: 'VKU' | 'PGS',
    partialConfig?: { allow_partial_enrollment: boolean; partial_start_position: number; partial_price_rappen: number } | null
  ): Promise<{ courseId: string; sessionsCreated: number; participantsSynced: number } | null> {
    const sessions = group.courses || []
    if (sessions.length === 0) {
      logger.warn(`Course group "${group.name}" has no sessions, skipping`)
      return null
    }

    // Get first session for location info
    const firstSession = sessions[0]
    const location = firstSession.address 
      ? `${firstSession.address.address}, ${firstSession.address.zip} ${firstSession.address.city}`
      : ''
    
    // Parse group start date
    const groupDate = group.date ? new Date(group.date.replace(' ', 'T')) : new Date()
    const formattedDate = groupDate.toLocaleDateString('de-CH', { 
      day: '2-digit', month: '2-digit', year: 'numeric' 
    })

    // Standard VKU/PGS settings
    // VKU: 12 participants per course
    // PGS: 5 participants per course
    const maxParticipants = courseType === 'VKU' ? 12 : 5
    // current_participants = 0 initially, wird durch Registrierungen gepflegt
    const currentParticipants = 0
    
    // Calculate free places (will be updated after participant sync)
    const freePlaces = maxParticipants - currentParticipants

    // Create unique identifier from first session's SARI ID for the group
    const groupSariId = `GROUP_${sessions.map(s => s.id).join('_')}`

    // Extract instructor name from SARI data
    // SARI may provide instructor in different fields: instructor, teacher, or address.name (location)
    const instructorName = firstSession.instructor || firstSession.teacher || firstSession.address?.name || 'SARI Kursleiter'
    
    // Prepare course data
    const courseData = {
      tenant_id: this.tenantId,
      category: courseType,
      name: `${group.name} - ${formattedDate}`,
      description: location, // Just the address: street, number, zip, city
      max_participants: maxParticipants,
      current_participants: currentParticipants,
      instructor_id: null,
      external_instructor_name: instructorName,
      sari_managed: true,
      sari_course_id: groupSariId,
      sari_sync_status: 'synced',
      sari_last_sync: new Date().toISOString()
    }

    // Determine if this is a partial-only course (SARI created a course with only the final session(s))
    const isPartialOnly = !!(
      partialConfig?.allow_partial_enrollment &&
      sessions.length > 0 &&
      sessions.length < (partialConfig.partial_start_position ?? 3)
    )

    // Check if course already exists
    const { data: existing } = await this.supabase
      .from('courses')
      .select('id, status, current_participants, price_per_participant_rappen, is_partial_only')
      .eq('sari_course_id', groupSariId)
      .eq('tenant_id', this.tenantId)
      .maybeSingle()

    let courseId: string

    if (existing) {
      // Skip courses that were manually cancelled by an admin — don't re-activate them
      if (existing.status === 'cancelled') {
        logger.debug(`⏭️ Skipping SARI sync for manually cancelled course "${group.name}" (${groupSariId})`)
        return null
      }

      // Update existing course - preserve manually-set fields
      const updateData = {
        ...courseData,
        current_participants: existing.current_participants,
        // Preserve price if already set manually (SARI doesn't provide pricing).
        // Exception: if this is a partial-only course and has no manual price yet,
        // use the category's partial_price_rappen.
        price_per_participant_rappen: (() => {
          if ((existing.price_per_participant_rappen ?? 0) > 0) {
            return existing.price_per_participant_rappen
          }
          if (isPartialOnly && (partialConfig?.partial_price_rappen ?? 0) > 0) {
            return partialConfig!.partial_price_rappen
          }
          return existing.price_per_participant_rappen ?? 0
        })(),
        is_partial_only: isPartialOnly
      }
      
      const { error: updateError } = await this.supabase
        .from('courses')
        .update(updateData)
        .eq('id', existing.id)

      if (updateError) {
        throw new Error(`Failed to update course: ${updateError.message}`)
      }
      courseId = existing.id
      
      // Sessions are updated in-place below (upsert by sari_session_id)
      // so we no longer delete-all here — that would lose instructor assignments
      // and trigger unique-constraint errors on re-insert.
    } else {
      // Create new course — use partial price if applicable
      const insertData = {
        ...courseData,
        is_partial_only: isPartialOnly,
        price_per_participant_rappen: (isPartialOnly && (partialConfig?.partial_price_rappen ?? 0) > 0)
          ? partialConfig!.partial_price_rappen
          : 0
      }

      const { data: newCourse, error: insertError } = await this.supabase
        .from('courses')
        .insert(insertData)
        .select('id')
        .single()

      if (insertError) {
        throw new Error(`Failed to create course: ${insertError.message}`)
      }
      courseId = newCourse.id
    }

    // Upsert sessions by sari_session_id:
    //   - Existing sessions are updated (times, location, description) while
    //     instructor fields set via the admin UI are intentionally preserved.
    //   - New sessions are inserted.
    //   - Sessions that SARI no longer includes are deleted afterwards.
    let sessionsUpserted = 0
    const sariSessionIds: string[] = []

    for (let i = 0; i < sessions.length; i++) {
      const sariSession = sessions[i]
      const sariSessionIdStr = String(sariSession.id)
      sariSessionIds.push(sariSessionIdStr)

      if (i === 0) {
        logger.debug(`📋 SARI session structure (first session):`, {
          id: sariSession.id,
          name: sariSession.name,
          date: sariSession.date,
          fields: Object.keys(sariSession)
        })
      }

      // Parse session date (format from SARI: "2026-01-10 08:00")
      // SARI sends times in Swiss local time → convert to UTC for storage.
      const localTimeStr = sariSession.date.replace(' ', 'T') + ':00'
      const approxUtc = new Date(localTimeStr + 'Z')
      const zurichStr = approxUtc.toLocaleString('sv-SE', { timeZone: 'Europe/Zurich' })
      const zurichFake = new Date(zurichStr.replace(' ', 'T') + 'Z')
      const offsetMs = approxUtc.getTime() - zurichFake.getTime()
      const startDate = new Date(approxUtc.getTime() + offsetMs)

      const durationHours = courseType === 'VKU' ? 2 : 4
      const endDate = new Date(startDate.getTime() + durationHours * 60 * 60 * 1000)

      // Build address string, avoiding double zip+city if address.address already contains it
      const buildLocation = (addr: any): string | null => {
        if (!addr) return null
        const zipCity = `${addr.zip} ${addr.city}`.trim()
        const street = (addr.address || '').trim()
        if (street.includes(zipCity)) return street
        return zipCity ? `${street}, ${zipCity}` : street || null
      }

      // Fields updated from SARI on every sync
      const sariFields = {
        session_number: i + 1,
        title: sariSession.name,
        description: `SARI ID: ${sariSession.id}`,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        custom_location: buildLocation(sariSession.address),
        is_active: true,
        updated_at: new Date().toISOString(),
      }

      // Check if this session already exists for this course
      const { data: existing } = await this.supabase
        .from('course_sessions')
        .select('id')
        .eq('course_id', courseId)
        .eq('sari_session_id', sariSessionIdStr)
        .maybeSingle()

      if (existing) {
        // Update — keep instructor fields as-is
        const { error } = await this.supabase
          .from('course_sessions')
          .update(sariFields)
          .eq('id', existing.id)
        if (error) logger.error(`Failed to update session ${sariSessionIdStr}: ${error.message}`)
        else sessionsUpserted++
      } else {
        // Insert new session (instructor fields default to null → set manually in admin UI)
        const { error } = await this.supabase
          .from('course_sessions')
          .insert({
            course_id: courseId,
            tenant_id: this.tenantId,
            sari_session_id: sariSessionIdStr,
            ...sariFields,
          })
        if (error) logger.error(`Failed to insert session ${sariSessionIdStr}: ${error.message}`)
        else sessionsUpserted++
      }
    }

    // Remove sessions that are no longer in SARI (e.g. cancelled sessions)
    if (sariSessionIds.length > 0) {
      await this.supabase
        .from('course_sessions')
        .delete()
        .eq('course_id', courseId)
        .not('sari_session_id', 'in', `(${sariSessionIds.join(',')})`)
    }

    const sessionsCreated = sessionsUpserted

    // Sync participants from SARI for all sessions in this group.
    // Duplicate protection: syncCourseParticipants checks both participant_id
    // (Wallee flow) and sari_faberid (Cash flow) with confirmed/enrolled status filter.
    let participantsSynced = 0
    for (const sariSession of sessions) {
      try {
        const syncedCount = await this.syncCourseParticipants(courseId, sariSession.id, courseType)
        participantsSynced += syncedCount
      } catch (err: any) {
        logger.error(`Failed to sync participants for session ${sariSession.id}: ${err.message}`)
      }
    }

    // Get actual registration count (including existing ones)
    const { data: registrations } = await this.supabase
      .from('course_registrations')
      .select('id')
      .eq('course_id', courseId)

    const totalParticipants = registrations?.length || 0

    // Always update course with actual participant count from registrations
    logger.debug(`📊 Updating course ${courseId} with ${totalParticipants} total registrations (${participantsSynced} new)`)
    
    const { error: updateError } = await this.supabase
      .from('courses')
      .update({
        current_participants: totalParticipants
      })
      .eq('id', courseId)

    if (updateError) {
      logger.error(`Failed to update participant count: ${updateError.message}`)
    } else {
      logger.debug(`✅ Updated course participant count to ${totalParticipants}`)
    }

    // Update session-level participant counts accounting for cross-session transfers
    await this.syncSessionParticipantCounts(courseId)

    logger.debug(`✅ Course group synced: "${group.name}" → ${courseId} with ${sessionsCreated} sessions and ${participantsSynced} new participants`)

    // ── Post-sync: fuzzy match SARI instructor → internal staff ──────────────
    // Only runs for sessions that have no staff_id yet AND have not been notified.
    try {
      const sariInstructorName = firstSession.instructor || firstSession.teacher || null

      if (sariInstructorName) {
        // 1. Try to match to an internal staff member
        const matchedStaffId = await matchSariInstructorToStaff(
          this.supabase,
          this.tenantId,
          sariInstructorName,
        )

        // Load new (unnotified, unassigned) sessions for this course
        const { data: unnotifiedSessions } = await this.supabase
          .from('course_sessions')
          .select('id, start_time, end_time, description, staff_id, instructor_type, staff_notified_at, external_instructor_notified_at')
          .eq('course_id', courseId)
          .is('staff_notified_at', null)
          .is('external_instructor_notified_at', null)

        const newSessions = (unnotifiedSessions || []).filter((s) => !s.staff_id)

        if (newSessions.length > 0) {
          // Load full course for notification context
          const { data: courseRecord } = await this.supabase
            .from('courses')
            .select('id, name, tenant_id, category, course_category:course_categories(name, icon)')
            .eq('id', courseId)
            .single()

          if (courseRecord) {
            if (matchedStaffId) {
              // ── Internal staff matched ───────────────────────────────────
              await this.supabase
                .from('course_sessions')
                .update({ instructor_type: 'internal', staff_id: matchedStaffId })
                .in('id', newSessions.map((s) => s.id))

              await createStaffCourseAppointments(this.supabase, matchedStaffId, courseRecord as any, newSessions)
              await notifyStaffAssigned(this.supabase, matchedStaffId, courseRecord as any, newSessions)

              await this.supabase
                .from('course_sessions')
                .update({ staff_notified_at: new Date().toISOString() })
                .in('id', newSessions.map((s) => s.id))

              logger.debug(`✅ SARI post-sync: internal staff ${matchedStaffId} assigned + notified`)
            } else {
              // ── No internal match → treat as external ────────────────────
              // Check if we already have an email from a previous course
              const historicalEmail = await lookupExternalInstructorEmail(
                this.supabase,
                this.tenantId,
                sariInstructorName,
              )

              if (historicalEmail) {
                // Known external instructor — store email and send invite
                await this.supabase
                  .from('course_sessions')
                  .update({
                    instructor_type: 'external',
                    external_instructor_name: sariInstructorName,
                    external_instructor_email: historicalEmail,
                    external_instructor_notified_at: new Date().toISOString(),
                  })
                  .in('id', newSessions.map((s) => s.id))

                await sendExternalInstructorInvite(
                  this.supabase,
                  this.tenantId,
                  courseRecord as any,
                  sariInstructorName,
                  historicalEmail,
                  newSessions,
                )

                logger.debug(`✅ SARI post-sync: external instructor "${sariInstructorName}" found via history → ICS sent`)
              } else {
                // Unknown external instructor — set name only, notify admin
                await this.supabase
                  .from('course_sessions')
                  .update({
                    instructor_type: 'external',
                    external_instructor_name: sariInstructorName,
                  })
                  .in('id', newSessions.map((s) => s.id))

                await notifyAdminMissingExternalEmail(
                  this.supabase,
                  this.tenantId,
                  courseRecord.name,
                  sariInstructorName,
                  newSessions,
                )

                logger.debug(`⚠️ SARI post-sync: external instructor "${sariInstructorName}" has no email — admin notified`)
              }
            }
          }
        }
      }
    } catch (postSyncErr: any) {
      logger.warn('⚠️ Post-sync staff match/notification failed (non-fatal):', postSyncErr.message)
    }

    return { courseId, sessionsCreated, participantsSynced }
  }

  /**
   * Update course_sessions.current_participants based on actual confirmed registrations,
   * correctly accounting for participants who transferred a session to a different course.
   *
   * A participant attends session N of this course unless their custom_sessions[N] is set
   * (which means they transferred that specific session to another course).
   */
  private async syncSessionParticipantCounts(courseId: string): Promise<void> {
    try {
      const { data: courseSessions } = await this.supabase
        .from('course_sessions')
        .select('id, session_number')
        .eq('course_id', courseId)

      if (!courseSessions || courseSessions.length === 0) return

      const { data: registrations } = await this.supabase
        .from('course_registrations')
        .select('id, custom_sessions')
        .eq('course_id', courseId)
        .in('status', ['confirmed', 'enrolled'])

      const allRegs = registrations || []

      for (const session of courseSessions) {
        const sNum = String(session.session_number)
        const count = allRegs.filter(reg => {
          if (!reg.custom_sessions) return true
          const override = (reg.custom_sessions as Record<string, any>)[sNum]
          return !override
        }).length

        const { error } = await this.supabase
          .from('course_sessions')
          .update({ current_participants: count })
          .eq('id', session.id)

        if (error) {
          logger.error(`Failed to update session ${session.id} participant count: ${error.message}`)
        }
      }

      logger.debug(`✅ Session-level participant counts updated for course ${courseId}`)
    } catch (err: any) {
      logger.error(`Failed to sync session participant counts: ${err.message}`)
    }
  }

  /**
   * Sync participants from a SARI course to Simy
   * Creates course_participants if they don't exist and creates course registrations
   */
  async syncCourseParticipants(simyCourseId: string, sariCourseId: number, courseType: 'VKU' | 'PGS' = 'PGS'): Promise<number> {
    try {
      logger.debug(`📥 Syncing participants for SARI course ${sariCourseId}...`)
      
      // Get participants from SARI
      const participants = await this.sari.getCourseDetail(sariCourseId)
      
      if (!participants || participants.length === 0) {
        logger.debug(`No participants found for SARI course ${sariCourseId}`)
        return 0
      }

      let syncedCount = 0

      for (const participant of participants) {
        if (!participant.faberid) {
          logger.warn(`Participant without faberid, skipping`)
          continue
        }

        try {
          // Try to get full customer data from SARI
          let fullCustomerData = null
          try {
            if (participant.birthdate) {
              fullCustomerData = await this.sari.getCustomer(participant.faberid, participant.birthdate)
              logger.debug(`📥 Got full customer data for ${participant.faberid}`)
            }
          } catch (err: any) {
            logger.warn(`Could not fetch full customer data for ${participant.faberid}: ${err.message}`)
          }

          // Normalize faberid: SARI's getCourseDetail pads with leading zeros (e.g. "007181751")
          // but getCustomer returns without padding (e.g. "7181751"). Use the canonical form
          // from fullCustomerData if available, otherwise strip leading zeros for consistency.
          const canonicalFaberid = fullCustomerData?.faberid || participant.faberid.replace(/^0+/, '') || participant.faberid

          // Check if an active registration already exists for this course + faberid
          const { data: existingByFaberid } = await this.supabase
            .from('course_registrations')
            .select('id')
            .eq('course_id', simyCourseId)
            .eq('sari_faberid', canonicalFaberid)
            .in('status', ['confirmed', 'enrolled', 'pending'])
            .maybeSingle()

          if (!existingByFaberid) {
            // Create course_registration directly — participant_id stays null (same as Wallee flow).
            // We do NOT write to course_participants as that table may not exist in all environments.
            const registrationData: any = {
              course_id: simyCourseId,
              participant_id: null,
              tenant_id: this.tenantId,
              
              // Status: treat all SARI-synced participants as confirmed
              status: 'confirmed',
              payment_status: 'paid',
              
              // Personal data inline (mirrored from SARI)
              first_name: fullCustomerData?.firstname || participant.firstname || 'Unbekannt',
              last_name: fullCustomerData?.lastname || participant.lastname || 'Unbekannt',
              email: null,
              phone: null,
              sari_faberid: canonicalFaberid,
              street: fullCustomerData?.address || null,
              zip: fullCustomerData?.zip || null,
              city: fullCustomerData?.city || null,
              
              // SARI audit trail
              sari_data: fullCustomerData ? {
                faberid: fullCustomerData.faberid,
                firstname: fullCustomerData.firstname,
                lastname: fullCustomerData.lastname,
                birthdate: fullCustomerData.birthdate,
                address: fullCustomerData.address,
                zip: fullCustomerData.zip,
                city: fullCustomerData.city,
                syncedAt: new Date().toISOString(),
                syncSource: 'SARI_SYNC_ENGINE'
              } : null,
              
              // License/qualification data
              sari_licenses: fullCustomerData?.licenses && fullCustomerData.licenses.length > 0 ? {
                licenses: fullCustomerData.licenses.map((license: any) => ({
                  category: license.category,
                  expirationdate: license.expirationdate,
                })),
                licenses_count: fullCustomerData.licenses.length,
                synced_at: new Date().toISOString()
              } : null,
              
              sari_synced: true,
              sari_synced_at: new Date().toISOString(),
              notes: `Auto-imported from SARI on ${new Date().toLocaleDateString('de-CH')} | SARI ID: ${canonicalFaberid}`,
              created_at: new Date().toISOString()
            }

            const { error: regError } = await this.supabase
              .from('course_registrations')
              .insert(registrationData)

            if (regError) {
              const errDetail = regError.message || regError.details || regError.hint || regError.code || JSON.stringify(regError)
              logger.error(`Error creating registration for ${canonicalFaberid}: ${errDetail}`)
            } else {
              syncedCount++
              logger.debug(`✅ Created registration for ${canonicalFaberid}: ${registrationData.first_name} ${registrationData.last_name}`)
            }
          }
        } catch (err: any) {
          logger.error(`Error processing participant ${participant.faberid}: ${err.message}`)
        }
      }

      return syncedCount
    } catch (err: any) {
      logger.error(`Failed to sync participants for SARI course ${sariCourseId}: ${err.message}`)
      return 0
    }
  }

  /**
   * Sync a specific student's enrollment status with SARI
   */
  async syncStudentEnrollments(faberid: string): Promise<SyncResult> {
    const logEntry = {
      tenant_id: this.tenantId,
      operation: 'SYNC_STUDENT_ENROLLMENTS',
      status: 'pending' as const,
      result: {} as any,
      error_message: null as string | null,
      metadata: { faberid }
    }

    try {
      logger.debug(`🔄 Syncing enrollments for student ${faberid}`)

      // 1. Find or create user mapping
      const simy_user_id = await this.findOrCreateUserByFABERID(faberid)

      // 2. Get user's current enrollments from Simy
      const { data: enrollments, error: enrollError } = await this.supabase
        .from('course_registrations')
        .select('*')
        .eq('user_id', simy_user_id)
        .eq('tenant_id', this.tenantId)

      if (enrollError) {
        throw new Error(
          `Failed to fetch enrollments: ${enrollError.message}`
        )
      }

      logEntry.status = 'success'
      logEntry.result = { enrollments_checked: enrollments?.length || 0 }

      await this.logSyncOperation(logEntry)

      return {
        success: true,
        operation: 'SYNC_STUDENT_ENROLLMENTS',
        status: 'success',
        synced_count: enrollments?.length || 0,
        error_count: 0,
        errors: [],
        metadata: { faberid, user_id: simy_user_id }
      }
    } catch (error: any) {
      const errMsg = error.message || 'Unknown error'
      logger.error(`❌ Student enrollment sync failed: ${errMsg}`, { faberid })

      logEntry.status = 'error'
      logEntry.error_message = errMsg

      await this.logSyncOperation(logEntry)

      return {
        success: false,
        operation: 'SYNC_STUDENT_ENROLLMENTS',
        status: 'error',
        synced_count: 0,
        error_count: 1,
        errors: [errMsg],
        metadata: { faberid }
      }
    }
  }

  /**
   * Find existing user by FABERID or create new one
   */
  private async findOrCreateUserByFABERID(faberid: string): Promise<string> {
    // 1. Check existing mapping
    const { data: mapping } = await this.supabase
      .from('sari_customer_mapping')
      .select('simy_user_id')
      .eq('sari_faberid', faberid)
      .eq('tenant_id', this.tenantId)
      .maybeSingle()

    if (mapping) {
      logger.debug(`✅ Found existing user mapping for ${faberid}`)
      return mapping.simy_user_id
    }

    // 2. Create new user in Simy
    // Note: In real scenario, would fetch from SARI getCustomer() first
    const { data: newUser, error: userError } = await this.supabase
      .from('users')
      .insert({
        first_name: `SARI-${faberid}`,
        last_name: 'Import',
        sari_faberid: faberid,
        tenant_id: this.tenantId,
        role: 'student',
        is_active: true
      })
      .select('id')
      .single()

    if (userError) {
      throw new Error(`Failed to create user: ${userError.message}`)
    }

    // 3. Create mapping
    await this.supabase.from('sari_customer_mapping').insert({
      sari_faberid: faberid,
      simy_user_id: newUser.id,
      tenant_id: this.tenantId,
      last_sync_at: new Date().toISOString()
    })

    logger.debug(`✅ Created new user and mapping for ${faberid}`)

    return newUser.id
  }

  /**
   * Log sync operation for audit trail
   */
  private async logSyncOperation(logEntry: any): Promise<void> {
    const { error } = await this.supabase
      .from('sari_sync_logs')
      .insert({
        ...logEntry,
        created_at: new Date().toISOString()
      })

    if (error) {
      logger.error(`Failed to log sync operation: ${error.message}`)
    }
  }

  /**
   * Get sync status for tenant
   */
  async getSyncStatus(): Promise<{
    last_sync_at: string | null
    last_sync_status: string | null
    total_syncs: number
  }> {
    const { data: logs } = await this.supabase
      .from('sari_sync_logs')
      .select('created_at, status')
      .eq('tenant_id', this.tenantId)
      .order('created_at', { ascending: false })
      .limit(1)

    const latestLog = logs?.[0]

    return {
      last_sync_at: latestLog?.created_at || null,
      last_sync_status: latestLog?.status || null,
      total_syncs: logs?.length || 0
    }
  }

  /**
   * Enroll a student in a SARI course
   * Called during payment completion for public enrollment
   */
  async enrollStudentInSARI(
    sariCourseId: string,
    faberid: string,
    birthdate: string,
    tenantId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      logger.debug('📝 Enrolling student in SARI course', {
        sariCourseId,
        faberid
      })

      // Call SARI API to enroll student
      const result = await this.sari.enrollStudent(sariCourseId, faberid)

      if (!result.success) {
        throw new Error(result.error || 'SARI enrollment failed')
      }

      logger.debug('✅ Student enrolled in SARI', {
        sariCourseId,
        faberid
      })

      return { success: true }
    } catch (err: any) {
      const error = `Failed to enroll student in SARI: ${err.message}`
      logger.error(error, { sariCourseId, faberid })
      return { success: false, error }
    }
  }
}

