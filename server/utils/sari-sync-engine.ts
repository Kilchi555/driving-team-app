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
   */
  async syncAllCourses(courseType: 'VKU' | 'PGS'): Promise<SyncResult> {
    const logEntry = {
      tenant_id: this.tenantId,
      operation: 'SYNC_COURSES',
      course_type: courseType,
      status: 'pending' as const,
      result: {} as any,
      error_message: null as string | null,
      metadata: { course_type: courseType }
    }

    try {
      logger.debug(`🔄 Starting SARI course sync for ${courseType}`, {
        tenant_id: this.tenantId
      })

      // 1. Fetch courses from SARI
      const courseGroup = await this.sari.getCourses(courseType)
      logger.debug(`📥 Fetched ${courseGroup.courses.length} courses from SARI`)

      // 2. Get existing categories for this course type
      const { data: categories, error: catError } = await this.supabase
        .from('course_categories')
        .select('*')
        .eq('tenant_id', this.tenantId)
        .eq('sari_course_type', courseType)

      if (catError) {
        throw new Error(`Failed to fetch categories: ${catError.message}`)
      }

      const syncedCourses: CourseMapping[] = []
      const errors: string[] = []

      // 3. Process each course
      for (const sariCourse of courseGroup.courses) {
        try {
          const mapped = await this.mapAndStoreCourse(
            sariCourse,
            courseType,
            categories || []
          )
          if (mapped) {
            syncedCourses.push(mapped)
          }
        } catch (err: any) {
          const errMsg = `Failed to sync course ${sariCourse.id}: ${err.message}`
          logger.error(errMsg, { sari_course_id: sariCourse.id })
          errors.push(errMsg)
        }
      }

      // 4. Log success
      logEntry.status = errors.length === 0 ? 'success' : 'partial'
      logEntry.result = {
        courses_synced: syncedCourses.length,
        courses_failed: errors.length
      }

      await this.logSyncOperation(logEntry)

      return {
        success: errors.length === 0,
        operation: 'SYNC_COURSES',
        status: logEntry.status,
        synced_count: syncedCourses.length,
        error_count: errors.length,
        errors,
        metadata: {
          course_type: courseType,
          courses_synced: syncedCourses.length
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
   * Map SARI course to Simy course and store it
   */
  private async mapAndStoreCourse(
    sariCourse: SARICourse,
    courseType: 'VKU' | 'PGS',
    categories: any[]
  ): Promise<CourseMapping | null> {
    // Find matching category
    const category = categories.find(
      c =>
        c.sari_category_code ===
        courseType /* Ideally map by specific category code */
    )

    if (!category) {
      logger.warn(`No category found for course type ${courseType}`)
      return null
    }

    // Prepare course data
    const courseData = {
      tenant_id: this.tenantId,
      category_id: category.id,
      name: sariCourse.name,
      description: sariCourse.address?.name || '',
      start_date: new Date(sariCourse.date).toISOString(),
      max_participants: sariCourse.freeplaces + 1, // Estimate
      current_participants: 0,
      location_name: sariCourse.address?.name,
      location_address: `${sariCourse.address?.address}, ${sariCourse.address?.zip} ${sariCourse.address?.city}`,
      sari_course_id: sariCourse.id,
      sari_last_sync_at: new Date().toISOString()
    }

    // Check if course already exists
    const { data: existing } = await this.supabase
      .from('courses')
      .select('id')
      .eq('sari_course_id', sariCourse.id)
      .eq('tenant_id', this.tenantId)
      .maybeSingle()

    let courseId: string

    if (existing) {
      // Update existing course
      const { error: updateError } = await this.supabase
        .from('courses')
        .update(courseData)
        .eq('id', existing.id)

      if (updateError) {
        throw new Error(`Failed to update course: ${updateError.message}`)
      }

      courseId = existing.id
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

    logger.debug(`✅ Course synced: ${sariCourse.id} → ${courseId}`)

    return {
      sari_course_id: sariCourse.id,
      simy_course_id: courseId,
      tenant_id: this.tenantId,
      sari_name: sariCourse.name,
      simy_name: courseData.name,
      last_synced_at: new Date().toISOString()
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
}

