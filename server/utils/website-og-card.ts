/**
 * Generate 1200×630 OG cards for tenant websites (sharp).
 */
import sharp from 'sharp'

export type OgCardInput = {
  title: string
  subtitle?: string
  brand?: string
  primary?: string
  secondary?: string
  accent?: string
  logoUrl?: string | null
}

function escapeXml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function wrapLines(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w
    if (next.length > maxChars && cur) {
      lines.push(cur)
      cur = w
      if (lines.length >= maxLines) break
    } else {
      cur = next
    }
  }
  if (lines.length < maxLines && cur) lines.push(cur)
  return lines.slice(0, maxLines)
}

export async function renderWebsiteOgCard(input: OgCardInput): Promise<Buffer> {
  const primary = input.primary || '#0F766E'
  const secondary = input.secondary || '#134E4A'
  const accent = input.accent || '#F59E0B'
  const brand = escapeXml((input.brand || 'Simy').slice(0, 48))
  const titleLines = wrapLines(input.title || 'Online-Terminbuchung', 28, 3).map(escapeXml)
  const subtitle = escapeXml((input.subtitle || '').slice(0, 110))

  let logoImage = ''
  if (input.logoUrl && /^https?:\/\//i.test(input.logoUrl)) {
    try {
      const res = await fetch(input.logoUrl, { signal: AbortSignal.timeout(4000) })
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer())
        const png = await sharp(buf, { failOn: 'none' })
          .resize(96, 96, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
          .png()
          .toBuffer()
        logoImage = `<image href="data:image/png;base64,${png.toString('base64')}" x="72" y="72" width="72" height="72" />`
      }
    } catch {
      /* ignore logo fetch errors */
    }
  }

  const titleSvg = titleLines
    .map(
      (line, i) =>
        `<text x="72" y="${260 + i * 64}" fill="#ffffff" font-size="56" font-weight="700" font-family="system-ui, -apple-system, Segoe UI, sans-serif">${line}</text>`,
    )
    .join('\n')

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${escapeXml(secondary)}"/>
      <stop offset="55%" stop-color="${escapeXml(primary)}"/>
      <stop offset="100%" stop-color="#0c1222"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <circle cx="1020" cy="120" r="180" fill="${escapeXml(accent)}" fill-opacity="0.18"/>
  <circle cx="1120" cy="520" r="220" fill="#ffffff" fill-opacity="0.06"/>
  ${logoImage}
  <text x="${logoImage ? 160 : 72}" y="118" fill="#ffffff" fill-opacity="0.9" font-size="28" font-weight="600" font-family="system-ui, -apple-system, Segoe UI, sans-serif">${brand}</text>
  ${titleSvg}
  ${
    subtitle
      ? `<text x="72" y="480" fill="#ffffff" fill-opacity="0.82" font-size="28" font-family="system-ui, -apple-system, Segoe UI, sans-serif">${subtitle}</text>`
      : ''
  }
  <rect x="72" y="540" width="160" height="8" rx="4" fill="${escapeXml(accent)}"/>
</svg>`

  return sharp(Buffer.from(svg)).resize(1200, 630).png({ compressionLevel: 8 }).toBuffer()
}
