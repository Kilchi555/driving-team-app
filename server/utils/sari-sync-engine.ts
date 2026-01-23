/**
 * SARI Sync Engine
 * Handles synchronization between SARI and Simy databases
 * Manages course syncing, student mappings, and conflict resolution
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { SARIClient, SARICourse, SARICourseGroup } from '~/utils/sariClient'
import { logger } from '~/utils/logger'

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
          const result = await this.mapAndStoreCourseGroup(group, courseType)
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

      // 3. Log success
      logEntry.status = errors.length === 0 ? 'success' : 'partial'
      logEntry.result = {
        courses_synced: syncedCourses,
        sessions_synced: syncedSessions,
        participants_synced: syncedParticipants,
        courses_failed: errors.length
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
          participants_synced: syncedParticipants
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
   * Map a SARI course GROUP to a Simy course + sessions
   * Group = "Verkehrskunde Lachen" with sessions Teil 1, 2, 3, 4
   */
  private async mapAndStoreCourseGroup(
    group: SARICourseGroup,
    courseType: 'VKU' | 'PGS'
  ): Promise<{ courseId: string; sessionsCreated: number; participantsSynced: number } | null> {
    const sessions = group.courses || []
    if (sessions.length === 0) {
      logger.warn(`Course group "${group.name}" has no sessions, skipping`)
      return null
    }

    // Get first session for location info
    const firstSession = sessions[0]
    const location = firstSession.address 
      ? `${firstSession.address.name}, ${firstSession.address.address}, ${firstSession.address.zip} ${firstSession.address.city}`
      : ''
    
    // Parse group start date
    const groupDate = group.date ? new Date(group.date.replace(' ', 'T')) : new Date()
    const formattedDate = groupDate.toLocaleDateString('de-CH', { 
      day: '2-digit', month: '2-digit', year: 'numeric' 
    })

    // Standard VKU/PGS settings
    const maxParticipants = 12
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
      description: `📍 ${location}\n📅 Start: ${formattedDate}\n👥 ${sessions.length} Kursteile`,
      max_participants: maxParticipants,
      current_participants: currentParticipants,
      instructor_id: null,
      external_instructor_name: instructorName,
      sari_managed: true,
      sari_course_id: groupSariId,
      sari_sync_status: 'synced',
      sari_last_sync: new Date().toISOString()
    }

    // Check if course already exists
    const { data: existing } = await this.supabase
      .from('courses')
      .select('id, current_participants')
      .eq('sari_course_id', groupSariId)
      .eq('tenant_id', this.tenantId)
      .maybeSingle()

    let courseId: string

    if (existing) {
      // Update existing course - but preserve current_participants
      const updateData = {
        ...courseData,
        current_participants: existing.current_participants // Keep existing participant count
      }
      
      const { error: updateError } = await this.supabase
        .from('courses')
        .update(updateData)
        .eq('id', existing.id)

      if (updateError) {
        throw new Error(`Failed to update course: ${updateError.message}`)
      }
      courseId = existing.id
      
      // Delete old sessions to replace with fresh data
      await this.supabase
        .from('course_sessions')
        .delete()
        .eq('course_id', courseId)
    } else {
      // Create new course
      const { data: newCourse, error: insertError } = await this.supabase
        .from('courses')
        .insert(courseData)
        .select('id')
        .single()

      if (insertError) {
        throw new Error(`Failed to create course: ${insertError.message}`)
      }
      courseId = newCourse.id
    }

    // Create sessions for each Teil
    let sessionsCreated = 0
    for (let i = 0; i < sessions.length; i++) {
      const sariSession = sessions[i]
      
      // Parse session date (format: "2026-01-10 08:00")
      const sessionDate = new Date(sariSession.date.replace(' ', 'T'))
      // Assume 2 hour sessions for VKU
      const endDate = new Date(sessionDate.getTime() + 2 * 60 * 60 * 1000)

      // Extract instructor for this session
      const sessionInstructor = sariSession.instructor || sariSession.teacher || sariSession.address?.name || 'SARI Kursleiter'
      
      const sessionData = {
        course_id: courseId,
        tenant_id: this.tenantId,
        session_number: i + 1,
        title: sariSession.name,
        description: `SARI ID: ${sariSession.id} | Freie Plätze: ${sariSession.freeplaces}`,
        start_time: sessionDate.toISOString(),
        end_time: endDate.toISOString(),
        instructor_type: 'external' as const,
        external_instructor_name: sessionInstructor,
        custom_location: sariSession.address 
          ? `${sariSession.address.address}, ${sariSession.address.zip} ${sariSession.address.city}`
          : null,
        is_active: true,
        sari_session_id: String(sariSession.id) // Store SARI course ID for enrollment
      }

      const { error: sessionError } = await this.supabase
        .from('course_sessions')
        .insert(sessionData)

      if (sessionError) {
        logger.error(`Failed to create session: ${sessionError.message}`, { 
          course_id: courseId, 
          session: sariSession.name 
        })
      } else {
        sessionsCreated++
      }
    }

    // Sync participants from all sessions in this group
    let participantsSynced = 0
    for (const sariSession of sessions) {
      try {
        const syncedCount = await this.syncCourseParticipants(courseId, sariSession.id)
        participantsSynced += syncedCount
      } catch (err: any) {
        logger.error(`Failed to sync participants for session ${sariSession.id}: ${err.message}`)
      }
    }

    // Get actual registration count (including existing ones)
    const { data: registrations, error: regError } = await this.supabase
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

    logger.debug(`✅ Course group synced: "${group.name}" → ${courseId} with ${sessionsCreated} sessions and ${participantsSynced} new participants`)

    return { courseId, sessionsCreated, participantsSynced }
  }

  /**
   * Sync participants from a SARI course to Simy
   * Creates course_participants if they don't exist and creates course registrations
   */
  async syncCourseParticipants(simyCourseId: string, sariCourseId: number): Promise<number> {
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

          // Check if course_participant with this faberid already exists
          const { data: existingParticipant } = await this.supabase
            .from('course_participants')
            .select('id, first_name, last_name, email, street, zip, city')
            .eq('tenant_id', this.tenantId)
            .eq('faberid', participant.faberid)
            .maybeSingle()

          let participantId: string

          if (existingParticipant) {
            participantId = existingParticipant.id
            
            // Update participant with SARI data if fields are empty
            const updateData: any = {}
            
            // Only fill empty fields (don't overwrite manual changes)
            if (fullCustomerData) {
              if (!existingParticipant.first_name || existingParticipant.first_name === 'Unbekannt') {
                updateData.first_name = fullCustomerData.firstname
              }
              if (!existingParticipant.last_name || existingParticipant.last_name === 'Unbekannt') {
                updateData.last_name = fullCustomerData.lastname
              }
              if (!existingParticipant.street && fullCustomerData.address) {
                updateData.street = fullCustomerData.address
              }
              if (!existingParticipant.zip && fullCustomerData.zip) {
                updateData.zip = fullCustomerData.zip
              }
              if (!existingParticipant.city && fullCustomerData.city) {
                updateData.city = fullCustomerData.city
              }
            }
            
            // Update if we have data to update
            if (Object.keys(updateData).length > 0) {
              updateData.sari_synced = true
              updateData.sari_synced_at = new Date().toISOString()
              
              const { error: updateError } = await this.supabase
                .from('course_participants')
                .update(updateData)
                .eq('id', existingParticipant.id)
              
              if (!updateError) {
                logger.debug(`✅ Updated participant ${participant.faberid} with SARI data`)
              }
            }
          } else {
            // Create new course_participant with full SARI data
            const participantData: any = {
              tenant_id: this.tenantId,
              faberid: participant.faberid,
              first_name: fullCustomerData?.firstname || participant.firstname || 'Unbekannt',
              last_name: fullCustomerData?.lastname || participant.lastname || 'Unbekannt',
              birthdate: fullCustomerData?.birthdate || participant.birthdate || null,
              sari_synced: true,
              sari_synced_at: new Date().toISOString()
            }
            
            // Add address data if available
            if (fullCustomerData) {
              if (fullCustomerData.address) participantData.street = fullCustomerData.address
              if (fullCustomerData.zip) participantData.zip = fullCustomerData.zip
              if (fullCustomerData.city) participantData.city = fullCustomerData.city
            }
            
            const { data: newParticipant, error: createError } = await this.supabase
              .from('course_participants')
              .insert(participantData)
              .select('id')
              .single()

            if (createError) {
              logger.error(`Error creating participant ${participant.faberid}: ${createError.message}`)
              continue
            }

            participantId = newParticipant.id
            logger.debug(`✅ Created participant ${participant.faberid}: ${participantData.first_name} ${participantData.last_name}`)
          }

          // Check if registration already exists
          const { data: existingReg } = await this.supabase
            .from('course_registrations')
            .select('id')
            .eq('course_id', simyCourseId)
            .eq('participant_id', participantId)
            .maybeSingle()

          if (!existingReg) {
            // Create course registration with full SARI data sync (TIER 1 enhancement)
            const registrationData: any = {
              // Core linking
              course_id: simyCourseId,
              participant_id: participantId,
              tenant_id: this.tenantId,
              
              // Status
              status: participant.confirmed ? 'confirmed' : 'pending',
              payment_status: participant.confirmed ? 'paid' : 'pending',
              
              // TIER 1: Personal Data from SARI
              first_name: fullCustomerData?.firstname || participant.firstname || 'Unbekannt',
              last_name: fullCustomerData?.lastname || participant.lastname || 'Unbekannt',
              email: participant.email || fullCustomerData?.email || null,
              phone: participant.phone || fullCustomerData?.phone || null,
              sari_faberid: participant.faberid,
              street: fullCustomerData?.address || null,
              zip: fullCustomerData?.zip || null,
              city: fullCustomerData?.city || null,
              
              // TIER 1: Full SARI Audit Trail
              sari_data: fullCustomerData ? {
                faberid: fullCustomerData.faberid,
                firstname: fullCustomerData.firstname,
                lastname: fullCustomerData.lastname,
                birthdate: fullCustomerData.birthdate,
                email: fullCustomerData.email,
                phone: fullCustomerData.phone,
                address: fullCustomerData.address,
                zip: fullCustomerData.zip,
                city: fullCustomerData.city,
                syncedAt: new Date().toISOString(),
                syncSource: 'SARI_SYNC_ENGINE'
              } : null,
              
              // TIER 1: License/Qualification Data
              sari_licenses: fullCustomerData?.licenses && fullCustomerData.licenses.length > 0 ? {
                licenses: fullCustomerData.licenses.map((license: any) => ({
                  type: license.type || 'UNKNOWN',
                  issued_date: license.date_issued,
                  issued_by: license.country || 'CH',
                  is_valid: license.valid !== false
                })),
                licenses_count: fullCustomerData.licenses.length,
                synced_at: new Date().toISOString()
              } : null,
              
              // Metadata
              sari_synced: true,
              sari_synced_at: new Date().toISOString(),
              registered_by: 'sari-sync',
              notes: `Auto-imported from SARI on ${new Date().toLocaleDateString('de-CH')} | SARI ID: ${participant.faberid}`,
              created_at: new Date().toISOString()
            }

            const { error: regError } = await this.supabase
              .from('course_registrations')
              .insert(registrationData)

            if (regError) {
              logger.error(`Error creating registration for ${participant.faberid}: ${regError.message}`)
            } else {
              syncedCount++
              logger.debug(`✅ Created registration for ${participant.faberid}:`, {
                name: `${registrationData.first_name} ${registrationData.last_name}`,
                email: registrationData.email,
                phone: registrationData.phone,
                licenses: registrationData.sari_licenses?.licenses_count || 0
              })
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

