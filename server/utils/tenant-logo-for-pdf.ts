// server/utils/tenant-logo-for-pdf.ts
// Lädt ein Tenant-Logo und liefert PDFKit-kompatibles PNG-Base64.
// PDFKit kennt nur PNG/JPEG — und Alpha-Kanäle können als weisses Rechteck
// gerendert werden. Deshalb immer via sharp nach undurchsichtigem RGB-PNG.

import sharp from 'sharp'

export type TenantLogoForPdf = {
  base64: string
  format: 'png' | 'jpeg'
}

/** Prefer wide logo; fall back to generic/square for older tenants. */
export function resolveTenantWideLogoUrl(tenant: {
  logo_wide_url?: string | null
  logo_url?: string | null
  logo_square_url?: string | null
} | null | undefined): string | null {
  return tenant?.logo_wide_url || tenant?.logo_url || tenant?.logo_square_url || null
}

/**
 * Normalisiert jedes Bildformat (WebP/PNG/JPEG/GIF/…) zu undurchsichtigem RGB-PNG.
 * - Transparent → weiss (PDF-Hintergrund ist weiss)
 * - Kein Alpha → PDFKit rendert kein weisses Soft-Mask-Rechteck
 */
export async function toPdfCompatible(
  buffer: Buffer,
): Promise<TenantLogoForPdf | null> {
  if (!buffer.length) return null

  try {
    // Important: do NOT chain ensureAlpha()+removeAlpha() — that can leave a
    // 4-channel PNG which PDFKit may render as an opaque white rectangle.
    // flatten() alone composites transparency onto white and yields RGB.
    const png = await sharp(buffer, { animated: false })
      .rotate() // honour EXIF orientation
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .png({ compressionLevel: 8 })
      .toBuffer()

    if (!png.length) return null
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
