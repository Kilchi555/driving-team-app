import { describe, expect, it } from 'vitest'
import sharp from 'sharp'
import { createRequire } from 'module'
import { toPdfCompatible, resolveTenantWideLogoUrl } from '../tenant-logo-for-pdf'

const require = createRequire(import.meta.url)
const PDFDocument = require('pdfkit')

async function makeWebp(opts: {
  color: { r: number; g: number; b: number; alpha?: number }
  withTransparentBg?: boolean
}): Promise<Buffer> {
  const alpha = opts.color.alpha ?? 1
  if (opts.withTransparentBg) {
    return sharp({
      create: { width: 200, height: 80, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    })
      .composite([{
        input: await sharp({
          create: {
            width: 120,
            height: 40,
            channels: 4,
            background: { r: opts.color.r, g: opts.color.g, b: opts.color.b, alpha },
          },
        }).png().toBuffer(),
        left: 40,
        top: 20,
      }])
      .webp()
      .toBuffer()
  }

  return sharp({
    create: {
      width: 200,
      height: 80,
      channels: 3,
      background: { r: opts.color.r, g: opts.color.g, b: opts.color.b },
    },
  }).webp().toBuffer()
}

describe('tenant-logo-for-pdf', () => {
  it('resolves wide → url → square', () => {
    expect(resolveTenantWideLogoUrl({
      logo_wide_url: 'w',
      logo_url: 'u',
      logo_square_url: 's',
    })).toBe('w')
    expect(resolveTenantWideLogoUrl({
      logo_wide_url: null,
      logo_url: 'u',
      logo_square_url: 's',
    })).toBe('u')
    expect(resolveTenantWideLogoUrl({
      logo_wide_url: null,
      logo_url: null,
      logo_square_url: 's',
    })).toBe('s')
  })

  it('converts opaque WebP to RGB PNG without alpha', async () => {
    const webp = await makeWebp({ color: { r: 220, g: 20, b: 30 } })
    const out = await toPdfCompatible(webp)
    expect(out).not.toBeNull()
    expect(out!.format).toBe('png')

    const buf = Buffer.from(out!.base64, 'base64')
    const meta = await sharp(buf).metadata()
    expect(meta.format).toBe('png')
    expect(meta.hasAlpha).toBe(false)
    expect(meta.channels).toBe(3)

    const stats = await sharp(buf).stats()
    // Red logo on white after flatten — red channel should dominate mean
    expect(stats.channels[0].mean).toBeGreaterThan(200)
  })

  it('flattens transparent WebP onto white (no alpha left)', async () => {
    const webp = await makeWebp({
      color: { r: 20, g: 120, b: 220 },
      withTransparentBg: true,
    })
    const out = await toPdfCompatible(webp)
    expect(out).not.toBeNull()

    const buf = Buffer.from(out!.base64, 'base64')
    const meta = await sharp(buf).metadata()
    expect(meta.hasAlpha).toBe(false)

    // Corner should be white (flattened transparency)
    const { data } = await sharp(buf).raw().toBuffer({ resolveWithObject: true })
    expect([data[0], data[1], data[2]]).toEqual([255, 255, 255])
  })

  it('produces a PNG that PDFKit can embed', async () => {
    const webp = await makeWebp({ color: { r: 200, g: 40, b: 40 } })
    const out = await toPdfCompatible(webp)
    expect(out).not.toBeNull()
    const png = Buffer.from(out!.base64, 'base64')

    const pdf: Buffer = await new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 0 })
      const chunks: Buffer[] = []
      doc.on('data', (c: Buffer) => chunks.push(c))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)
      doc.rect(0, 0, doc.page.width, doc.page.height).fill('white')
      doc.image(png, 50, 20, { width: 150 })
      doc.end()
    })

    const latin = pdf.toString('latin1')
    expect(latin).toMatch(/\/Subtype\s*\/Image/)
    expect(latin).toMatch(/\/Width\s+200/)
    expect(latin).toMatch(/\/Height\s+80/)
  })
})
