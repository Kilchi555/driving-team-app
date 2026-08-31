import { describe, expect, it } from 'vitest'
import { hostnameIsOrSubdomain, inspectIcsUrlShape } from '../../../utils/ics-url'

describe('hostnameIsOrSubdomain', () => {
  it('accepts the host and its subdomains', () => {
    expect(hostnameIsOrSubdomain('calendar.google.com', 'calendar.google.com')).toBe(true)
    expect(hostnameIsOrSubdomain('www.calendar.google.com', 'calendar.google.com')).toBe(true)
  })

  it('rejects lookalike hosts', () => {
    expect(hostnameIsOrSubdomain('calendar.google.com.evil.com', 'calendar.google.com')).toBe(false)
    expect(hostnameIsOrSubdomain('evilcalendar.google.com', 'calendar.google.com')).toBe(false)
  })
})

describe('inspectIcsUrlShape host checks', () => {
  it('does not treat a lookalike host as Google Calendar', () => {
    const result = inspectIcsUrlShape('https://calendar.google.com.evil.com/calendar/u/0')
    if (!result.ok) expect(result.code).not.toBe('google_web_ui')
  })
})
