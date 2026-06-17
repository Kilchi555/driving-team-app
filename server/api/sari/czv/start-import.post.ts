import { defineEventHandler, readBody, createError, getHeader } from 'h3'
import { getSupabaseServerWithSession } from '~/utils/supabase'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { createClientForType, toSariDate, validateImportTiming, buildExternalCourseId } from '~/server/utils/sari-czv-fl-engine'
import { logAudit } from '~/server/utils/audit'
import { logger } from '~/utils/logger'
import type { SARICzvCourseType, SARICourseImport } from '~/utils/sariCoursesV3Client'

/**
 * POST /api/sari/czv/start-import
 * Importiert oder aktualisiert einen Kurs bei SARI (CZV oder FL).
 *
 * Wichtige SARI-Regeln:
 * - Kurs muss mindestens 6 Wochen vor Kursbeginn gemeldet werden
 * - Members.FaberId = 12-stellige Führerausweisnummer (nicht 9-stellige FaberId!)
 * - Instructors.ID = SARI-interne ID (von getLecturers)
 * - Update nur möglich wenn Kurs über diese Schnittstelle erstellt wurde
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
    const {
      type,
      environment,
      courseId,
      courseData
    } = body as {
      type: SARICzvCourseType
      environment?: 'test' | 'production'
      courseId: string
      courseData: {
        description: string
        date: string
        sariCourseType: string
        location: string
        address: string
        zip: string
        comment?: string
        members: Array<{
          licenseId: string
          birthdate: string
          registrationDate: string
        }>
        instructors: Array<{
          sariId: string
          licenseId: string
          isMaster: boolean
        }>
      }
    }

    if (!type || !courseId || !courseData) {
      throw createError({
        statusCode: 400,
        statusMessage: 'type, courseId und courseData sind erforderlich'
      })
    }

    // 6-Wochen-Regel prüfen
    const timingCheck = validateImportTiming(courseData.date)
    if (!timingCheck.valid) {
      throw createError({ statusCode: 422, statusMessage: timingCheck.reason })
    }

    const client = await createClientForType(
      userProfile.tenant_id,
      type,
      environment || 'test'
    )

    const course: SARICourseImport = {
      ID: buildExternalCourseId(courseId),
      Description: courseData.description,
      Date: toSariDate(courseData.date),
      Type: courseData.sariCourseType,
      Location: courseData.location,
      Address: courseData.address,
      ZIP: courseData.zip,
      Comment: courseData.comment,
      Members: courseData.members.map((m) => ({
        FaberId: m.licenseId,
        Birthdate: toSariDate(m.birthdate),
        Registrationdate: toSariDate(m.registrationDate)
      })),
      Instructors: courseData.instructors.map((i) => ({
        ID: i.sariId,
        FaberId: i.licenseId,
        IsMaster: i.isMaster
      }))
    }

    logger.info(`🚀 SARI startImport für Kurs ${courseId} (${type}) – ${course.Members.length} Teilnehmer`)

    const result = await client.startImport(type, course)

    // Status in Datenbank aktualisieren
    await supabaseAdmin
      .from('courses')
      .update({
        sari_czv_imported: true,
        sari_czv_imported_at: new Date().toISOString(),
        sari_czv_external_id: buildExternalCourseId(courseId)
      })
      .eq('id', courseId)
      .eq('tenant_id', userProfile.tenant_id)
      .throwOnError()
      .then(() => {}) // silently ignore if column doesn't exist yet

    await logAudit({
      user_id: userProfile.id,
      action: 'sari_czv_start_import',
      resource_type: 'course',
      resource_id: courseId,
      status: result.errors.length === 0 ? 'success' : 'partial',
      details: {
        type,
        environment: environment || 'test',
        imported_count: result.importedFaberIds.length,
        warnings: result.warnings.length,
        errors: result.errors.length
      },
      ip_address: getHeader(event, 'x-forwarded-for') || 'unknown'
    }).catch((e) => logger.warn('Audit-Log fehlgeschlagen:', e))

    logger.info(`✅ SARI startImport abgeschlossen`, {
      courseId,
      imported: result.importedFaberIds.length,
      warnings: result.warnings.length,
      errors: result.errors.length
    })

    return {
      success: true,
      importedFaberIds: result.importedFaberIds,
      warnings: result.warnings,
      errors: result.errors,
      message: `${result.importedFaberIds.length} Teilnehmer erfolgreich bei SARI gemeldet.${result.warnings.length > 0 ? ` ${result.warnings.length} Warnung(en).` : ''}${result.errors.length > 0 ? ` ${result.errors.length} Fehler.` : ''}`
    }
  } catch (error: any) {
    logger.error('SARI startImport fehlgeschlagen:', { error: error.message })
    if (error.statusCode) throw error
    throw createError({ statusCode: 500, statusMessage: error.message })
  }
})
