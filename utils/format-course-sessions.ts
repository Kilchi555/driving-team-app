// utils/format-course-sessions.ts
// Einheitliche Darstellung von Kursteilen (Teil N · Datum · Zeit) für Rechnungen & UI

export type CourseSessionLike = {
  session_number?: number | null
  start_time: string
  end_time?: string | null
}

function toZurichDate(iso: string): Date | null {
  if (!iso) return null
  let s = iso
  if (s.includes(' ') && !s.includes('T')) s = s.replace(' ', 'T')
  if (s.includes('+00') && !s.includes('+00:00')) s = s.replace('+00', '+00:00')
  if (!s.includes('+') && !s.includes('Z') && !/[+-]\d{2}:\d{2}$/.test(s)) s += '+00:00'
  const utc = new Date(s)
  if (isNaN(utc.getTime())) return null
  return new Date(utc.toLocaleString('sv-SE', { timeZone: 'Europe/Zurich' }))
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })
}

/** Eine Zeile: "Teil 1 · Sa., 08.08.2026, 08:00–12:00" */
export function formatCourseSessionLine(
  session: CourseSessionLike,
  indexFallback = 0,
): string {
  const n = session.session_number ?? indexFallback + 1
  const start = toZurichDate(session.start_time)
  if (!start) return `Teil ${n}`

  const datePart = start.toLocaleDateString('de-CH', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  const end = session.end_time ? toZurichDate(session.end_time) : null
  const timePart = end
    ? `${formatTime(start)}–${formatTime(end)}`
    : formatTime(start)

  return `Teil ${n} · ${datePart}, ${timePart}`
}

/** Mehrzeiliger Beschreibungstext für Rechnungspositionen */
export function formatCourseSessionsDescription(
  sessions: CourseSessionLike[] | null | undefined,
): string {
  if (!sessions?.length) return ''
  return sessions.map((s, i) => formatCourseSessionLine(s, i)).join('\n')
}

/** Kurz für Listen: gleiche Zeilen, mit Trenner */
export function formatCourseSessionsInline(
  sessions: CourseSessionLike[] | null | undefined,
): string {
  if (!sessions?.length) return ''
  return sessions.map((s, i) => formatCourseSessionLine(s, i)).join(' · ')
}

/** Erkennung: Beschreibung enthält bereits formatierte Kursteile */
export function looksLikeCourseSessionsDescription(text?: string | null): boolean {
  return !!text && /^Teil\s+\d+/m.test(text)
}

/**
 * Für Anzeige: formatiert "Teil …"-Blöcke und legacy "Kurs · 08.08.2026, …"
 * als mehrzeilige Kursteile (ohne Zeiten, wenn nicht vorhanden).
 */
export function displayCourseSessionsDescription(text?: string | null): string {
  if (!text) return ''
  if (looksLikeCourseSessionsDescription(text)) return text.trim()

  const legacy = text.match(/^Kurs\s*·\s*(.+)$/i)
  if (legacy?.[1]) {
    const dates = legacy[1].split(',').map(s => s.trim()).filter(Boolean)
    if (dates.length > 1) {
      return dates.map((d, i) => `Teil ${i + 1} · ${d}`).join('\n')
    }
  }
  return text
}
