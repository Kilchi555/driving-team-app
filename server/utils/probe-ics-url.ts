/**
 * Server-side ICS feed probe: normalize → shape check → fetch → VCALENDAR check.
 */

import {
  humanizeIcsFetchError,
  inspectIcsUrlShape,
  normalizeIcsUrl,
} from '~/utils/ics-url'

export const ICS_PROBE_TIMEOUT_MS = 12_000
export const ICS_PROBE_MAX_BYTES = 2 * 1024 * 1024

export interface IcsProbeSuccess {
  ok: true
  url: string
  bytes: number
  veventCount: number
  /** Raw ICS body — only present when probe fetched successfully. */
  body: string
}

export interface IcsProbeFailure {
  ok: false
  url: string
  code: string
  message: string
  tip?: string
}

export type IcsProbeResult = IcsProbeSuccess | IcsProbeFailure

function countVevents(ics: string): number {
  const matches = ics.match(/BEGIN:VEVENT/gi)
  return matches?.length ?? 0
}

export async function probeIcsUrl(rawUrl: string): Promise<IcsProbeResult> {
  const shape = inspectIcsUrlShape(rawUrl)
  if (!shape.ok) {
    return {
      ok: false,
      url: normalizeIcsUrl(rawUrl),
      code: shape.code,
      message: shape.message,
      tip: shape.tip,
    }
  }

  const url = shape.url

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'DrivingTeamApp-ICS-Sync/1.0',
        Accept: 'text/calendar, text/plain, */*',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(ICS_PROBE_TIMEOUT_MS),
    })

    if (!response.ok) {
      const human = humanizeIcsFetchError(`HTTP ${response.status}`)
      return {
        ok: false,
        url,
        code: `http_${response.status}`,
        message: human.message,
        tip: human.tip,
      }
    }

    const contentLength = response.headers.get('content-length')
    if (contentLength && Number(contentLength) > ICS_PROBE_MAX_BYTES) {
      const human = humanizeIcsFetchError('ICS too large')
      return { ok: false, url, code: 'too_large', message: human.message, tip: human.tip }
    }

    const text = await response.text()
    if (text.length > ICS_PROBE_MAX_BYTES) {
      const human = humanizeIcsFetchError('ICS too large')
      return { ok: false, url, code: 'too_large', message: human.message, tip: human.tip }
    }

    if (!text || text.length < 50) {
      const human = humanizeIcsFetchError('Invalid/empty ICS response')
      return { ok: false, url, code: 'empty_feed', message: human.message, tip: human.tip }
    }

    if (!text.includes('BEGIN:VCALENDAR')) {
      const human = humanizeIcsFetchError('Response is not a VCALENDAR (HTML or wrong URL?)')
      return { ok: false, url, code: 'not_vcalendar', message: human.message, tip: human.tip }
    }

    return {
      ok: true,
      url,
      bytes: text.length,
      veventCount: countVevents(text),
      body: text,
    }
  } catch (err: any) {
    const name = err?.name || ''
    const msg =
      name === 'TimeoutError' || name === 'AbortError'
        ? `Fetch timeout after ${ICS_PROBE_TIMEOUT_MS}ms`
        : (err?.statusMessage || err?.message || 'Fetch error')
    const human = humanizeIcsFetchError(msg)
    return {
      ok: false,
      url,
      code: name === 'TimeoutError' || name === 'AbortError' ? 'timeout' : 'fetch_error',
      message: human.message,
      tip: human.tip,
    }
  }
}
