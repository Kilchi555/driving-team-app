import { describe, expect, it } from 'vitest'
import {
  formatParticipantBirthdate,
  participantBirthdate,
  participantDisplayLicenseLabel,
  participantIdentityLine,
} from '~/utils/participant-identity'
import { buildParticipantListHtml } from '~/utils/print-participant-list'

describe('participantDisplayLicenseLabel', () => {
  it('shows license_number when sari_faberid is empty', () => {
    expect(participantDisplayLicenseLabel({
      license_number: '68939737',
      sari_faberid: null,
    })).toBe('LFA 68939737')
  })

  it('shows sari_faberid when license_number is empty', () => {
    expect(participantDisplayLicenseLabel({
      license_number: null,
      sari_faberid: '540123456',
    })).toBe('LFA 540123456')
  })

  it('shows license_number once when both values are the same', () => {
    expect(participantDisplayLicenseLabel({
      license_number: '68939737',
      sari_faberid: '68939737',
    })).toBe('LFA 68939737')
    expect(participantDisplayLicenseLabel({
      license_number: '689.397.37',
      sari_faberid: '68939737',
    })).toBe('LFA 689.397.37')
  })

  it('shows both values when they differ', () => {
    expect(participantDisplayLicenseLabel({
      license_number: '68939737',
      sari_faberid: '540123456',
    })).toBe('LFA 68939737 · SARI 540123456')
  })

  it('returns null when both registration fields are empty', () => {
    expect(participantDisplayLicenseLabel({
      license_number: null,
      sari_faberid: '  ',
    })).toBeNull()
    expect(participantDisplayLicenseLabel({})).toBeNull()
  })

  it('does not use sari_license_id as LFA', () => {
    expect(participantDisplayLicenseLabel({
      license_number: null,
      sari_faberid: null,
      sari_license_id: '123456789012',
    } as any)).toBeNull()
  })

  it('does not use user faberid as LFA', () => {
    expect(participantDisplayLicenseLabel({
      license_number: null,
      sari_faberid: null,
      faberid: '999',
    } as any)).toBeNull()
  })

  it('does not use user lernfahrausweis_nr as LFA', () => {
    expect(participantDisplayLicenseLabel({
      license_number: null,
      sari_faberid: null,
      lernfahrausweis_nr: '880285',
    } as any)).toBeNull()
  })
})

describe('participant birthdate and identity line', () => {
  it('formats birthdate without timezone shift', () => {
    expect(formatParticipantBirthdate('2009-05-23')).toBe('23.05.2009')
    expect(participantBirthdate({ birthdate: '2009-05-23' })).toBe('2009-05-23')
  })

  it('does not fall back to a user birthdate', () => {
    expect(participantBirthdate({ birthdate: null } as any)).toBeNull()
  })

  it('combines birthdate and LFA', () => {
    expect(participantIdentityLine({
      birthdate: '2009-05-23',
      license_number: '68939737',
    })).toBe('23.05.2009 · LFA 68939737')
  })

  it('shows birthdate without LFA', () => {
    expect(participantIdentityLine({
      birthdate: '2009-05-23',
    })).toBe('23.05.2009')
  })

  it('shows LFA without birthdate', () => {
    expect(participantIdentityLine({
      sari_faberid: '540123456',
    })).toBe('LFA 540123456')
  })

  it('returns null when neither birthdate nor LFA is present', () => {
    expect(participantIdentityLine({})).toBeNull()
  })
})

describe('print participant list identity', () => {
  it('renders birthdate and LFA under the name', () => {
    const html = buildParticipantListHtml({
      course: { name: 'VKU Wangen September' },
      participants: [{
        first_name: 'Marco',
        last_name: 'Bamert',
        email: 'marco@example.com',
        phone: '079 000 00 00',
        birthdate: '2009-05-23',
        license_number: '68939737',
      }],
    })
    expect(html).toContain('Marco Bamert')
    expect(html).toContain('23.05.2009 · LFA 68939737')
  })

  it('renders both numbers when license_number and sari_faberid differ', () => {
    const html = buildParticipantListHtml({
      course: { name: 'VKU Wangen September' },
      participants: [{
        first_name: 'Ada',
        last_name: 'Lovelace',
        birthdate: '1990-01-01',
        license_number: '111',
        sari_faberid: '222',
      }],
    })
    expect(html).toContain('LFA 111 · SARI 222')
  })

  it('escapes a malicious license value in the printed list', () => {
    const html = buildParticipantListHtml({
      course: { name: 'VKU Wangen September' },
      participants: [{
        first_name: 'Ada',
        last_name: 'Lovelace',
        license_number: '</td><a href="https://evil.example">Injected content',
      }],
    })
    expect(html).not.toContain('<a href="https://evil.example">')
    expect(html).toContain('LFA &lt;/td&gt;&lt;a href=&quot;https://evil.example&quot;&gt;Injected content')
  })
})
