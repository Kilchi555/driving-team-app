// server/utils/tenant-logo-for-pdf.ts
// Lädt ein Tenant-Logo und liefert PDFKit-kompatibles PNG/JPEG-Base64.
// WebP/GIF werden via sharp nach PNG konvertiert (PDFKit kennt nur PNG/JPEG).

import sharp from 'sharp'

export type TenantLogoForPdf = {
  base64: string
  format: 'png' | 'jpeg'
}

function isPng(buf: Buffer): boolean {
  return buf.length >= 4 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47
}

function isJpeg(buf: Buffer): boolean {
  return buf.length >= 3 && buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF
}

async function toPdfCompatible(buffer: Buffer): Promise<TenantLogoForPdf | null> {
  if (!buffer.length) return null
  if (isPng(buffer)) return { base64: buffer.toString('base64'), format: 'png' }
  if (isJpeg(buffer)) return { base64: buffer.toString('base64'), format: 'jpeg' }

  // WebP, GIF, etc. → PNG
  try {
    const png = await sharp(buffer).png().toBuffer()
    return { base64: png.toString('base64'), format: 'png' }
  } catch {
    return null
  }
}

/**
 * Lädt logo_wide_url (data-URI oder HTTPS) und liefert Base64 ohne data:-Prefix.
 * Gibt null zurück wenn kein Logo oder Konvertierung fehlschlägt.
 */
export async function loadTenantLogoForPdf(
  logoUrl: string | null | undefined,
): Promise<TenantLogoForPdf | null> {
  if (!logoUrl || typeof logoUrl !== 'string') return null

  try {
    if (logoUrl.startsWith('data:image/')) {
      const match = logoUrl.match(/^data:image\/[\w+.-]+;base64,(.+)$/i)
      if (!match?.[1]) return null
      return toPdfCompatible(Buffer.from(match[1], 'base64'))
    }

    if (logoUrl.startsWith('http://') || logoUrl.startsWith('https://')) {
      const res = await fetch(logoUrl)
      if (!res.ok) return null
      return toPdfCompatible(Buffer.from(await res.arrayBuffer()))
    }
  } catch {
    return null
  }

  return null
}
