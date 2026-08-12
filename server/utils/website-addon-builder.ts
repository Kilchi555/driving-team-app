/**
 * Add-on page builders: location / category / prices
 * Same LandingPagePayload shape as the one-pager so the public renderer can reuse it.
 */
import { getTerminologyDefaults } from '~/composables/useTerminology'
import type { LandingPagePayload } from '~/utils/website-slot-schema'
import { slugifySubdomain } from '~/server/utils/website-landing-builder'
import { schemaBusinessType } from '~/server/utils/website-local-seo'

export type AddonPageType = 'location' | 'category' | 'prices'

export type AddonInputs = {
  keywords?: string
  links?: string[]
  notes?: string
  photos?: string[]
  /** Display title override */
  title?: string
  city?: string
  category_name?: string
}

export type AddonBuildContext = {
  pageType: AddonPageType
  tenant: {
    id: string
    name: string
    business_type?: string | null
    primary_color?: string | null
    secondary_color?: string | null
    accent_color?: string | null
    logo_url?: string | null
    hero_image_url?: string | null
    contact_email?: string | null
    contact_phone?: string | null
    address?: string | null
    city?: string | null
    postal_code?: string | null
  }
  formal_address?: 'sie' | 'du'
  bookingUrl: string
  siteUrl: string
  inputs: AddonInputs
  /** AI-filled or fallback copy */
  copy: {
    headline: string
    subheadline: string
    body?: string
    faq?: Array<{ q: string; a: string }>
    cta_headline?: string
    cta_subheadline?: string
    seo_title?: string
    seo_description?: string
    seo_keywords?: string
    services?: Array<{ id: string; name: string; description: string; price_label?: string | null }>
  }
}

export function suggestAddonSlug(pageType: AddonPageType, inputs: AddonInputs): string {
  const base =
    pageType === 'location'
      ? inputs.city || inputs.title || 'standort'
      : pageType === 'category'
        ? inputs.category_name || inputs.title || 'kategorie'
        : inputs.title || inputs.keywords?.split(/[,\s]+/)[0] || 'uebersicht'
  const prefix = pageType === 'prices' ? 'preise' : pageType === 'category' ? 'angebot' : 'standort'
  // Avoid "preise-preise" when base already equals prefix
  const raw = base.toLowerCase().startsWith(prefix) ? base : `${prefix}-${base}`
  const slug = slugifySubdomain(raw)
  return slug || `${prefix}-${Date.now().toString(36)}`
}

export function buildAddonPage(ctx: AddonBuildContext): LandingPagePayload {
  const t = getTerminologyDefaults(ctx.tenant.business_type)
  const formal = ctx.formal_address === 'du' ? 'du' : 'sie'
  const name = ctx.tenant.name?.trim() || 'Unser Angebot'
  const primary = ctx.tenant.primary_color || '#0F766E'
  const secondary = ctx.tenant.secondary_color || '#134E4A'
  const accent = ctx.tenant.accent_color || '#F59E0B'
  const heroImage = ctx.inputs.photos?.[0] || ctx.tenant.hero_image_url || null

  const pageLabel =
    ctx.pageType === 'location'
      ? ctx.inputs.city || ctx.inputs.title || 'Standort'
      : ctx.pageType === 'category'
        ? ctx.inputs.category_name || ctx.inputs.title || t.appointment
        : ctx.inputs.title || 'Preise'

  const seoTitle = (ctx.copy.seo_title || `${pageLabel} | ${name}`).slice(0, 60)
  const seoDescription = (
    ctx.copy.seo_description ||
    `${pageLabel} bei ${name}. Klare Infos, transparente Preise, online buchen.`
  ).slice(0, 160)
  const seoKeywords =
    ctx.copy.seo_keywords ||
    [pageLabel, name, ctx.inputs.keywords, t.bookAction, t.businessNoun].filter(Boolean).join(', ').slice(0, 200)

  const faqs =
    ctx.copy.faq?.length
      ? ctx.copy.faq
      : [
          {
            q: formal === 'du' ? `Wie buche ich in ${pageLabel}?` : `Wie buche ich in ${pageLabel}?`,
            a:
              formal === 'du'
                ? `Über die Online-Buchung auf dieser Seite wählst du einen freien Slot und buchst direkt.`
                : `Über die Online-Buchung auf dieser Seite wählen Sie einen freien Slot und buchen direkt.`,
          },
          {
            q: 'Welche Preise gelten?',
            a:
              formal === 'du'
                ? `Die aktuellen Preise siehst du auf dieser Seite bzw. im Buchungsflow.`
                : `Die aktuellen Preise sehen Sie auf dieser Seite bzw. im Buchungsflow.`,
          },
        ]

  const services =
    ctx.copy.services?.length
      ? ctx.copy.services
      : ctx.pageType === 'prices'
        ? [
            {
              id: 'p1',
              name: pageLabel,
              description: ctx.copy.body || `Transparente Preise für ${t.appointmentsPlural}.`,
              price_label: null,
            },
          ]
        : []

  const blocks: LandingPagePayload['blocks'] = [
    {
      type: 'hero',
      content: {
        brand: name,
        headline: ctx.copy.headline,
        subheadline: ctx.copy.subheadline,
        image_url: heroImage,
        image_alt: `${name} — ${pageLabel}`,
        cta_primary_text: t.bookAction,
        cta_primary_url: ctx.bookingUrl,
        cta_secondary_text: 'Mehr erfahren',
        cta_secondary_url: '#angebot',
        trust: [
          { value: '24/7', label: 'Online buchbar', icon: 'clock' },
          { value: pageLabel.slice(0, 12), label: ctx.pageType === 'location' ? 'Standort' : 'Fokus', icon: 'map' },
          { value: 'CH', label: 'Schweiz', icon: 'shield' },
        ],
      },
    },
  ]

  if (services.length || ctx.copy.body) {
    blocks.push({
      type: 'services',
      content: {
        eyebrow: ctx.pageType === 'prices' ? 'Preise' : 'Details',
        title: pageLabel,
        description: ctx.copy.body || ctx.copy.subheadline,
        services,
      },
    })
  }

  blocks.push({
    type: 'faq',
    content: {
      eyebrow: 'FAQ',
      title: 'Häufige Fragen',
      items: faqs,
    },
  })

  blocks.push({
    type: 'cta',
    content: {
      headline:
        ctx.copy.cta_headline ||
        (formal === 'du'
          ? `Bereit für deine nächste ${t.appointment}?`
          : `Bereit für Ihre nächste ${t.appointment}?`),
      subheadline:
        ctx.copy.cta_subheadline ||
        (formal === 'du'
          ? `Buche online — ${name} kümmert sich um den Rest.`
          : `Buchen Sie online — ${name} kümmert sich um den Rest.`),
      cta_text: t.bookAction,
      cta_url: ctx.bookingUrl,
    },
  })

  blocks.push({
    type: 'contact',
    content: {
      title: 'Kontakt',
      name,
      email: ctx.tenant.contact_email || null,
      phone: ctx.tenant.contact_phone || null,
      address: ctx.tenant.address || null,
      city: ctx.tenant.city || ctx.inputs.city || null,
      postal_code: ctx.tenant.postal_code || null,
    },
  })

  return {
    seo: {
      title: seoTitle,
      description: seoDescription,
      keywords: seoKeywords,
    },
    brand: {
      name,
      primary,
      secondary,
      accent,
      logo_url: ctx.tenant.logo_url || null,
      hero_image_url: heroImage,
      formal_address: formal,
    },
    bookingUrl: ctx.bookingUrl,
    siteUrl: ctx.siteUrl,
    blocks,
    schema: {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type':
            ctx.pageType === 'location'
              ? schemaBusinessType(ctx.tenant.business_type)
              : 'WebPage',
          '@id': `${ctx.siteUrl}#page`,
          name: seoTitle,
          description: seoDescription,
          url: ctx.siteUrl,
          isPartOf: { '@id': `${ctx.siteUrl.replace(/\/[^/]*$/, '') || ctx.siteUrl}#website` },
          ...(ctx.pageType === 'location'
            ? {
                address: {
                  '@type': 'PostalAddress',
                  addressLocality: ctx.inputs.city || ctx.tenant.city || undefined,
                  addressCountry: 'CH',
                },
                areaServed: ctx.inputs.city
                  ? { '@type': 'City', name: ctx.inputs.city }
                  : undefined,
              }
            : {}),
        },
        {
          '@type': 'BreadcrumbList',
          '@id': `${ctx.siteUrl}#breadcrumb`,
          itemListElement: [
            {
              '@type': 'ListItem',
              position: 1,
              name: name,
              item: ctx.siteUrl.replace(/\/[^/]*$/, '') || ctx.siteUrl,
            },
            {
              '@type': 'ListItem',
              position: 2,
              name: pageLabel,
              item: ctx.siteUrl,
            },
          ],
        },
      ],
    },
  }
}

/** Fallback copy when AI unavailable */
export function fallbackAddonCopy(
  pageType: AddonPageType,
  tenantName: string,
  inputs: AddonInputs,
  formal: 'sie' | 'du',
): AddonBuildContext['copy'] {
  const label =
    pageType === 'location'
      ? inputs.city || inputs.title || 'unserem Standort'
      : pageType === 'category'
        ? inputs.category_name || inputs.title || 'dieses Angebot'
        : 'unsere Preise'

  if (pageType === 'location') {
    return {
      headline: `${tenantName} in ${inputs.city || inputs.title || 'Ihrer Nähe'}`,
      subheadline:
        formal === 'du'
          ? `Buche online am Standort ${inputs.city || ''}. Klar, lokal, ohne Wartezeit am Telefon.`
          : `Buchen Sie online am Standort ${inputs.city || ''}. Klar, lokal, ohne Wartezeit am Telefon.`,
      body: inputs.notes || `Alles Wichtige zu ${label} — Anfahrt, Angebot und Buchung.`,
      seo_title: `${inputs.city || 'Standort'} | ${tenantName}`.slice(0, 60),
      seo_description: `${tenantName} in ${inputs.city || 'der Schweiz'}: Angebot, Preise und Online-Buchung vor Ort.`.slice(0, 160),
      seo_keywords: [inputs.keywords, inputs.city, tenantName].filter(Boolean).join(', '),
    }
  }

  if (pageType === 'category') {
    return {
      headline: `${inputs.category_name || inputs.title || 'Angebot'} bei ${tenantName}`,
      subheadline:
        formal === 'du'
          ? `Alles zu ${label} — Preise, Ablauf und direkte Online-Buchung.`
          : `Alles zu ${label} — Preise, Ablauf und direkte Online-Buchung.`,
      body: inputs.notes || `Detaillierte Infos zu ${label}.`,
      seo_title: `${inputs.category_name || 'Kategorie'} | ${tenantName}`.slice(0, 60),
      seo_description: `${inputs.category_name || 'Angebot'} bei ${tenantName}. Online buchen.`.slice(0, 160),
      seo_keywords: [inputs.keywords, inputs.category_name, tenantName].filter(Boolean).join(', '),
    }
  }

  return {
    headline: `Preise bei ${tenantName}`,
    subheadline:
      formal === 'du'
        ? 'Transparente Preise — ohne Überraschungen. Buche online in wenigen Klicks.'
        : 'Transparente Preise — ohne Überraschungen. Buchen Sie online in wenigen Klicks.',
    body: inputs.notes || 'Aktuelle Preise und Formate im Überblick.',
    seo_title: `Preise | ${tenantName}`.slice(0, 60),
    seo_description: `Preise bei ${tenantName}: klar und online buchbar.`.slice(0, 160),
    seo_keywords: [inputs.keywords, 'preise', tenantName].filter(Boolean).join(', '),
  }
}
