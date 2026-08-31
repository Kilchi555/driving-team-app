/**
 * Shared head helpers for tenant landing pages (/s/...).
 */
import { heroPreloadAttrs } from '~/utils/website-responsive-image'

export function websiteFontHeadLinks(heroImageUrl?: string | null) {
  const links: Array<Record<string, string>> = [
    {
      rel: 'preload',
      href: '/fonts/website/syne-latin.woff2',
      as: 'font',
      type: 'font/woff2',
      crossorigin: 'anonymous',
    },
  ]

  if (heroImageUrl) {
    const preload = heroPreloadAttrs(heroImageUrl)
    links.unshift({
      rel: 'preload',
      as: 'image',
      href: preload?.href || heroImageUrl,
      ...(preload?.imagesrcset ? { imagesrcset: preload.imagesrcset, imagesizes: preload.imagesizes } : {}),
      fetchpriority: 'high',
    } as any)
  }

  return links
}

/** Derive AVIF sibling URL when media upload stored both */
export function heroAvifCandidate(url: string | null | undefined): string | null {
  if (!url) return null
  if (/\.webp(\?|$)/i.test(url)) return url.replace(/\.webp(\?|$)/i, '.avif$1')
  return null
}
