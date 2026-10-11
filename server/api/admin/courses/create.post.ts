import { defineEventHandler, createError } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { logger } from '~/utils/logger'

/**
 * Legacy course-create endpoint (pre-upsert schema: course_name / category / start_date).
 * The admin UI and SARI sync use POST /api/admin/courses/upsert, which persists
 * payment_method with invoice-flag validation. This path is retained only as a
 * hard rejection so authenticated callers cannot create courses without the
 * modern payment-method semantics.
 */
export default defineEventHandler(async (event) => {
  try {
    const user = await getAuthenticatedUser(event)
    if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    if (!['admin', 'staff'].includes(user.role || '')) {
      throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
    }

    const rateLimitKey = `courses_create:${user.id}`
    const rateLimitResult = await checkRateLimit(rateLimitKey, 'admin_course_create', 20, 60 * 1000)
    if (!rateLimitResult.allowed) {
      throw createError({ statusCode: 429, statusMessage: 'Too many requests' })
    }

    logger.warn('🚫 Rejected legacy /api/admin/courses/create', {
      userId: user.id,
      tenantId: user.tenant_id,
    })

    throw createError({
      statusCode: 410,
      statusMessage:
        'Dieser Endpunkt ist veraltet. Bitte POST /api/admin/courses/upsert verwenden (inkl. Zahlungsmethode und Validierung).',
    })
  } catch (error: any) {
    if (error?.statusCode) throw error
    logger.error('❌ Error in legacy courses/create:', error)
    throw createError({
      statusCode: 500,
      statusMessage: error?.statusMessage || 'Failed',
    })
  }
})
