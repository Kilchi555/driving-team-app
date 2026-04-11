import { defineEventHandler, getQuery, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseServiceCredentials } from '~/server/utils/supabase-service-env'

const FW_VARIANTS = ['fw_anhaenger', 'fw_motorboot', 'fw_lastwagen'] as const
const FW_VARIANT_SET = new Set<string>(FW_VARIANTS)

function formatDateLabelDeCh(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('de-CH', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Zurich',
  }).format(d)
}

function zurichYmd(d: Date): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Zurich',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

function isOnOrAfterTodayZurich(iso: string): boolean {
  const courseDay = zurichYmd(new Date(iso))
  const today = zurichYmd(new Date())
  return courseDay >= today
}

/** Vergleich ohne Umlaute (Anhänger ↔ anhaenger) */
function normalizeDe(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
}

/**
 * `courses.category` für diese Kurse: "Fahrlehrer" (wie VKU/PGS). Optional ältere Daten: fw_*.
 * Karten-Untervariante: zuerst fw_* aus der Spalte, sonst aus dem Kursnamen (motorboot, lastwagen, …).
 */
function inferWebsiteVariant(
  category: string | null,
  name: string,
): (typeof FW_VARIANTS)[number] | null {
  const c = (category || '').trim()
  if (FW_VARIANT_SET.has(c))
    return c as (typeof FW_VARIANTS)[number]

  const n = normalizeDe(name)
  if (n.includes('motorboot'))
    return 'fw_motorboot'
  if (n.includes('lastwagen'))
    return 'fw_lastwagen'
  if (n.includes('anhaenger') || n.includes('kategorie be'))
    return 'fw_anhaenger'

  return null
}

function earliestFutureStartIso(
  courseStart: string | null,
  sessions: { start_time: string }[] | null | undefined,
): string | null {
  const candidates: string[] = []
  if (courseStart)
    candidates.push(courseStart)
  for (const s of sessions || []) {
    if (s?.start_time)
      candidates.push(s.start_time)
  }
  const future = candidates.filter(isOnOrAfterTodayZurich).sort()
  return future[0] ?? null
}

/**
 * GET /api/courses/fahrlehrer-instances?tenant_id=uuid
 *
 * Öffentliche Durchführungen zur course_category code=Fahrlehrer.
 * Untervariante: weiterhin fw_* falls noch gesetzt, sonst aus dem Kursnamen bei category Fahrlehrer.
 */
export default defineEventHandler(async (event) => {
  const { tenant_id } = getQuery(event)

  if (!tenant_id || typeof tenant_id !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'tenant_id is required' })
  }

  const { supabaseUrl, supabaseServiceKey } = getSupabaseServiceCredentials(event)

  if (!supabaseUrl || !supabaseServiceKey) {
    throw createError({ statusCode: 500, statusMessage: 'Database configuration missing' })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const { data: categoryRow, error: catErr } = await supabase
    .from('course_categories')
    .select('id')
    .eq('tenant_id', tenant_id)
    .ilike('code', 'Fahrlehrer')
    .eq('is_active', true)
    .maybeSingle()

  if (catErr || !categoryRow?.id) {
    return { courses: [] as PublicFwCourse[] }
  }

  const { data: rows, error } = await supabase
    .from('courses')
    .select(`
      id,
      name,
      description,
      category,
      max_participants,
      current_participants,
      course_start_date,
      status,
      is_public,
      rooms ( name, location ),
      course_sessions ( start_time )
    `)
    .eq('tenant_id', tenant_id)
    .eq('course_category_id', categoryRow.id)
    .eq('is_public', true)
    .in('status', ['active', 'full'])
    .order('course_start_date', { ascending: true, nullsFirst: false })

  if (error) {
    console.error('[fahrlehrer-instances]', error)
    throw createError({ statusCode: 500, statusMessage: 'Failed to load courses' })
  }

  type RoomJoin = { name: string | null, location: string | null }
  type Row = {
    id: string
    name: string
    description: string | null
    category: string | null
    max_participants: number
    current_participants: number | null
    course_start_date: string | null
    status: string
    rooms: RoomJoin | RoomJoin[] | null
    course_sessions: { start_time: string }[] | null
  }

  function firstRoom(rooms: Row['rooms']): RoomJoin | null {
    if (!rooms)
      return null
    return Array.isArray(rooms) ? (rooms[0] ?? null) : rooms
  }

  const list: PublicFwCourse[] = (rows || [])
    .map((r: Row) => {
      const variant = inferWebsiteVariant(r.category, r.name)
      const startIso = earliestFutureStartIso(r.course_start_date, r.course_sessions)
      return { r, variant, startIso }
    })
    .filter((x): x is { r: Row, variant: (typeof FW_VARIANTS)[number], startIso: string } =>
      x.variant != null && x.startIso != null,
    )
    .map(({ r, variant, startIso }) => {
      const max = r.max_participants ?? 12
      const cur = r.current_participants ?? 0
      const spots = Math.max(0, max - cur)
      const room = firstRoom(r.rooms)
      const roomLabel = room
        ? [room.name, room.location].filter(Boolean).join(', ')
        : null
      const dateLabel = formatDateLabelDeCh(startIso)
      return {
        id: r.id,
        name: r.name,
        description: r.description,
        website_variant: variant,
        course_start_date: startIso,
        label: dateLabel,
        max_participants: max,
        current_participants: cur,
        spots_remaining: spots,
        status: r.status,
        room_label: roomLabel,
      }
    })
    .sort((a, b) => a.course_start_date.localeCompare(b.course_start_date))

  return { courses: list }
})

export interface PublicFwCourse {
  id: string
  name: string
  description: string | null
  website_variant: string
  course_start_date: string
  label: string
  max_participants: number
  current_participants: number
  spots_remaining: number
  status: string
  room_label: string | null
}
