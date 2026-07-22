import type { UpcomingPgsCourse } from '~/server/api/courses/upcoming-pgs.get'

const NAMB_IFRAME_URL = 'https://www.nothelferambahnhof.ch/iframe/nothelferkurs-altstetten'
const FLYING_INSTRUCTOR_URL =
  'https://flying-instructor.ch/iframe/Dxez1tKe5Z4ITnBy2iRdexoOXgvVrshe.eiurNYlQ'

const BOOKING_URLS = {
  altstetten: 'https://drivingteam.ch/nothelferkurs-buchen/nothelfer/',
  lachen: 'https://drivingteam.ch/nothelferkurs-buchen/flying/',
} as const

function formatDateDeChFromYmd(date: string): string {
  const [year, month, day] = date.split('-').map(Number)
  const noonUtc = new Date(Date.UTC(year, month - 1, day, 12))
  return new Intl.DateTimeFormat('de-CH', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(noonUtc)
}

function formatTimeRangeFromClock(start: string, end: string): string {
  return `${start}–${end}`
}

function toSortableIso(date: string, time: string): string {
  return `${date}T${time}:00`
}

interface NambScheduleEntry {
  date: string
  start: string
  end: string
}

interface NambCourse {
  id: string
  status: string
  start_date: string
  city: string
  price: string
  max_participants: number
  number_of_participants: number
  schedule: NambScheduleEntry[]
}

function parseNambCourses(html: string): UpcomingPgsCourse[] {
  const match = html.match(/<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s)
  if (!match?.[1]) return []

  const data = JSON.parse(match[1]) as {
    props?: { pageProps?: { courses?: NambCourse[] } }
  }
  const now = new Date()

  return (data.props?.pageProps?.courses ?? [])
    .filter((course) => course.status === 'ENABLED' && new Date(course.start_date) > now)
    .map((course) => {
      const sessions = [...(course.schedule ?? [])]
        .sort((a, b) => `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`))
        .map((entry) => ({
          date: formatDateDeChFromYmd(entry.date),
          time: formatTimeRangeFromClock(entry.start, entry.end),
          startIso: toSortableIso(entry.date, entry.start),
        }))

      const spots = Math.max(0, (course.max_participants || 0) - (course.number_of_participants || 0))

      return {
        id: `namb-${course.id}`,
        status: 'active',
        city: course.city || 'Zürich',
        spotsRemaining: spots,
        maxParticipants: course.max_participants,
        priceChf: Number.parseInt(course.price, 10) || 120,
        bookingUrl: BOOKING_URLS.altstetten,
        hasSpotCount: true,
        sessions,
      }
    })
    .filter((course) => course.sessions.length > 0)
}

function parseGermanSession(value: string): { date: string; start: string; end: string } | null {
  const match = value.match(
    /(\d{2})\.(\d{2})\.(\d{4}),\s*(\d{2}):(\d{2})\s*-\s*(\d{2}):(\d{2})/,
  )
  if (!match) return null

  const [, day, month, year, startH, startM, endH, endM] = match
  return {
    date: `${year}-${month}-${day}`,
    start: `${startH}:${startM}`,
    end: `${endH}:${endM}`,
  }
}

function parseFlyingInstructorCourses(html: string): UpcomingPgsCourse[] {
  const now = new Date()
  const courses: UpcomingPgsCourse[] = []
  const parts = html.split('courseListing-entry')

  for (const part of parts.slice(1)) {
    if (!part.includes('courseListing-row')) continue

    const bookMatch = part.match(/href="(\/iframe\/[^"]+kurs-buchen\/\d+)"/)
    const session1Match = part.match(/1\. Tag<\/th>\s*<td>\s*([^<]+)/s)
    const session2Match = part.match(/2\. Tag<\/th>\s*<td>\s*([^<]+)/s)
    const priceMatch = part.match(/Preis<\/th>\s*<td>([^<]+)/)

    if (!bookMatch || !session1Match || !session2Match) continue

    const session1 = parseGermanSession(session1Match[1].trim())
    const session2 = parseGermanSession(session2Match[1].trim())
    if (!session1 || !session2) continue
    if (new Date(toSortableIso(session1.date, session1.start)) <= now) continue

    const courseId = bookMatch[1].match(/(\d+)$/)?.[1] || String(courses.length)
    const priceRaw = priceMatch?.[1]?.trim() ?? '99.00 CHF'
    const priceChf = Math.round(Number.parseFloat(priceRaw.replace(/[^\d.]/g, ''))) || 99

    courses.push({
      id: `flying-${courseId}`,
      status: 'active',
      city: 'Lachen SZ',
      spotsRemaining: 1,
      maxParticipants: 12,
      priceChf,
      bookingUrl: BOOKING_URLS.lachen,
      hasSpotCount: false,
      sessions: [
        {
          date: formatDateDeChFromYmd(session1.date),
          time: formatTimeRangeFromClock(session1.start, session1.end),
          startIso: toSortableIso(session1.date, session1.start),
        },
        {
          date: formatDateDeChFromYmd(session2.date),
          time: formatTimeRangeFromClock(session2.start, session2.end),
          startIso: toSortableIso(session2.date, session2.start),
        },
      ],
    })
  }

  return courses
}

export async function fetchNambAltstettenCourses(): Promise<UpcomingPgsCourse[]> {
  const html = await $fetch<string>(NAMB_IFRAME_URL, {
    headers: { Accept: 'text/html', 'User-Agent': 'DrivingTeam-Website/1.0 (+https://drivingteam.ch)' },
  })
  return parseNambCourses(html)
}

export async function fetchFlyingInstructorLachenCourses(): Promise<UpcomingPgsCourse[]> {
  const html = await $fetch<string>(FLYING_INSTRUCTOR_URL, {
    headers: { Accept: 'text/html', 'User-Agent': 'DrivingTeam-Website/1.0 (+https://drivingteam.ch)' },
  })
  return parseFlyingInstructorCourses(html)
}

export async function fetchNothelferCourses(
  location: 'altstetten' | 'lachen' | 'all',
): Promise<UpcomingPgsCourse[]> {
  const fetchers: Promise<UpcomingPgsCourse[]>[] = []

  if (location === 'altstetten' || location === 'all') {
    fetchers.push(
      fetchNambAltstettenCourses().catch(() => []),
    )
  }
  if (location === 'lachen' || location === 'all') {
    fetchers.push(
      fetchFlyingInstructorLachenCourses().catch(() => []),
    )
  }

  const results = await Promise.all(fetchers)

  return results
    .flat()
    .sort((a, b) =>
      (a.sessions[0]?.startIso || '').localeCompare(b.sessions[0]?.startIso || ''),
    )
    .slice(0, location === 'all' ? 6 : 4)
}
