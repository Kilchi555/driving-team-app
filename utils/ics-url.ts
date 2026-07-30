/**
 * Shared ICS URL helpers (client + server).
 * Static shape checks only — reachability lives in server/utils/probe-ics-url.ts.
 */

export type IcsUrlIssueCode =
  | 'empty'
  | 'invalid_url'
  | 'google_web_ui'
  | 'outlook_web_ui'
  | 'not_https'
  | 'suspicious_html_path'

export interface IcsUrlInspectionOk {
  ok: true
  url: string
}

export interface IcsUrlInspectionFail {
  ok: false
  code: IcsUrlIssueCode
  message: string
  tip?: string
}

export type IcsUrlInspection = IcsUrlInspectionOk | IcsUrlInspectionFail

/** Normalize webcal/http → https and trim. */
export function normalizeIcsUrl(raw: string): string {
  return String(raw || '')
    .trim()
    .replace(/^webcal:\/\//i, 'https://')
    .replace(/^http:\/\//i, 'https://')
}

export function inspectIcsUrlShape(raw: string): IcsUrlInspection {
  const trimmed = String(raw || '').trim()
  if (!trimmed) {
    return {
      ok: false,
      code: 'empty',
      message: 'Bitte eine ICS-URL einfügen.',
      tip: 'Die URL findest du in den Freigabe-/Export-Einstellungen deines Kalenders.',
    }
  }

  const url = normalizeIcsUrl(trimmed)
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return {
      ok: false,
      code: 'invalid_url',
      message: 'Das sieht nicht nach einer gültigen URL aus.',
      tip: 'Die Adresse sollte mit https:// oder webcal:// beginnen.',
    }
  }

  if (parsed.protocol !== 'https:') {
    return {
      ok: false,
      code: 'not_https',
      message: 'Nur https:// oder webcal:// Links werden unterstützt.',
    }
  }

  const host = parsed.hostname.toLowerCase()
  const path = parsed.pathname.toLowerCase()
  const full = url.toLowerCase()

  // Google Calendar web UI (not the secret iCal feed)
  if (
    host.includes('calendar.google.com') &&
    (path.includes('/calendar/u/') ||
      path === '/calendar/r' ||
      path.startsWith('/calendar/r/') ||
      (!path.includes('/ical/') && !/\.ics$/i.test(path)))
  ) {
    return {
      ok: false,
      code: 'google_web_ui',
      message: 'Das ist die Google-Kalender-Webadresse, kein ICS-Feed.',
      tip: 'In Google Calendar → Einstellungen → deinen Kalender → «Kalender integrieren» → «Geheime Adresse im iCal-Format» kopieren. Die URL enthält /calendar/ical/… und endet oft mit basic.ics.',
    }
  }

  // Outlook web calendar (not ICS publish link)
  if (
    (host.includes('outlook.live.com') || host.includes('outlook.office.com') || host.includes('outlook.office365.com')) &&
    (path.includes('/calendar/view') || path.includes('/mail/') || full.includes('path=/calendar'))
  ) {
    return {
      ok: false,
      code: 'outlook_web_ui',
      message: 'Das ist die Outlook-Webadresse, kein veröffentlichter ICS-Link.',
      tip: 'Outlook → Einstellungen → Kalender → Freigegebene Kalender → Kalender veröffentlichen → den ICS-Link (nicht HTML) kopieren.',
    }
  }

  // Generic browser calendar paths that are almost never ICS feeds
  if (/\/(calendar|mail)\/(u\/\d+|r)(\/|$)/i.test(path) && !/\.ics$/i.test(path) && !path.includes('/ical/')) {
    return {
      ok: false,
      code: 'suspicious_html_path',
      message: 'Diese URL sieht nach einer Webseite aus, nicht nach einem Kalender-Feed.',
      tip: 'Du brauchst die öffentliche/geheime ICS-Adresse (oft mit .ics oder /ical/ im Pfad), nicht die Adresse aus der Browser-Leiste.',
    }
  }

  return { ok: true, url }
}

/** Map low-level probe/sync errors to German UI copy. */
export function humanizeIcsFetchError(codeOrMessage: string): { message: string; tip?: string } {
  const raw = (codeOrMessage || '').trim()
  const lower = raw.toLowerCase()

  if (lower.includes('google') && (lower.includes('web ui') || lower.includes('not an ics'))) {
    return {
      message: 'Das ist keine ICS-Feed-URL (vermutlich die Google-Kalender-Webseite).',
      tip: 'Bitte die «Geheime Adresse im iCal-Format» aus den Google-Kalender-Einstellungen verwenden.',
    }
  }
  if (lower.includes('timeout') || lower.includes('aborted') || lower.includes('abort')) {
    return {
      message: 'Der Kalender-Server hat zu lange nicht geantwortet.',
      tip: 'Prüfe die URL und ob der Kalender öffentlich freigegeben ist. Später erneut versuchen.',
    }
  }
  if (lower.includes('http 404') || lower === '404') {
    return {
      message: 'Die ICS-URL wurde nicht gefunden (404).',
      tip: 'Der Link ist abgelaufen oder falsch. In Apple/Google/Outlook eine neue Freigabe-URL erzeugen und hier ersetzen.',
    }
  }
  if (lower.includes('http 401') || lower.includes('http 403') || lower === '401' || lower === '403') {
    return {
      message: 'Kein Zugriff auf diese ICS-URL (geschützt).',
      tip: 'Der Kalender muss öffentlich freigegeben sein, oder du brauchst die geheime iCal-Adresse.',
    }
  }
  if (lower.includes('too large') || lower.includes('ics too large')) {
    return {
      message: 'Die Kalender-Datei ist zu gross.',
      tip: 'Apple-/iCloud-Kalender mit vielen alten Terminen können sehr gross werden. Erstelle einen neuen Kalender nur mit aktuellen Terminen und teile dessen ICS-URL, oder kontaktiere den Support.',
    }
  }
  if (lower.includes('vcalendar') || lower.includes('html') || lower.includes('not a vcalendar')) {
    return {
      message: 'Die URL liefert keinen Kalender (kein iCalendar/ICS).',
      tip: 'Oft wurde versehentlich die Web-Adresse statt der ICS-Adresse eingefügt. Anleitung oben im Formular beachten.',
    }
  }
  if (lower.includes('invalid') || lower.includes('empty')) {
    return {
      message: 'Die URL liefert keine gültigen Kalender-Daten.',
      tip: 'Prüfe, ob der Link öffentlich erreichbar ist und auf .ics bzw. /ical/ zeigt.',
    }
  }
  if (/^http\s*\d{3}/i.test(raw) || /^HTTP\s*\d{3}/.test(raw)) {
    return {
      message: `ICS-URL nicht erreichbar (${raw.replace(/^HTTP\s*/i, 'HTTP ')}).`,
      tip: 'Stelle sicher, dass die URL öffentlich zugänglich ist.',
    }
  }

  return {
    message: raw || 'ICS-URL konnte nicht geprüft werden.',
    tip: 'Stelle sicher, dass die URL öffentlich zugänglich ist und ein ICS-/iCal-Feed ist.',
  }
}
