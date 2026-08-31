import { buildStockQueries, stockQueryForOffer } from '~/server/utils/website-hero-prompts'
import {
  notifyUnsplashDownload,
  searchUnsplashPhotos,
  unsplashAccessKey,
  type UnsplashPhoto,
} from '~/server/utils/website-unsplash'

export type StockCredit = {
  photographer?: string | null
  photographer_url?: string | null
  unsplash_url?: string | null
  slot: string
}

export type ProspectStockFill = {
  hero_url: string | null
  hero_source: 'own' | 'stock' | null
  hero_attribution: Omit<StockCredit, 'slot'> | null
  services: Array<{ id: string; name: string; description: string; image_url?: string | null }>
  gallery: Array<{ url: string; alt: string }>
  photos_by_title: Record<string, string>
  credits: StockCredit[]
  filled: string[]
}

function creditFrom(photo: UnsplashPhoto, slot: string): StockCredit {
  return {
    photographer: photo.photographer,
    photographer_url: photo.photographer_url,
    unsplash_url: photo.unsplash_url,
    slot,
  }
}

export async function fillProspectSectionPhotos(opts: {
  businessType?: string | null
  city?: string | null
  name: string
  services: Array<{ id: string; name: string; description: string; image_url?: string | null }>
  ownHero?: string | null
  ownGallery?: Array<{ url: string; alt?: string }>
}): Promise<ProspectStockFill> {
  const ownHero = String(opts.ownHero || '').trim() || null
  const gallery = (opts.ownGallery || [])
    .filter((g) => g?.url)
    .map((g) => ({ url: g.url, alt: g.alt || opts.name }))
  const services = opts.services.map((s) => ({ ...s }))
  const photos_by_title: Record<string, string> = {}
  const credits: StockCredit[] = []
  const filled: string[] = []
  const empty: ProspectStockFill = {
    hero_url: ownHero,
    hero_source: ownHero ? 'own' : null,
    hero_attribution: null,
    services,
    gallery,
    photos_by_title,
    credits,
    filled,
  }

  const accessKey = unsplashAccessKey()
  if (!accessKey) return empty

  const usedIds = new Set<string>()
  const usedUrls = new Set(gallery.map((g) => g.url))
  if (ownHero) usedUrls.add(ownHero)

  const pick = async (query: string): Promise<UnsplashPhoto | null> => {
    try {
      const found = await searchUnsplashPhotos({
        query,
        accessKey,
        perPage: 8,
        excludeIds: [...usedIds],
      })
      const photo = found.find((p) => p.hotlink_url && !usedUrls.has(p.hotlink_url))
      if (!photo) return null
      usedIds.add(photo.id)
      usedUrls.add(photo.hotlink_url)
      await notifyUnsplashDownload(photo.download_location, accessKey)
      return photo
    } catch {
      return null
    }
  }

  let hero_url = ownHero
  let hero_source: 'own' | 'stock' | null = ownHero ? 'own' : null
  let hero_attribution: ProspectStockFill['hero_attribution'] = null

  if (!hero_url) {
    const query = buildStockQueries({
      business_type: opts.businessType,
      city: opts.city,
      categories: services.map((s) => s.name),
    })[0]
    const photo = await pick(query)
    if (photo) {
      hero_url = photo.hotlink_url
      hero_source = 'stock'
      hero_attribution = creditFrom(photo, 'hero')
      credits.push(creditFrom(photo, 'hero'))
      filled.push('hero')
    }
  }

  for (const svc of services) {
    if (svc.image_url) {
      photos_by_title[svc.name] = svc.image_url
      continue
    }
    const photo = await pick(stockQueryForOffer(svc.name, opts.businessType))
    if (!photo) continue
    svc.image_url = photo.hotlink_url
    photos_by_title[svc.name] = photo.hotlink_url
    credits.push(creditFrom(photo, `service:${svc.name}`))
    filled.push(`service:${svc.name}`)
  }

  const galleryTarget = gallery.length >= 3 ? gallery.length : 4
  const industryQueries = buildStockQueries({
    business_type: opts.businessType,
    city: opts.city,
    categories: services.map((s) => s.name),
  })
  let q = 0
  while (gallery.length < galleryTarget && q < industryQueries.length + 3) {
    const query = industryQueries[q % industryQueries.length] || stockQueryForOffer(opts.name, opts.businessType)
    q += 1
    const photo = await pick(query)
    if (!photo) break
    gallery.push({ url: photo.hotlink_url, alt: `${opts.name} — Einblick` })
    credits.push(creditFrom(photo, 'gallery'))
    filled.push('gallery')
  }

  if (hero_url && !gallery.some((g) => g.url === hero_url) && gallery.length < 6) {
    gallery.unshift({ url: hero_url, alt: `${opts.name} — Hero` })
  }

  if (hero_url && !photos_by_title.hero) photos_by_title.hero = hero_url

  return {
    hero_url,
    hero_source,
    hero_attribution,
    services,
    gallery: gallery.slice(0, 8),
    photos_by_title,
    credits,
    filled,
  }
}
