import { defineEventHandler, readBody, createError, getHeader } from 'h3'
import { getSupabaseServerWithSession } from '~/utils/supabase'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { createClientForType, validateDeletionTiming, buildExternalCourseId } from '~/server/utils/sari-czv-fl-engine'
import { logAudit } from '~/server/utils/audit'
import { logger } from '~/utils/logger'
import type { SARICzvCourseType } from '~/utils/sariCoursesV3Client'

/**
 * POST /api/sari/czv/delete-course
 * Löscht einen Kurs bei SARI (CZV oder FL).
 *
 * SARI-Regel: Löschung nur möglich bis 4 Tage vor Kursbeginn.
 * Kurs darf keine Teilnehmer oder Moderatoren mehr enthalten.
 */
export default defineEventHandler(async (event) => {
  try {
    const supabase = getSupabaseServerWithSession(event)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      throw createError({ statusCode: 401, statusMessage: 'Authentifizierung erforderlich' })
    }

    const supabaseAdmin = getSupabaseAdmin()
    const { data: userProfile } = await supabaseAdmin
      .from('users')
      .select('tenant_id, role, id')
      .eq('auth_user_id', user.id)
      .single()

    if (!userProfile || userProfile.role !== 'admin') {
      throw createError({ statusCode: 403, statusMessage: 'Keine Berechtigung' })
    }

    const body = await readBody(event)
    const { type, environment, courseId, courseDate } = body as {
      type: SARICzvCourseType
      environment?: 'test' | 'production'
      courseId: string
      courseDate: string
    }

    if (!type || !courseId || !courseDate) {
      throw createError({
        statusCode: 400,
        statusMessage: 'type, courseId und courseDate sind erforderlich'
      })
    }

    // 4-Tage-Regel prüfen
    const timingCheck = validateDeletionTiming(courseDate)
    if (!timingCheck.valid) {
      throw createError({ statusCode: 422, statusMessage: timingCheck.reason })
    }

    const client = await createClientForType(
      userProfile.tenant_id,
      type,
      environment || 'test'
    )

    const externalId = buildExternalCourseId(courseId)
    logger.info(`🗑️ SARI deleteCourse: ${externalId} (${type})`)

    const deleted = await client.deleteCourse(type, externalId)

    if (!deleted) {
      throw new Error('SARI hat den Kurs nicht gelöscht (Result=false)')
    }

    // Status in Datenbank aktualisieren
    await supabaseAdmin
      .from('courses')
      .update({
        sari_czv_imported: false,
        sari_czv_external_id: null
      })
      .eq('id', courseId)
      .eq('tenant_id', userProfile.tenant_id)
      .then(() => {})

    await logAudit({
      user_id: userProfile.id,
      action: 'sari_czv_delete_course',
      resource_type: 'course',
      resource_id: courseId,
      status: 'success',
      details: { type, environment: environment || 'test', externalId },
      ip_address: getHeader(event, 'x-forwarded-for') || 'unknown'
    }).catch((e) => logger.warn('Audit-Log fehlgeschlagen:', e))

    logger.info(`✅ SARI deleteCourse erfolgreich: ${externalId}`)

    return {
      success: true,
      message: `Kurs ${externalId} wurde bei SARI erfolgreich gelöscht.`
    }
  } catch (error: any) {
    logger.error('SARI deleteCourse fehlgeschlagen:', { error: error.message })
    if (error.statusCode) throw error
    throw createError({ statusCode: 500, statusMessage: error.message })
  }
})
