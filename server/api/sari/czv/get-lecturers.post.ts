import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseServerWithSession } from '~/utils/supabase'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { createClientForType } from '~/server/utils/sari-czv-fl-engine'
import { logger } from '~/utils/logger'
import type { SARICzvCourseType } from '~/utils/sariCoursesV3Client'

/**
 * POST /api/sari/czv/get-lecturers
 * Lädt alle Moderatoren/Instruktoren vom SARI-System.
 * Wird gebraucht um die SARI-internen IDs für startImport zu erhalten.
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
    const { type, environment } = body as { type: SARICzvCourseType; environment?: string }

    if (!type) {
      throw createError({ statusCode: 400, statusMessage: 'type (CZV oder FL) ist erforderlich' })
    }

    const client = await createClientForType(
      userProfile.tenant_id,
      type,
      (environment as 'test' | 'production') || 'test'
    )

    const lecturers = await client.getLecturers(type)

    logger.info(`✅ SARI getLecturers für ${type}: ${lecturers.length} Moderatoren geladen`)

    return {
      success: true,
      type,
      lecturers,
      count: lecturers.length
    }
  } catch (error: any) {
    logger.error('SARI getLecturers fehlgeschlagen:', { error: error.message })
    if (error.statusCode) throw error
    throw createError({ statusCode: 500, statusMessage: error.message })
  }
})
