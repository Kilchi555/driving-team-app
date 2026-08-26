import { describe, expect, it } from 'vitest'
import sharp from 'sharp'
import { extractColorsFromImageBuffer } from '../extract-logo-colors'

async function solidPng(r: number, g: number, b: number, size = 80) {
  return sharp({
    create: { width: size, height: size, channels: 3, background: { r, g, b } },
  }).png().toBuffer()
}

describe('extractColorsFromImageBuffer', () => {
  it('returns null for empty or invalid data', async () => {
    expect(await extractColorsFromImageBuffer(Buffer.alloc(0))).toBeNull()
    expect(await extractColorsFromImageBuffer(Buffer.from('not-an-image'))).toBeNull()
  })

  it('returns null for paper-white images', async () => {
    expect(await extractColorsFromImageBuffer(await solidPng(250, 250, 250))).toBeNull()
  })

  it('extracts a grey wordmark instead of giving up', async () => {
    const palette = await extractColorsFromImageBuffer(await solidPng(128, 128, 128))
    expect(palette).not.toBeNull()
    expect(palette![0]).toMatch(/^#[0-9a-f]{6}$/)
  })

  it('extracts a saturated brand color', async () => {
    const palette = await extractColorsFromImageBuffer(await solidPng(61, 74, 100))
    expect(palette).not.toBeNull()
    expect(palette![0]).toMatch(/^#[0-9a-f]{6}$/)
    expect(palette![1]).toMatch(/^#[0-9a-f]{6}$/)
    expect(palette![2]).toMatch(/^#[0-9a-f]{6}$/)
  })
})
