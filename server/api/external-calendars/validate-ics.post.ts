/**
 * Validate an ICS calendar URL (shape + live fetch) before connect/sync.
 * POST { ics_url: string }
 */

import { getAuthenticatedUser } from '~/server/utils/auth'
import { probeIcsUrl } from '~/server/utils/probe-ics-url'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) {
    throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
  }

  const body = await readBody(event)
  const icsUrl = body?.ics_url

  if (!icsUrl || typeof icsUrl !== 'string') {
    throw createError({
      statusCode: 400,
      statusMessage: 'ics_url is required',
    })
  }

  const result = await probeIcsUrl(icsUrl)

  if (!result.ok) {
    logger.info('ICS URL validation failed', {
      code: result.code,
      userId: authUser.id,
    })
    return {
      success: false,
      ok: false,
      url: result.url,
      code: result.code,
      message: result.message,
      tip: result.tip,
    }
  }

  if (result.veventCount === 0) {
    return {
      success: false,
      ok: false,
      url: result.url,
      bytes: result.bytes,
      vevent_count: 0,
      code: 'empty_calendar',
      message: 'Dieser Kalender-Feed enthält keine Termine.',
      tip: 'Du hast vermutlich einen leeren Kalender geteilt (z.B. einen neu erstellten „Simy“-Kalender). Teile in iCloud/Apple Calendar den Kalender, in dem deine echten Termine stehen, und verwende den neuen öffentlichen Link.',
    }
  }

  return {
    success: true,
    ok: true,
    url: result.url,
    bytes: result.bytes,
    vevent_count: result.veventCount,
    message: `Kalender-Feed OK — ${result.veventCount} Termin(e) im Feed erkannt.`,
  }
})
