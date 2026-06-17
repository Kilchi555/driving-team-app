import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseServerWithSession } from '~/utils/supabase'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { createClientForType, buildExternalCourseId } from '~/server/utils/sari-czv-fl-engine'
import { logger } from '~/utils/logger'
import type { SARICzvCourseType } from '~/utils/sariCoursesV3Client'

/**
 * POST /api/sari/czv/gen-confirmation
 * Generiert Kursbestätigungen (PDF) für Teilnehmer eines abgeschlossenen Kurses.
 *
 * SARI-Bedingungen:
 * - Kurs muss bereits stattgefunden haben
 * - Kurs muss einen Moderator haben
 * - Teilnehmer müssen vorhanden sein
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
      .select('tenant_id, role')
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
      allIds = true,
      specificFaberIds = []
    } = body as {
      type: SARICzvCourseType
      environment?: 'test' | 'production'
      courseId: string
      allIds?: boolean
      specificFaberIds?: string[]
    }

    if (!type || !courseId) {
      throw createError({ statusCode: 400, statusMessage: 'type und courseId sind erforderlich' })
    }

    const client = await createClientForType(
      userProfile.tenant_id,
      type,
      environment || 'test'
    )

    const externalId = buildExternalCourseId(courseId)
    logger.info(`📄 SARI genConfirmation: ${externalId} (${type}), allIds=${allIds}`)

    const confirmation = await client.genConfirmation(type, externalId, allIds, specificFaberIds)

    logger.info(`✅ SARI genConfirmation: ${confirmation.faberIds.length} Teilnehmer, ${confirmation.fileExtension}`)

    return {
      success: true,
      faberIds: confirmation.faberIds,
      count: confirmation.faberIds.length,
      file: {
        extension: confirmation.fileExtension,
        mimeType: confirmation.mimeType,
        isBinary: confirmation.isBinary,
        // Base64-kodierter Dateiinhalt – im Frontend: atob() oder Buffer.from(data, 'base64')
        data: confirmation.data
      }
    }
  } catch (error: any) {
    logger.error('SARI genConfirmation fehlgeschlagen:', { error: error.message })

    // Sprechende Fehlermeldungen für bekannte SARI-Codes
    if (error.message?.includes('2003')) {
      throw createError({ statusCode: 422, statusMessage: 'Kurs hat noch nicht stattgefunden.' })
    }
    if (error.message?.includes('2004')) {
      throw createError({ statusCode: 422, statusMessage: 'Kein Kursmoderator vorhanden.' })
    }
    if (error.message?.includes('2006')) {
      throw createError({ statusCode: 422, statusMessage: 'Keine Kursteilnehmer vorhanden.' })
    }

    if (error.statusCode) throw error
    throw createError({ statusCode: 500, statusMessage: error.message })
  }
})
