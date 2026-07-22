/**
 * GET /api/courses/upcoming-nothelfer?location=altstetten|lachen|all
 *
 * Liefert Nothelferkurs-Termine von externen Anbietern:
 * - altstetten → Nothelfer am Bahnhof (nothelferambahnhof.ch)
 * - lachen     → Flying-Instructor
 */
import { defineEventHandler, getQuery, setResponseHeader } from 'h3'
import { fetchNothelferCourses } from '~/server/utils/nothelfer-providers'

const VALID_LOCATIONS = new Set(['altstetten', 'lachen', 'all'])

export default defineEventHandler(async (event) => {
  const { location = 'all' } = getQuery(event) as { location?: string }
  const resolvedLocation = VALID_LOCATIONS.has(location)
    ? (location as 'altstetten' | 'lachen' | 'all')
    : 'all'

  setResponseHeader(event, 'Cache-Control', 'public, max-age=3600, s-maxage=3600')

  const courses = await fetchNothelferCourses(resolvedLocation)

  return { courses }
})
