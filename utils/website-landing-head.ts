/**
 * Shared head helpers for tenant landing pages (/s/...).
 */
export function websiteFontHeadLinks(heroImageUrl?: string | null) {
  const links: Array<Record<string, string>> = [
    {
      rel: 'preload',
      href: '/fonts/website/manrope-latin.woff2',
      as: 'font',
      type: 'font/woff2',
      crossorigin: 'anonymous',
    },
    {
      rel: 'preload',
      href: '/fonts/website/syne-latin.woff2',
      as: 'font',
      type: 'font/woff2',
      crossorigin: 'anonymous',
    },
  ]

  if (heroImageUrl) {
    links.unshift({
      rel: 'preload',
      as: 'image',
      href: heroImageUrl,
      // @ts-expect-error fetchpriority is valid on link
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
