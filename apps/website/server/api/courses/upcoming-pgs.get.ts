/**
 * GET /api/courses/upcoming-pgs?location=Zürich
 *
 * Liefert die nächsten Motorrad-Grundkurs-Termine (PGS) von app.simy.ch.
 * Das Resultat wird 24h serverseitig gecacht — kein DB-Hit pro Pageload.
 * Nitro-Cache: in-memory (Vercel: pro Lambda-Instanz, lokale Dev: persistent)
 */
import { defineCachedEventHandler, getQuery, useRuntimeConfig } from 'h3'

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
  spotsRemaining: number
  maxParticipants: number
  priceChf: number | null
  sessions: {
    date: string
    time: string
    startIso: string
  }[]
}

export default defineCachedEventHandler(async (event) => {
  const { location = 'Zürich' } = getQuery(event) as { location?: string }
  const cfg = useRuntimeConfig(event)
  const baseUrl = (cfg.simyApiBaseUrl as string) || 'https://app.simy.ch'

  const res = await $fetch<{ courses: SimyCourse[] }>(
    `${baseUrl}/api/courses/public?slug=driving-team`,
  )

  const now = new Date()
  const locLower = location.toLowerCase()

  const courses: UpcomingPgsCourse[] = (res.courses || [])
    .filter((c) => {
      if (c.category !== 'PGS') return false
      if (!['active', 'scheduled', 'waitlist'].includes(c.status)) return false
      const nameLower = (c.name || '').toLowerCase()
      const cityLower = (c.city || '').toLowerCase()
      const matchesLocation =
        nameLower.includes(locLower) ||
        cityLower.includes(locLower) ||
        (locLower === 'zürich' && nameLower.includes('altstetten'))
      if (!matchesLocation) return false
      // Nur vollständige Kurse, keine Einzel-Teile
      if (/teil\s*[123]/i.test(c.name || '')) return false
      // Muss mind. eine zukünftige Session haben
      return (c.course_sessions || []).some((s) => new Date(s.start_time) > now)
    })
    .map((c) => {
      const sessions = (c.course_sessions || [])
        .filter((s) => new Date(s.start_time) > now)
        .sort((a, b) => a.start_time.localeCompare(b.start_time))

      const spots = Math.max(0, (c.max_participants || 5) - (c.current_participants || 0))

      return {
        id: c.id,
        status: c.status,
        spotsRemaining: spots,
        maxParticipants: c.max_participants,
        priceChf: c.price_per_participant_rappen
          ? Math.round(c.price_per_participant_rappen / 100)
          : null,
        sessions: sessions.slice(0, 3).map((s) => ({
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
}, {
  maxAge: ONE_DAY_S,
  getKey: (event) => `pgs-upcoming-${((getQuery(event) as Record<string, string>).location) || 'Zürich'}`,
})
