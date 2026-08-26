import { getAppUrl } from '~/server/utils/app-url'
import {
  buildAddonPage,
  fallbackAddonCopy,
  suggestAddonSlug,
  type AddonInputs,
  type AddonPageType,
} from '~/server/utils/website-addon-builder'
import type { ProspectArchitecture, ProspectIntent } from '~/server/utils/website-prospect-types'

const DEFAULT_DRIVING_INTENTS = ['Autofahren Kat. B', 'Motorrad', 'Anhänger Kat. BE']

function intentInputs(intent: Pick<ProspectIntent, 'type' | 'title'>, city?: string | null): AddonInputs {
  return {
    title: intent.title,
    category_name: intent.type === 'category' ? intent.title : undefined,
    city: city || undefined,
    keywords: `${intent.title}${city ? ` ${city}` : ''}`,
    notes: intent.title,
  }
}

export function slugForProspectIntent(
  intent: Pick<ProspectIntent, 'type' | 'title'>,
  city?: string | null,
) {
  return suggestAddonSlug(intent.type as AddonPageType, intentInputs(intent, city))
}

export function decideProspectArchitecture(input: {
  businessType?: string | null
  services?: Array<{ name?: string } | string> | null
  city?: string | null
  internalPaths?: string[] | null
}): ProspectArchitecture {
  const names = (input.services || [])
    .map((s) => (typeof s === 'string' ? s : String(s?.name || '')).trim())
    .filter(Boolean)
  const unique: string[] = []
  for (const name of names) {
    if (!unique.some((u) => u.toLowerCase() === name.toLowerCase())) unique.push(name)
  }

  const theirPages = (input.internalPaths || []).filter(
    (p) => p && p !== '/' && !/impressum|datenschutz|privacy|agb|cookie|login/i.test(p),
  ).length
  const theyWereMulti = theirPages >= 3
  const enoughIntents = unique.length >= 2
  const drivingFallback = input.businessType === 'driving_school' && theyWereMulti && unique.length < 2

  const topics = drivingFallback ? DEFAULT_DRIVING_INTENTS : unique.slice(0, 4)
  const intents: ProspectIntent[] = topics.map((title) => {
    const type = 'category' as const
    return { type, title, slug: slugForProspectIntent({ type, title }, input.city) }
  })

  if (enoughIntents || theyWereMulti) {
    const prices = { type: 'prices' as const, title: 'Preise' }
    intents.push({ ...prices, slug: slugForProspectIntent(prices, input.city) })
    return {
      mode: 'multi',
      reason: theyWereMulti
        ? `Die bestehende Site hat ${theirPages} Unterseiten — wir bauen die Intents als eigene URLs nach.`
        : `${unique.length} unterschiedliche Leistungen — eigene Seiten pro Suchintent.`,
      intents,
    }
  }

  return {
    mode: 'one',
    reason: 'Nur ein klarer Suchintent — Extra-Seiten wären dünn und würden der Home Konkurrenz machen.',
    intents: [],
  }
}

function photoForIntent(title: string, photosByTitle?: Record<string, string> | null, fallback?: string | null) {
  const map = photosByTitle || {}
  const exact = map[title]
  if (exact) return exact
  const key = Object.keys(map).find((k) => {
    const a = k.toLowerCase()
    const b = title.toLowerCase()
    return a === b || a.includes(b) || b.includes(a)
  })
  return (key && map[key]) || fallback || null
}

export async function applyProspectArchitecture(opts: {
  supabase: { from: (table: string) => any }
  website: { id: string; subdomain: string; primary_color?: string | null; secondary_color?: string | null; accent_color?: string | null; logo_url?: string | null; hero_image_url?: string | null }
  tenant: { id: string; name: string; slug?: string; business_type?: string | null; contact_email?: string | null; contact_phone?: string | null; address?: string | null }
  city?: string | null
  architecture: ProspectArchitecture
  photosByTitle?: Record<string, string>
  replaceExisting?: boolean
}) {
  if (opts.architecture.mode !== 'multi' || !opts.architecture.intents.length) {
    return { created: [] as string[] }
  }

  const { supabase, website, tenant } = opts
  if (opts.replaceExisting) {
    await supabase.from('website_pages').delete().eq('website_id', website.id).eq('is_home', false)
  }
  const { data: existing } = await supabase
    .from('website_pages')
    .select('id, slug, page_type, title')
    .eq('website_id', website.id)
  const used = new Set((existing || []).map((p: any) => String(p.slug)))
  const created: string[] = []
  const baseUrl = getAppUrl().replace(/\/$/, '')

  for (const intent of opts.architecture.intents) {
    const pageType = intent.type as AddonPageType
    const inputs = intentInputs(intent, opts.city)
    inputs.notes = `${intent.title} bei ${tenant.name}${opts.city ? ` in ${opts.city}` : ''}.`
    const photo = photoForIntent(intent.title, opts.photosByTitle, website.hero_image_url)
    if (photo) inputs.photos = [photo]
    let slug = intent.slug || suggestAddonSlug(pageType, inputs)
    if (used.has(slug)) continue
    used.add(slug)

    const siteUrl = `${baseUrl}/s/${encodeURIComponent(website.subdomain)}/${encodeURIComponent(slug)}`
    const copy = fallbackAddonCopy(pageType, tenant.name, inputs, 'sie')
    const landing = buildAddonPage({
      pageType,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        business_type: tenant.business_type,
        primary_color: website.primary_color,
        secondary_color: website.secondary_color,
        accent_color: website.accent_color,
        logo_url: website.logo_url,
        hero_image_url: website.hero_image_url,
        contact_email: tenant.contact_email,
        contact_phone: tenant.contact_phone,
        address: tenant.address,
        city: opts.city,
      },
      formal_address: 'sie',
      bookingUrl: '#kontakt',
      siteUrl,
      inputs,
      copy,
    })
    ;(landing as any).templateId = `${pageType}@v1`
    ;(landing as any).pageType = pageType

    const now = new Date().toISOString()
    const { error } = await supabase.from('website_pages').insert({
      website_id: website.id,
      title: intent.title,
      slug,
      is_home: false,
      is_published: false,
      page_type: pageType,
      addon_inputs: inputs,
      blocks: landing,
      seo_title: landing.seo.title,
      seo_description: landing.seo.description,
      seo_keywords: landing.seo.keywords,
      created_at: now,
      updated_at: now,
    })
    if (!error) created.push(slug)
  }

  if (created.length) {
    await supabase
      .from('website_tenants')
      .update({ addon_pages_enabled: true, updated_at: new Date().toISOString() })
      .eq('id', website.id)
  }

  return { created }
}
