/** Responsive hero/gallery URLs via the public image proxy. */

export const HERO_WIDTHS = [640, 960, 1280, 1600] as const
export const GALLERY_WIDTHS = [400, 800] as const
export const HERO_SIZES = '100vw'
export const GALLERY_SIZES = '(max-width: 700px) 100vw, 600px'

export function isProxyableImageUrl(src: string | null | undefined): boolean {
  const url = String(src || '').trim()
  if (!url || url.startsWith('data:') || url.startsWith('blob:')) return false
  if (url.includes('/api/public/website/img')) return false
  return /^https?:\/\//i.test(url) || url.startsWith('/')
}

export function websiteImageProxyUrl(
  src: string,
  width: number,
  format: 'webp' | 'avif' = 'webp',
  fit: 'cover' | 'inside' = 'cover',
): string {
  if (!isProxyableImageUrl(src)) return src
  const params = new URLSearchParams({
    u: src,
    w: String(width),
    fm: format,
  })
  if (fit === 'inside') params.set('fit', 'inside')
  return `/api/public/website/img?${params.toString()}`
}

export function imageSrcset(
  src: string,
  widths: readonly number[],
  format: 'webp' | 'avif',
): string {
  if (!isProxyableImageUrl(src)) return ''
  return widths.map((w) => `${websiteImageProxyUrl(src, w, format)} ${w}w`).join(', ')
}

export function heroSrcset(src: string, format: 'webp' | 'avif'): string {
  return imageSrcset(src, HERO_WIDTHS, format)
}

export function heroFallbackSrc(src: string): string {
  if (!isProxyableImageUrl(src)) return src
  return websiteImageProxyUrl(src, 960, 'webp')
}

export function heroPreloadAttrs(src: string): {
  href: string
  imagesrcset: string
  imagesizes: string
} | null {
  if (!isProxyableImageUrl(src)) {
    return src ? { href: src, imagesrcset: '', imagesizes: HERO_SIZES } : null
  }
  return {
    href: websiteImageProxyUrl(src, 960, 'webp'),
    imagesrcset: heroSrcset(src, 'webp'),
    imagesizes: HERO_SIZES,
  }
}
