import { Readable } from 'node:stream'
import { describe, expect, it, vi } from 'vitest'
import {
  PROSPECT_IMAGE_MAX_BYTES,
  UnsafeUrlError,
  isProspectImageContentType,
  safeFetchImage,
  takeImageBody,
  type PinnedBytes,
} from '../ssrf-guard'

const PUBLIC_LOOKUP = async () => ['1.1.1.1']

function png(size = 3000): Buffer {
  return Buffer.alloc(size, 1)
}

function image(body: Buffer, status = 200, headers: Record<string, string> = {}): PinnedBytes {
  return {
    status,
    headers: { 'content-type': 'image/png', ...headers },
    body,
  }
}

describe('prospect image SSRF fetch', () => {
  it('accepts a public https image and a public http image', async () => {
    const request = vi.fn(async (url: URL) => image(png(), 200, { 'x-host': url.hostname }))
    const httpsImage = await safeFetchImage('https://cdn.example/logo.png', {
      lookup: PUBLIC_LOOKUP,
      request,
    })
    const httpImage = await safeFetchImage('http://images.example/hero.png', {
      lookup: PUBLIC_LOOKUP,
      request,
    })
    expect(httpsImage.contentType).toContain('image/png')
    expect(httpsImage.body.length).toBe(3000)
    expect(httpImage.finalUrl).toContain('http://images.example/hero.png')
    expect(request).toHaveBeenCalledTimes(2)
  })

  it.each([
    'http://metadata.google.internal/computeMetadata/v1/',
    'http://127.0.0.1/secret.png',
    'http://169.254.169.254/latest/meta-data/',
    'http://10.1.2.3/a.png',
    'http://192.168.1.9/a.png',
    'http://172.16.4.4/a.png',
    'http://[fc00::1]/a.png',
    'http://[fd12:3456::7]/a.png',
  ])('blocks %s before any request', async (raw) => {
    const request = vi.fn()
    await expect(safeFetchImage(raw, { lookup: PUBLIC_LOOKUP, request })).rejects.toBeInstanceOf(UnsafeUrlError)
    expect(request).not.toHaveBeenCalled()
  })

  it('blocks a redirect from a public image URL to a link-local address', async () => {
    const request = vi.fn(async () => ({
      status: 302,
      headers: { location: 'http://169.254.169.254/latest/meta-data/' },
      body: Buffer.alloc(0),
    }))
    await expect(
      safeFetchImage('https://cdn.example/photo.png', { lookup: PUBLIC_LOOKUP, request }),
    ).rejects.toBeInstanceOf(UnsafeUrlError)
    expect(request).toHaveBeenCalledTimes(1)
  })

  it('blocks a redirect from a public image URL to loopback', async () => {
    const request = vi.fn(async () => ({
      status: 302,
      headers: { location: 'http://127.0.0.1/admin' },
      body: Buffer.alloc(0),
    }))
    await expect(
      safeFetchImage('https://cdn.example/photo.png', { lookup: PUBLIC_LOOKUP, request }),
    ).rejects.toBeInstanceOf(UnsafeUrlError)
    expect(request).toHaveBeenCalledTimes(1)
  })

  it('blocks a hostname that resolves to a private address before connecting', async () => {
    const request = vi.fn()
    await expect(
      safeFetchImage('https://cdn.example/a.png', {
        lookup: async () => ['10.0.0.1'],
        request,
      }),
    ).rejects.toBeInstanceOf(UnsafeUrlError)
    expect(request).not.toHaveBeenCalled()
  })

  it('blocks a redirect whose target resolves to loopback', async () => {
    const request = vi.fn(async () => ({
      status: 302,
      headers: { location: 'https://rebinder.example/secret.png' },
      body: Buffer.alloc(0),
    }))
    await expect(
      safeFetchImage('https://cdn.example/photo.png', {
        lookup: async (hostname: string) => (hostname === 'cdn.example' ? ['1.1.1.1'] : ['127.0.0.1']),
        request,
      }),
    ).rejects.toBeInstanceOf(UnsafeUrlError)
    expect(request).toHaveBeenCalledTimes(1)
  })

  it('follows a redirect to another public https image', async () => {
    const request = vi.fn(async (url: URL) => {
      if (url.hostname === 'cdn.example') {
        return {
          status: 302,
          headers: { location: 'https://images.example/final.png' },
          body: Buffer.alloc(0),
        }
      }
      return image(png(4000))
    })
    const fetched = await safeFetchImage('https://cdn.example/start.png', {
      lookup: PUBLIC_LOOKUP,
      request,
    })
    expect(fetched.finalUrl).toContain('https://images.example/final.png')
    expect(fetched.body.length).toBe(4000)
    expect(request).toHaveBeenCalledTimes(2)
  })

  it('rejects a non-image content type and does not return the body', async () => {
    const secret = Buffer.alloc(3000, 7)
    const request = vi.fn(async () => ({
      status: 200,
      headers: { 'content-type': 'text/html' },
      body: secret,
    }))
    await expect(
      safeFetchImage('https://cdn.example/page.png', { lookup: PUBLIC_LOOKUP, request }),
    ).rejects.toMatchObject({ message: 'content-type' })
    expect(isProspectImageContentType('')).toBe(false)
    expect(isProspectImageContentType('application/octet-stream')).toBe(false)
  })

  it('rejects an image larger than the existing 12 MB cap', async () => {
    const request = vi.fn(async () => image(Buffer.alloc(64), 200))
    await expect(
      safeFetchImage('https://cdn.example/huge.png', {
        lookup: PUBLIC_LOOKUP,
        request,
        maxBytes: 32,
      }),
    ).rejects.toMatchObject({ message: 'response too large' })
    expect(PROSPECT_IMAGE_MAX_BYTES).toBe(12 * 1024 * 1024)
  })

  it('does not read a non-image body', async () => {
    let read = false
    const stream = new Readable({
      read() {
        read = true
        this.push(Buffer.alloc(100))
        this.push(null)
      },
    })
    await expect(takeImageBody('text/plain', stream, 50)).rejects.toMatchObject({ message: 'content-type' })
    expect(read).toBe(false)
  })

  it('stops reading once the body cap is exceeded', async () => {
    const stream = Readable.from([Buffer.alloc(40), Buffer.alloc(40)])
    await expect(takeImageBody('image/jpeg', stream, 50)).rejects.toMatchObject({ message: 'response too large' })
  })
})
