/**
 * GET /api/courses/upcoming-pgs?location=Zürich&category=PGS
 *
 * Liefert die nächsten Kurs-Termine von app.simy.ch.
 * category: 'PGS' (Motorrad Grundkurs), 'VKU', 'CZV-G', 'CZV', ...
 * Das Resultat wird 24h serverseitig gecacht — kein DB-Hit pro Pageload.
 */
import { defineEventHandler, getQuery } from 'h3'
import { useRuntimeConfig } from 'nitropack/runtime'

const ONE_DAY_S = 60 * 60 * 24

function formatDateDeCh(iso: string): string {
  return new Intl.DateTimeFormat('de-CH', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    timeZone: 'Europe/Zurich',
  }).format(new Date(iso))
}

function formatTimeDeCh(iso: string): string {
  return new Intl.DateTimeFormat('de-CH', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Europe/Zurich',
  }).format(new Date(iso))
}

interface SimySession {
  start_time: string
  end_time: string
}

interface SimyCourse {
  id: string
  name: string
  category: string | null
  city: string | null
  status: string
  max_participants: number
  current_participants: number | null
  price_per_participant_rappen: number | null
  course_sessions: SimySession[] | null
}

export interface UpcomingPgsCourse {
  id: string
  status: string
  city: string | null
  spotsRemaining: number
  maxParticipants: number
  priceChf: number | null
  bookingUrl?: string
  hasSpotCount?: boolean
  sessions: {
    date: string
    time: string
    startIso: string
  }[]
}

export default defineEventHandler(async (event) => {
  const { location = '', category = 'PGS' } = getQuery(event) as { location?: string; category?: string }
  const cfg = useRuntimeConfig(event)
  const baseUrl = (cfg.simyApiBaseUrl as string) || 'https://app.simy.ch'

  const res = await $fetch<{ courses: SimyCourse[] }>(
    `${baseUrl}/api/courses/public?slug=driving-team`,
  )

  const now = new Date()
  const locLower = location.toLowerCase()

  const courses: UpcomingPgsCourse[] = (res.courses || [])
    .filter((c) => {
      if (c.category !== category) return false
      if (!['active', 'scheduled', 'waitlist'].includes(c.status)) return false
      // Location filter (skip if no location given)
      if (locLower) {
        const nameLower = (c.name || '').toLowerCase()
        const cityLower = (c.city || '').toLowerCase()
        const matchesLocation =
          nameLower.includes(locLower) ||
          cityLower.includes(locLower) ||
          (locLower === 'zürich' && nameLower.includes('altstetten'))
        if (!matchesLocation) return false
      }
      // Einzelne Kursteile ausblenden (gilt für PGS; andere Kategorien haben keine solchen Namen)
      if (category === 'PGS' && /teil\s*[123]/i.test(c.name || '')) return false
      // Kurs nur zeigen wenn die erste Session noch nicht begonnen hat
      const sortedSessions = (c.course_sessions || []).sort((a, b) => a.start_time.localeCompare(b.start_time))
      if (sortedSessions.length === 0) return false
      return new Date(sortedSessions[0].start_time) > now
    })
    .map((c) => {
      // Alle Sessions anzeigen, chronologisch sortiert
      const sessions = (c.course_sessions || [])
        .sort((a, b) => a.start_time.localeCompare(b.start_time))

      const spots = Math.max(0, (c.max_participants || 5) - (c.current_participants || 0))

      return {
        id: c.id,
        status: c.status,
        city: c.city,
        spotsRemaining: spots,
        maxParticipants: c.max_participants,
        priceChf: c.price_per_participant_rappen
          ? Math.round(c.price_per_participant_rappen / 100)
          : null,
        sessions: sessions.map((s) => ({
          date: formatDateDeCh(s.start_time),
          time: `${formatTimeDeCh(s.start_time)}–${formatTimeDeCh(s.end_time)}`,
          startIso: s.start_time,
        })),
      }
    })
    .filter((c) => c.sessions.length > 0)
    .sort((a, b) =>
      (a.sessions[0]?.startIso || '').localeCompare(b.sessions[0]?.startIso || ''),
    )
    .slice(0, 4)

  return { courses }
})
