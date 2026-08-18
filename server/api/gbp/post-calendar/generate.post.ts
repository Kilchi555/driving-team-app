import { defineEventHandler, createError, readBody, getQuery, getHeader, setResponseHeaders, sendStream } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { requireFeature } from '~/server/utils/require-feature'
import { resolveGbpLocation } from '~/server/utils/gbp'
import { getGbpLocationIdFromEvent } from '~/server/utils/gbp-location-param'
import { rebuildLocationPostCalendar, type CalendarProgressEvent } from '~/server/utils/gbp-post-calendar'

/**
 * POST /api/gbp/post-calendar/generate
 * Rebuild 12-month AI calendar for the location (keeps already published rows).
 * ?stream=1 or Accept: text/event-stream → live progress events.
 */
export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser?.tenant_id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  await requireFeature(authUser.tenant_id, 'gbp_enabled')

  const body = await readBody<{ locationId?: string }>(event).catch(() => ({}))
  const locationId = getGbpLocationIdFromEvent(event, body)
  const loc = await resolveGbpLocation(authUser.tenant_id, locationId)

  const query = getQuery(event)
  const accept = getHeader(event, 'accept') || ''
  const stream = query.stream === '1' || accept.includes('text/event-stream')

  if (!stream) {
    const result = await rebuildLocationPostCalendar({
      tenantId: authUser.tenant_id,
      locationId: loc.id,
    })
    return { ok: true, ...result }
  }

  setResponseHeaders(event, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  })

  const encoder = new TextEncoder()
  const sse = (payload: CalendarProgressEvent & { ok?: boolean; created?: number; withCopy?: number; message?: string }) =>
    encoder.encode(`data: ${JSON.stringify(payload)}\n\n`)

  const readable = new ReadableStream({
    async start(controller) {
      const send = (payload: CalendarProgressEvent) => {
        controller.enqueue(sse(payload))
      }
      try {
        const result = await rebuildLocationPostCalendar({
          tenantId: authUser.tenant_id,
          locationId: loc.id,
          onProgress: send,
        })
        controller.enqueue(sse({
          step: 'done',
          label: 'Fertig',
          detail: `${result.created} Slots · ${result.withCopy} Texte bereit`,
          current: result.created,
          total: result.created,
          ok: true,
          created: result.created,
          withCopy: result.withCopy,
        }))
      } catch (err: any) {
        controller.enqueue(sse({
          step: 'error',
          label: 'Fehler',
          detail: err?.statusMessage || err?.message || 'Kalender konnte nicht erzeugt werden',
          message: err?.statusMessage || err?.message || 'Kalender konnte nicht erzeugt werden',
        }))
      } finally {
        controller.close()
      }
    },
  })

  return sendStream(event, readable)
})
