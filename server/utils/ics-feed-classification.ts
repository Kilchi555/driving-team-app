/**
 * Distinguish a real ICS snapshot from the Simy error stub and from HTML
 * that merely contains the text BEGIN:VCALENDAR.
 *
 * The inactive-token path in server/api/calendar/ics.get.ts returns HTTP 200
 * with PRODID:-//Simy//Calendar//EN and no VEVENT. A real Simy export uses
 * PRODID:-//Simy//Driving Lessons Calendar//EN and includes VTIMEZONE.
 */

export const SIMY_ERROR_PRODID = '-//Simy//Calendar//EN'

export type IcsFeedKind = 'success_with_events' | 'success_empty'

export type IcsFeedClassification =
  | { ok: true; kind: IcsFeedKind; veventCount: number }
  | {
      ok: false
      kind: 'invalid_feed'
      code: 'simy_error_stub' | 'html_disguised_as_ics' | 'not_vcalendar'
      message: string
      tip?: string
    }

function prodidOf(body: string): string {
  const match = body.match(/PRODID:([^\r\n]+)/i)
  return (match?.[1] || '').trim()
}

function veventCount(body: string): number {
  return body.match(/BEGIN:VEVENT/gi)?.length ?? 0
}

/** Markup around a calendar snippet is not an ICS document. */
export function bodyLooksLikeHtmlDocument(body: string): boolean {
  return /<\s*(!doctype|html|head|body)\b/i.test(body)
}

export function classifyIcsFeed(body: string, _contentType?: string | null): IcsFeedClassification {
  const text = body || ''

  if (bodyLooksLikeHtmlDocument(text)) {
    return {
      ok: false,
      kind: 'invalid_feed',
      code: 'html_disguised_as_ics',
      message: 'Die Antwort ist eine Webseite, kein Kalender-Feed.',
      tip: 'Der bisherige Kalenderstand bleibt erhalten. Bitte den ICS-Link prüfen.',
    }
  }

  if (!text.includes('BEGIN:VCALENDAR') || !text.includes('END:VCALENDAR')) {
    return {
      ok: false,
      kind: 'invalid_feed',
      code: 'not_vcalendar',
      message: 'Die URL liefert keinen Kalender (kein iCalendar/ICS).',
      tip: 'Oft wurde versehentlich die Web-Adresse statt der ICS-Adresse eingefügt.',
    }
  }

  if (prodidOf(text) === SIMY_ERROR_PRODID) {
    return {
      ok: false,
      kind: 'invalid_feed',
      code: 'simy_error_stub',
      message: 'Der Simy-Kalender-Feed ist eine Fehlerantwort, kein leerer Stundenplan.',
      tip: 'Die bestehende Sperre bleibt erhalten. Bitte die Kalender-Freigabe prüfen.',
    }
  }

  const count = veventCount(text)
  if (count === 0) {
    return { ok: true, kind: 'success_empty', veventCount: 0 }
  }
  return { ok: true, kind: 'success_with_events', veventCount: count }
}
