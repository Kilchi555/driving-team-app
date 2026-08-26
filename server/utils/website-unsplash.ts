export type UnsplashPhoto = {
  id: string
  preview_url: string
  hotlink_url: string
  photographer: string | null
  photographer_url: string | null
  unsplash_url: string | null
  download_location: string | null
}

export function unsplashAccessKey(): string {
  try {
    const config = useRuntimeConfig()
    return String(
      config.unsplashAccessKey ||
        process.env.NUXT_UNSPLASH_ACCESS_KEY ||
        process.env.UNSPLASH_ACCESS_KEY ||
        '',
    ).trim()
  } catch {
    return String(process.env.NUXT_UNSPLASH_ACCESS_KEY || process.env.UNSPLASH_ACCESS_KEY || '').trim()
  }
}

export async function searchUnsplashPhotos(opts: {
  query: string
  accessKey: string
  perPage?: number
  page?: number
  orientation?: 'landscape' | 'portrait' | 'squarish'
  excludeIds?: string[]
}): Promise<UnsplashPhoto[]> {
  const url = new URL('https://api.unsplash.com/search/photos')
  url.searchParams.set('query', opts.query)
  url.searchParams.set('per_page', String(Math.max(1, Math.min(20, opts.perPage || 8))))
  url.searchParams.set('page', String(Math.max(1, opts.page || 1)))
  url.searchParams.set('orientation', opts.orientation || 'landscape')
  url.searchParams.set('content_filter', 'high')

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Client-ID ${opts.accessKey}`,
      'Accept-Version': 'v1',
    },
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) return []

  const data = await res.json()
  const seen = new Set((opts.excludeIds || []).map((id) => id.replace(/^unsplash:/, '')))
  const out: UnsplashPhoto[] = []
  for (const photo of data?.results || []) {
    if (!photo?.id || seen.has(photo.id)) continue
    seen.add(photo.id)
    const preview = photo.urls?.regular || photo.urls?.full || photo.urls?.small || null
    if (!preview) continue
    out.push({
      id: photo.id,
      preview_url: preview,
      hotlink_url: photo.urls?.regular || photo.urls?.full || preview,
      photographer: photo.user?.name || null,
      photographer_url: photo.user?.links?.html
        ? `${photo.user.links.html}?utm_source=simy&utm_medium=referral`
        : null,
      unsplash_url: photo.links?.html
        ? `${photo.links.html}?utm_source=simy&utm_medium=referral`
        : null,
      download_location: photo.links?.download_location || null,
    })
  }
  return out
}

export async function notifyUnsplashDownload(downloadLocation: string | null | undefined, accessKey: string) {
  if (!downloadLocation || !accessKey) return
  try {
    await fetch(downloadLocation, {
      headers: { Authorization: `Client-ID ${accessKey}` },
      signal: AbortSignal.timeout(8000),
    })
  } catch {
    /* tracking best-effort — do not fail generate */
  }
}
