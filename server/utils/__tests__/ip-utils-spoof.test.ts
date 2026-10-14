import { describe, expect, it } from 'vitest'
import type { H3Event } from 'h3'
import { getClientIP } from '../ip-utils'

function mockEvent(headers: Record<string, string>, remoteAddress?: string): H3Event {
  return {
    headers: {
      get: (name: string) => headers[name.toLowerCase()] ?? headers[name] ?? null,
    },
    node: {
      res: {
        socket: remoteAddress ? { remoteAddress } : null,
        connection: remoteAddress ? { remoteAddress } : null,
      },
    },
  } as unknown as H3Event
}

describe('getClientIP spoofing resistance', () => {
  it('prefers x-vercel-forwarded-for over client-controlled XFF', () => {
    const ip = getClientIP(
      mockEvent({
        'x-forwarded-for': '1.2.3.4, 9.9.9.9',
        'x-vercel-forwarded-for': '203.0.113.50',
      }),
    )
    expect(ip).toBe('203.0.113.50')
  })

  it('does not trust the first X-Forwarded-For hop', () => {
    const ip = getClientIP(
      mockEvent({
        'x-forwarded-for': '1.2.3.4, 198.51.100.20',
      }),
    )
    expect(ip).toBe('198.51.100.20')
    expect(ip).not.toBe('1.2.3.4')
  })

  it('prefers x-real-ip over XFF', () => {
    const ip = getClientIP(
      mockEvent({
        'x-real-ip': '203.0.113.77',
        'x-forwarded-for': '1.2.3.4',
      }),
    )
    expect(ip).toBe('203.0.113.77')
  })
})
