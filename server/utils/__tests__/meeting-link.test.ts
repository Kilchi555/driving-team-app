import { describe, expect, it } from 'vitest'
import {
  meetingLinkAnchor,
  resolveAppointmentMeeting,
  sanitizeMeetingUrl,
} from '../meeting-link'

describe('sanitizeMeetingUrl', () => {
  it('keeps https URLs', () => {
    expect(sanitizeMeetingUrl(' https://zoom.us/j/123456789 ')).toBe('https://zoom.us/j/123456789')
  })

  it('rejects non-https, credentials, and junk', () => {
    expect(sanitizeMeetingUrl('http://zoom.us/j/1')).toBeUndefined()
    expect(sanitizeMeetingUrl('javascript:alert(1)')).toBeUndefined()
    expect(sanitizeMeetingUrl('https://user:pass@evil.com/j/1')).toBeUndefined()
    expect(sanitizeMeetingUrl('not-a-url')).toBeUndefined()
    expect(sanitizeMeetingUrl('')).toBeUndefined()
    expect(sanitizeMeetingUrl(null)).toBeUndefined()
  })
})

describe('resolveAppointmentMeeting', () => {
  it('uses the invite link when present', () => {
    expect(resolveAppointmentMeeting({
      location: { name: 'Online Call', meeting_url: 'https://zoom.us/j/static' },
      invite: { meeting_type: 'online', meeting_link: 'https://zoom.us/j/unique' },
    })).toEqual({
      meetingType: 'online',
      meetingLink: 'https://zoom.us/j/unique',
    })
  })

  it('uses the location URL when there is no invite', () => {
    expect(resolveAppointmentMeeting({
      location: { name: 'Praxis', meeting_url: 'https://meet.google.com/abc-defg-hij' },
    })).toEqual({
      meetingType: 'online',
      meetingLink: 'https://meet.google.com/abc-defg-hij',
    })
  })

  it('falls back to the location static URL for online invites without a link', () => {
    expect(resolveAppointmentMeeting({
      location: { name: 'Online Call', address: 'Remote / Video', meeting_url: 'https://whereby.com/sara' },
      invite: { meeting_type: 'online' },
    })).toEqual({
      meetingType: 'online',
      meetingLink: 'https://whereby.com/sara',
    })
  })

  it('does not treat Online Call as online without a stored URL', () => {
    expect(resolveAppointmentMeeting({
      location: { name: 'Online Call', address: 'Remote / Video (Zoom, Teams, …)' },
    })).toEqual({})
  })

  it('keeps phone invites without a video link', () => {
    expect(resolveAppointmentMeeting({
      location: { name: 'Online Call', meeting_url: 'https://zoom.us/j/static' },
      invite: { meeting_type: 'phone' },
    })).toEqual({ meetingType: 'phone' })
  })

  it('does not override an explicit in-person invite with a location URL', () => {
    expect(resolveAppointmentMeeting({
      location: { name: 'Studio', meeting_url: 'https://zoom.us/j/static' },
      invite: { meeting_type: 'in_person' },
    })).toEqual({ meetingType: 'in_person' })
  })
})

describe('meetingLinkAnchor', () => {
  it('HTML-escapes the href and label', () => {
    const html = meetingLinkAnchor('https://zoom.us/j/1?q=a&b=c', '#2563eb')
    expect(html).toContain('href="https://zoom.us/j/1?q=a&amp;b=c"')
    expect(html).toContain('>https://zoom.us/j/1?q=a&amp;b=c<')
    expect(html).not.toContain('javascript:')
  })

  it('returns empty for junk', () => {
    expect(meetingLinkAnchor('javascript:alert(1)', '#000')).toBe('')
  })
})
