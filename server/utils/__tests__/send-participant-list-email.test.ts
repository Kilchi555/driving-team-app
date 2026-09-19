import { describe, expect, it } from 'vitest'
import { buildStaffEmail } from '~/server/utils/participant-list-staff-email'

function renderEmail(overrides: Partial<Parameters<typeof buildStaffEmail>[0]> = {}) {
  return buildStaffEmail({
    courseName: 'VKU Wangen September',
    dateStr: 'Freitag, 18. September 2026',
    timeRange: '08:00–16:00 Uhr',
    location: 'Wangen',
    participants: [{
      first_name: 'Marco',
      last_name: 'Bamert',
      email: 'marco@example.com',
      phone: '079 000 00 00',
      birthdate: '2009-05-23',
      license_number: '68939737',
    }],
    tenantName: 'Fahrschule Gemperli',
    primaryColor: '#2563eb',
    logoUrl: null,
    isOnDemand: true,
    ...overrides,
  })
}

describe('buildStaffEmail identity escaping', () => {
  it('keeps normal birthdate and LFA formatting', () => {
    const html = renderEmail()
    expect(html).toContain('Marco Bamert')
    expect(html).toContain('23.05.2009 · LFA 68939737')
    expect(html).toContain('mailto:marco@example.com')
    expect(html).toContain('tel:079 000 00 00')
    expect(html).toContain('VKU Wangen September')
  })

  it('renders a malicious license value as escaped text, not HTML', () => {
    const html = renderEmail({
      participants: [{
        first_name: 'Ada',
        last_name: 'Lovelace',
        license_number: '</td><a href="https://evil.example">Injected content',
      }],
    })
    expect(html).not.toContain('<a href="https://evil.example">')
    expect(html).toContain('LFA &lt;/td&gt;&lt;a href=&quot;https://evil.example&quot;&gt;Injected content')
  })

  it('escapes participant name, phone, email, and course fields', () => {
    const html = renderEmail({
      courseName: '<img src=x onerror=alert(1)>',
      location: '</td><script>alert(1)</script>',
      tenantName: 'A&B <School>',
      participants: [{
        first_name: '<b>Evil</b>',
        last_name: 'User',
        email: 'evil@example.com" onclick="alert(1)',
        phone: '079"><img src=x>',
        birthdate: '2009-05-23',
        sari_faberid: '<svg>',
      }],
    })
    expect(html).not.toContain('<b>Evil</b>')
    expect(html).toContain('&lt;b&gt;Evil&lt;/b&gt; User')
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;')
    expect(html).toContain('&lt;/td&gt;&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(html).toContain('A&amp;B &lt;School&gt;')
    expect(html).toContain('23.05.2009 · LFA &lt;svg&gt;')
    expect(html).toContain('href="mailto:evil@example.com&quot; onclick=&quot;alert(1)"')
    expect(html).toContain('href="tel:079&quot;&gt;&lt;img src=x&gt;"')
    expect(html).not.toContain('<img src=x>')
  })
})
