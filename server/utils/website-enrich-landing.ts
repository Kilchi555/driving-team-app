/**
 * Enrich baked landing payload with live premium data (team, courses, hours freshness).
 */
import {
  isSimyAvailabilityUrl,
  isSimyCommerceUrl,
  websiteInquireUrl,
  type LandingPagePayload,
} from '~/server/utils/website-landing-builder'
import { buildConfirmationProcessStep } from '~/server/utils/website-confirmation-copy'
import { getTerminologyDefaults, isDrivingSchoolBusinessType } from '~/composables/useTerminology'
import { isSeedPlaceholderStaffName, shouldHideStaffOnWebsite } from '~/utils/website-wizard-content'
import { buildLocalFaqs, resolveWebsiteCity } from '~/server/utils/website-local-seo'
import {
  buildPickupFaq,
  isPickupFaq,
  loadWebsitePickupOffer,
  withPickupMeetingPoint,
  withPickupProcessText,
} from '~/server/utils/website-pickup'
import { ensureWebsitePickupPlzCache } from '~/server/utils/website-pickup-plz'
import {
  tenantHqCoveredByMeetingPoints,
  tenantPublicSocialLinks,
} from '~/server/utils/website-public-tenant'
import {
  dedupeWebsiteTeam,
  formatOpeningHours,
  mapStaffToTeam,
  mapsEmbedUrl,
  mapsExternalUrl,
  openingHoursToSchema,
  resolveWorkingTemplate,
  whatsappUrlForTenant,
  type LandingTeamMember,
  type UpcomingCourseCard,
} from '~/server/utils/website-premium'
import {
  buildReserveActionSchema,
  buildSlotEventSchema,
  loadWebsiteTeaserSlots,
} from '~/server/utils/website-next-slots'
import {
  customProductsFromLanding,
  loadWebsiteCatalogProducts,
  mergeWebsiteProducts,
  shopUrlForTenant,
} from '~/server/utils/website-products'

type SupabaseLike = {
  from: (table: string) => any
}

function isPlaceholderStaffName(name: string, tenant?: Record<string, any> | null) {
  return shouldHideStaffOnWebsite(name, tenant || undefined)
}

function looksLikeBookCta(text?: string | null) {
  return /buchen|termin sichern|platz sichern/i.test(String(text || ''))
}

function customOrInquire(url: string | null | undefined, inquire: string) {
  const u = String(url || '').trim()
  if (u && !isSimyCommerceUrl(u)) return u
  return inquire
}

function applyWebsiteOnlyConversion(
  blocks: LandingPagePayload['blocks'],
  landing: LandingPagePayload,
  whatsappUrl: string | null,
) {
  const baseInquire = websiteInquireUrl(whatsappUrl)
  if (!landing.bookingUrl || isSimyCommerceUrl(landing.bookingUrl)) {
    landing.bookingUrl = baseInquire
  }

  const services = blocks.find((b) => b.type === 'services')
  if (services && Array.isArray(services.content.services)) {
    services.content.services = services.content.services.map((s: any) => ({
      ...s,
      book_url: customOrInquire(s.book_url, websiteInquireUrl(whatsappUrl, s.name, 'inquire')),
    }))
  }

  const products = blocks.find((b) => b.type === 'products')
  if (products && Array.isArray(products.content.products)) {
    products.content.products = products.content.products.map((p: any) => {
      const customShop = p.shop_url && !isSimyCommerceUrl(p.shop_url)
      return {
        ...p,
        shop_url: customShop ? p.shop_url : websiteInquireUrl(whatsappUrl, p.name, 'order'),
        cta_label: customShop ? p.cta_label || 'Im Shop kaufen →' : 'Bestellen',
      }
    })
    if (!products.content.cta_url || isSimyCommerceUrl(products.content.cta_url)) {
      products.content.cta_url = websiteInquireUrl(whatsappUrl, null, 'order')
      if (!products.content.cta_text || /shop/i.test(String(products.content.cta_text))) {
        products.content.cta_text = 'Bestellen'
      }
    }
  }

  for (let i = blocks.length - 1; i >= 0; i--) {
    if (blocks[i].type === 'slots' || blocks[i].type === 'courses') blocks.splice(i, 1)
  }

  const pickup = blocks.find((b) => b.type === 'contact')?.content?.pickup_check
  if (pickup?.enabled) {
    pickup.book_url = customOrInquire(pickup.book_url, baseInquire)
  }

  const hero = blocks.find((b) => b.type === 'hero')
  if (hero) {
    hero.content.cta_primary_url = customOrInquire(hero.content.cta_primary_url, baseInquire)
    if (looksLikeBookCta(hero.content.cta_primary_text)) hero.content.cta_primary_text = 'Anfragen'
  }
  const cta = blocks.find((b) => b.type === 'cta')
  if (cta) {
    cta.content.cta_url = customOrInquire(cta.content.cta_url, baseInquire)
    if (looksLikeBookCta(cta.content.cta_text)) cta.content.cta_text = 'Anfragen'
  }

  const process = blocks.find((b) => b.type === 'process')
  if (process && Array.isArray(process.content.steps)) {
    process.content.steps = process.content.steps.map((s: any) => {
      if (Number(s?.n) !== 1) return s
      if (!/buchen/i.test(String(s.title || ''))) return s
      const informal = /\b(du|dich|dir)\b/i.test(String(s.text || ''))
      return {
        ...s,
        title: 'Anfragen',
        text: informal
          ? 'Schreib uns — wir melden uns mit dem nächsten freien Termin.'
          : 'Schreiben Sie uns — wir melden uns mit dem nächsten freien Termin.',
      }
    })
  }
}

export async function enrichLandingPremium(
  supabase: SupabaseLike,
  tenant: Record<string, any> | null,
  landing: LandingPagePayload | null,
  opts?: {
    siteUrl?: string
    subdomain?: string
    pageSlug?: string | null
    pageTitle?: string | null
    navPages?: Array<{ title: string; slug: string; page_type?: string | null; is_home?: boolean }>
  },
): Promise<LandingPagePayload | null> {
  if (!landing || !Array.isArray(landing.blocks) || !tenant?.id) return landing

  try {
    return await enrichLandingPremiumInner(supabase, tenant, landing, opts)
  } catch (err) {
    console.error('[website-enrich] failed, returning baked landing', err)
    return landing
  }
}

async function enrichLandingPremiumInner(
  supabase: SupabaseLike,
  tenant: Record<string, any>,
  landing: LandingPagePayload,
  opts?: {
    siteUrl?: string
    subdomain?: string
    pageSlug?: string | null
    pageTitle?: string | null
    navPages?: Array<{ title: string; slug: string; page_type?: string | null; is_home?: boolean }>
  },
): Promise<LandingPagePayload> {
  const blocks = landing.blocks.map((b) => ({
    type: b.type,
    content: { ...(b.content || {}) },
  })) as LandingPagePayload['blocks']

  const pickupOffer = await loadWebsitePickupOffer(supabase, tenant.id)
  const websiteOnly = Boolean(tenant.website_only)

  // --- Services deep-book ---
  const servicesIdx = blocks.findIndex((b) => b.type === 'services')
  if (servicesIdx >= 0 && Array.isArray(blocks[servicesIdx].content.services)) {
    const bookingUrl = landing.bookingUrl
    blocks[servicesIdx].content.services = blocks[servicesIdx].content.services.map((s: any) => {
      if (!bookingUrl) return s
      if (!isSimyAvailabilityUrl(bookingUrl)) return { ...s, book_url: bookingUrl }
      if (s.book_url && isSimyAvailabilityUrl(s.book_url)) return s
      const cat = s.category || s.name
      if (!cat) return { ...s, book_url: s.book_url || bookingUrl }
      const sep = bookingUrl.includes('?') ? '&' : '?'
      return { ...s, book_url: `${bookingUrl}${sep}category=${encodeURIComponent(String(cat))}` }
    })
  }
  let staffRows: any[] = []
  try {
    const res = await supabase
      .from('users')
      .select('id, first_name, last_name, role, language, category, profession, metadata, is_active')
      .eq('tenant_id', tenant.id)
      .eq('is_active', true)
      .in('role', ['staff', 'admin'])
      .order('role', { ascending: true })
      .limit(12)
    staffRows = res.data || []
  } catch {
    staffRows = []
  }

  const liveStaff = mapStaffToTeam(staffRows, tenant.business_type).filter((m) => !isPlaceholderStaffName(m.name, tenant))
  const configuredTeam = Array.isArray((landing.brand as any)?.website_team)
    ? (landing.brand as any).website_team
    : Array.isArray(blocks.find((b) => b.type === 'team')?.content?.members)
      ? blocks.find((b) => b.type === 'team')?.content?.members
      : null
  const team = resolveWebsiteTeam(configuredTeam, liveStaff, tenant)
  let teamIdx = blocks.findIndex((b) => b.type === 'team')
  if (teamIdx < 0 && team.length) {
    const afterProcess = blocks.findIndex((b) => b.type === 'process')
    const afterTestimonials = blocks.findIndex((b) => b.type === 'testimonials')
    const insertAt =
      afterProcess >= 0
        ? afterProcess + 1
        : afterTestimonials >= 0
          ? afterTestimonials + 1
          : Math.max(1, blocks.length - 2)
    blocks.splice(insertAt, 0, {
      type: 'team',
      content: {
        eyebrow: 'Team',
        title: 'Ihr Team vor Ort',
        description: 'Lernen Sie die Menschen kennen, die Sie begleiten.',
        members: [],
      },
    })
    teamIdx = blocks.findIndex((b) => b.type === 'team')
  }
  if (teamIdx >= 0) {
    if (team.length) blocks[teamIdx].content.members = team
    else blocks.splice(teamIdx, 1)
  }

  // --- Gallery: never show logo as gallery image ---
  const logoUrl = String(tenant.logo_url || landing.brand?.logo_url || '').trim()
  const galleryIdx = blocks.findIndex((b) => b.type === 'gallery')
  if (galleryIdx >= 0) {
    const imgs = Array.isArray(blocks[galleryIdx].content?.images)
      ? blocks[galleryIdx].content.images
      : []
    const filtered = imgs.filter((img: any) => {
      const url = String(img?.url || '').trim()
      if (!url) return false
      if (logoUrl && urlsLikelySame(url, logoUrl)) return false
      const alt = String(img?.alt || '').toLowerCase()
      if (alt.includes('logo')) return false
      return true
    })
    if (filtered.length > 1) {
      blocks[galleryIdx].content.images = filtered
    } else {
      blocks.splice(galleryIdx, 1)
    }
  }

  // --- Products (Simy catalog + wizard extras) ---
  const isHome = !opts?.pageSlug || opts.pageSlug === 'index'
  const bakedProducts = customProductsFromLanding(
    blocks.find((b) => b.type === 'products')?.content?.products,
  )
  const dbProducts = websiteOnly
    ? []
    : await loadWebsiteCatalogProducts(supabase, tenant.id, {
        bookingUrl: landing.bookingUrl,
        slug: tenant.slug,
      })
  const products = mergeWebsiteProducts(dbProducts, bakedProducts)
  let productsIdx = blocks.findIndex((b) => b.type === 'products')
  if (isHome && productsIdx < 0 && products.length) {
    const afterServices = blocks.findIndex((b) => b.type === 'services')
    const insertAt = afterServices >= 0 ? afterServices + 1 : 1
    blocks.splice(insertAt, 0, {
      type: 'products',
      content: {
        eyebrow: 'Produkte',
        title: isDrivingSchoolBusinessType(tenant.business_type) ? 'Produkte & Lehrmittel' : 'Produkte',
        description: 'Material, Gutscheine und weiteres — transparent mit Preis.',
        products: [],
      },
    })
    productsIdx = blocks.findIndex((b) => b.type === 'products')
  }
  if (productsIdx >= 0) {
    if (products.length && isHome) {
      const shopUrl = products.some((p) => p.shop_url)
        ? shopUrlForTenant(landing.bookingUrl, tenant.slug)
        : null
      blocks[productsIdx].content.products = products
      if (shopUrl) {
        blocks[productsIdx].content.cta_text = 'Zum Shop'
        blocks[productsIdx].content.cta_url = shopUrl
      }
    } else if (!isHome || !products.length) {
      blocks.splice(productsIdx, 1)
    }
  }

  // --- Courses ---
  const courses = websiteOnly ? [] : await loadUpcomingCourses(supabase, tenant, landing.bookingUrl)
  let coursesIdx = blocks.findIndex((b) => b.type === 'courses')
  if (coursesIdx < 0 && courses.length) {
    const afterTeam = blocks.findIndex((b) => b.type === 'team')
    const afterProcess = blocks.findIndex((b) => b.type === 'process')
    const insertAt =
      afterTeam >= 0 ? afterTeam + 1 : afterProcess >= 0 ? afterProcess + 1 : Math.max(1, blocks.length - 2)
    blocks.splice(insertAt, 0, {
      type: 'courses',
      content: {
        eyebrow: 'Kurse',
        title: 'Nächste Kurstermine',
        description: 'Aktuelle Termine aus dem System.',
        items: [],
      },
    })
    coursesIdx = blocks.findIndex((b) => b.type === 'courses')
  }
  if (coursesIdx >= 0) {
    blocks[coursesIdx].content.items = courses
    if (!blocks[coursesIdx].content.cta_url && tenant.slug) {
      const base = String(landing.bookingUrl || opts?.siteUrl || '')
        .replace(/\/booking\/availability\/[^/?#]+.*$/, '')
        .replace(/\/$/, '')
      blocks[coursesIdx].content.cta_url = base
        ? `${base}/customer/courses/${encodeURIComponent(tenant.slug)}`
        : `/customer/courses/${encodeURIComponent(tenant.slug)}`
    }
  }

  // --- Booking teaser slots (high intent — directly after services) ---
  let slots: Awaited<ReturnType<typeof loadWebsiteTeaserSlots>> = []
  if (!websiteOnly) {
    try {
      slots = await loadWebsiteTeaserSlots(supabase, {
        tenantId: tenant.id,
        bookingUrl: landing.bookingUrl,
        leadTimeHours: tenant.minimum_booking_lead_time_hours,
      })
    } catch {
      slots = []
    }
  }
  let slotsIdx = blocks.findIndex((b) => b.type === 'slots')
  if (slotsIdx < 0 && slots.length) {
    const afterServices = blocks.findIndex((b) => b.type === 'services')
    const insertAt = afterServices >= 0 ? afterServices + 1 : 1
    blocks.splice(insertAt, 0, {
      type: 'slots',
      content: {
        eyebrow: 'Termine',
        title: `Nächste freie ${getTerminologyDefaults(tenant.business_type).appointmentsPlural}`,
        description: 'Aktuelle Verfügbarkeit — Klick öffnet den Live-Kalender.',
        items: [],
        cta_text: 'Alle Termine',
        cta_url: landing.bookingUrl,
      },
    })
    slotsIdx = blocks.findIndex((b) => b.type === 'slots')
  }
  if (slotsIdx >= 0) {
    blocks[slotsIdx].content.items = slots
    blocks[slotsIdx].content.cta_url = blocks[slotsIdx].content.cta_url || landing.bookingUrl
  }

  // --- Contact enrichment ---
  const contactIdx = blocks.findIndex((b) => b.type === 'contact')
  if (contactIdx >= 0) {
    const c = blocks[contactIdx].content
    const channels = {
      phone: c.channels?.phone !== false,
      email: c.channels?.email !== false,
      whatsapp: c.channels?.whatsapp !== false,
      form: c.channels?.form !== false && c.form_enabled !== false,
    }
    c.channels = channels
    const phone = c.phone || tenant.contact_phone || tenant.phone || null
    const email = c.email || tenant.contact_email || tenant.email || null
    const city = c.city || resolveWebsiteCity(tenant) || null
    const hoursTpl = resolveWorkingTemplate(tenant)
    const addrParts = [
      c.address || tenant.address,
      c.postal_code || tenant.postal_code || tenant.invoice_zip,
      city,
    ]
    const siteUrl = (opts?.siteUrl || landing.siteUrl || '').replace(/\/$/, '')
    const sub = opts?.subdomain
    const impressumPath = sub ? `/s/${sub}/impressum` : `${siteUrl}/impressum`
    const datenschutzPath = sub ? `/s/${sub}/datenschutz` : `${siteUrl}/datenschutz`

    c.phone = channels.phone ? phone : null
    c.email = channels.email ? email : null
    c.whatsapp_url = channels.whatsapp ? whatsappUrlForTenant(tenant) : null
    c.hours = formatOpeningHours(hoursTpl)
    c.hours_title = c.hours_title || 'Öffnungszeiten'
    c.map_embed_url = c.map_embed_url || mapsEmbedUrl(addrParts)
    c.map_url = c.map_url || mapsExternalUrl(addrParts)
    c.form_enabled = channels.form
    c.impressum_url = impressumPath
    c.datenschutz_url = datenschutzPath
    c.legal_links = [
      { label: 'Impressum', href: impressumPath },
      { label: 'Datenschutz', href: datenschutzPath },
    ]
    c.meeting_points = withPickupMeetingPoint([], pickupOffer.enabled)
    c.show_hq_address = !tenantHqCoveredByMeetingPoints(
      {
        address: c.address || tenant.address,
        postal_code: c.postal_code || tenant.postal_code || tenant.invoice_zip,
        city,
      },
      c.meeting_points,
    )
    c.social = tenantPublicSocialLinks(tenant)
    if (pickupOffer.enabled) {
      try {
        await ensureWebsitePickupPlzCache(supabase, tenant.id, pickupOffer)
      } catch {
        /* checker still works via live lookup */
      }
      const formal: 'du' | 'sie' = landing.brand?.formal_address === 'du' ? 'du' : 'sie'
      c.pickup_check = {
        enabled: true,
        radius_minutes: pickupOffer.radiusMinutes,
        title: formal === 'du' ? 'Bin ich im Radius?' : 'Sind Sie im Radius?',
        subtitle:
          pickupOffer.radiusMinutes && pickupOffer.radiusMinutes > 0
            ? formal === 'du'
              ? `Eigener Treffpunkt im Umkreis von ca. ${pickupOffer.radiusMinutes} Minuten. PLZ prüfen.`
              : `Eigener Treffpunkt im Umkreis von ca. ${pickupOffer.radiusMinutes} Minuten. PLZ prüfen.`
            : formal === 'du'
              ? 'Eigener Treffpunkt im hinterlegten Umkreis. PLZ prüfen.'
              : 'Eigener Treffpunkt im hinterlegten Umkreis. PLZ prüfen.',
        placeholder: 'PLZ',
        cta: 'Prüfen',
        book_url: landing.bookingUrl,
      }
    } else {
      c.pickup_check = { enabled: false }
    }
  }

  // --- Hero / CTA WhatsApp ---
  const contactChannels = blocks.find((b) => b.type === 'contact')?.content?.channels
  const waAllowed = contactChannels?.whatsapp !== false
  const wa = waAllowed ? whatsappUrlForTenant(tenant) : null
  for (const type of ['hero', 'cta'] as const) {
    const idx = blocks.findIndex((b) => b.type === type)
    if (idx < 0) continue
    if (wa) blocks[idx].content.whatsapp_url = blocks[idx].content.whatsapp_url || wa
    else blocks[idx].content.whatsapp_url = null
  }

  // --- Ensure process block exists + sync confirmation channel from booking_policy ---
  const processIdx = blocks.findIndex((b) => b.type === 'process')
  if (processIdx < 0) {
    const faqIdx = blocks.findIndex((b) => b.type === 'faq')
    const confirm = buildConfirmationProcessStep(tenant.booking_policy, 'sie')
    blocks.splice(faqIdx >= 0 ? faqIdx : blocks.length - 1, 0, {
      type: 'process',
      content: {
        eyebrow: 'Ablauf',
        title: 'So einfach geht es',
        steps: [
          {
            n: 1,
            title: 'Online buchen',
            text: pickupOffer.enabled
              ? `Termin, ${getTerminologyDefaults(tenant.business_type).categoryLabel} und Treffpunkt — oder Wunschort im Radius.`
              : `Termin und ${getTerminologyDefaults(tenant.business_type).categoryLabel} in wenigen Klicks wählen.`,
          },
          { n: 2, title: confirm.title, text: confirm.text },
          {
            n: 3,
            title: isDrivingSchoolBusinessType(tenant.business_type) ? 'Losfahren' : 'Loslegen',
            text: `${tenant.name || 'Wir'} begleiten Sie Schritt für Schritt.`,
          },
        ],
      },
    })
  } else {
    const steps = Array.isArray(blocks[processIdx].content.steps)
      ? [...blocks[processIdx].content.steps]
      : []
    const formal: 'du' | 'sie' =
      landing.brand?.formal_address === 'du' ||
      steps.some((s: any) => /\b(Du|dich|dir)\b/.test(String(s?.text || '')))
        ? 'du'
        : 'sie'
    const confirm = buildConfirmationProcessStep(tenant.booking_policy, formal)
    const step1Idx = steps.findIndex((s: any) => Number(s?.n) === 1)
    if (step1Idx >= 0) {
      steps[step1Idx] = {
        ...steps[step1Idx],
        text: withPickupProcessText(String(steps[step1Idx].text || ''), pickupOffer.enabled, formal),
      }
    }
    const step2Idx = steps.findIndex((s: any) => Number(s?.n) === 2)
    if (step2Idx >= 0) {
      steps[step2Idx] = { ...steps[step2Idx], title: confirm.title, text: confirm.text }
    } else if (steps.length >= 2) {
      steps[1] = { ...steps[1], n: steps[1]?.n ?? 2, title: confirm.title, text: confirm.text }
    }
    blocks[processIdx].content.steps = steps
  }

  // --- FAQ expand (SEO) + keep FAQPage schema in sync ---
  const formalFaq: 'du' | 'sie' = landing.brand?.formal_address === 'du' ? 'du' : 'sie'
  const faqCity = resolveWebsiteCity(tenant) || null
  const faqTerms = getTerminologyDefaults(tenant.business_type)
  const serviceNames = (blocks.find((b) => b.type === 'services')?.content?.services || [])
    .map((s: any) => String(s?.name || '').trim())
    .filter(Boolean)
  const generatedFaqs = buildLocalFaqs(
    faqTerms,
    tenant.name || landing.brand?.name || 'Wir',
    formalFaq,
    tenant.business_type,
    faqCity,
    serviceNames,
    pickupOffer.enabled,
  )
  let faqBlockIdx = blocks.findIndex((b) => b.type === 'faq')
  const existingFaqs = Array.isArray(blocks[faqBlockIdx]?.content?.items)
    ? blocks[faqBlockIdx].content.items.filter((item: any) => item?.q && item?.a)
    : []
  const looksLikeDrivingFaq = existingFaqs.some((item: any) =>
    /fahrstunde|lernfahrausweis|fahrlektion/i.test(`${item?.q || ''} ${item?.a || ''}`),
  )
  const keepExisting =
    existingFaqs.length &&
    !(looksLikeDrivingFaq && !isDrivingSchoolBusinessType(tenant.business_type))
  let faqs = (keepExisting ? existingFaqs : generatedFaqs).slice(0, 10)
  if (pickupOffer.enabled && !faqs.some((item: any) => isPickupFaq(item))) {
    faqs = [...faqs, buildPickupFaq(formalFaq, pickupOffer.radiusMinutes)].slice(0, 10)
  }
  if (faqBlockIdx < 0 && faqs.length) {
    const ctaIdx = blocks.findIndex((b) => b.type === 'cta')
    blocks.splice(ctaIdx >= 0 ? ctaIdx : blocks.length, 0, {
      type: 'faq',
      content: {
        eyebrow: 'FAQ',
        title: 'Häufige Fragen',
        items: faqs,
      },
    })
  } else if (faqBlockIdx >= 0 && faqs.length) {
    blocks[faqBlockIdx].content.items = faqs
  }

  const navPages = (opts?.navPages || []).filter((p) => !p.is_home && p.slug && p.slug !== 'index')
  const sub = opts?.subdomain || ''
  const pageHref = (slug: string, isHome?: boolean) =>
    isHome || slug === 'index' ? `/s/${sub}` : `/s/${sub}/${slug}`

  if (servicesIdx >= 0 && Array.isArray(blocks[servicesIdx].content.services) && navPages.length) {
    blocks[servicesIdx].content.services = blocks[servicesIdx].content.services.map((s: any) => {
      const name = String(s?.name || '').toLowerCase()
      const cat = String(s?.category || '').toLowerCase()
      const match = navPages.find((p) => {
        const t = String(p.title || '').toLowerCase()
        return p.page_type === 'category' && (t === name || t === cat || t.includes(name) || name.includes(t))
      })
      if (!match) return s
      return { ...s, page_url: pageHref(match.slug), page_label: match.title }
    })
  }

  if (navPages.length) {
    const pageItems = navPages.slice(0, 8).map((p) => ({
      title: p.title,
      slug: p.slug,
      href: pageHref(p.slug),
      type: p.page_type || 'addon',
    }))
    const pagesIdx = blocks.findIndex((b) => b.type === 'pages')
    const pagesCopy = {
      eyebrow: 'Mehr erfahren',
      title: faqCity ? `Seiten rund um ${faqCity}` : 'Weitere Seiten',
      description: 'Vertiefende Infos zu Standorten, Kategorien und Preisen.',
      items: pageItems,
    }
    if (pagesIdx >= 0) {
      blocks[pagesIdx].content = {
        ...blocks[pagesIdx].content,
        ...pagesCopy,
      }
    } else {
      const faqIdx = blocks.findIndex((b) => b.type === 'faq')
      blocks.splice(faqIdx >= 0 ? faqIdx : blocks.length, 0, {
        type: 'pages',
        content: pagesCopy,
      })
    }
  }

  if (websiteOnly) applyWebsiteOnlyConversion(blocks, landing, wa)

  // --- Schema extras ---
  const schema = landing.schema && typeof landing.schema === 'object' ? { ...landing.schema } : null
  if (schema && Array.isArray(schema['@graph'])) {
    let graph = [...schema['@graph']]
    const bizIdx = graph.findIndex((n: any) => {
      if (!n) return false
      if (String(n['@id'] || '').endsWith('#business')) return true
      const t = n['@type']
      if (t === 'DrivingSchool' || t === 'LocalBusiness') return true
      if (Array.isArray(t) && (t.includes('DrivingSchool') || t.includes('LocalBusiness'))) return true
      return false
    })
    if (bizIdx >= 0) {
      const hoursTpl = resolveWorkingTemplate(tenant)
      const biz = { ...graph[bizIdx] }
      biz.openingHoursSpecification = openingHoursToSchema(hoursTpl)
      const map = mapsExternalUrl([
        tenant.address,
        tenant.postal_code || tenant.invoice_zip,
        resolveWebsiteCity(tenant),
      ])
      if (map) biz.hasMap = map

      let lat = tenant.latitude
      let lng = tenant.longitude
      if (lat == null || lng == null) {
        try {
          const { data: loc } = await supabase
            .from('locations')
            .select('latitude, longitude')
            .eq('tenant_id', tenant.id)
            .eq('is_active', true)
            .not('latitude', 'is', null)
            .not('longitude', 'is', null)
            .limit(1)
            .maybeSingle()
          if (loc?.latitude != null && loc?.longitude != null) {
            lat = loc.latitude
            lng = loc.longitude
          }
        } catch {
          /* ignore */
        }
      }
      if (lat != null && lng != null) {
        biz.geo = {
          '@type': 'GeoCoordinates',
          latitude: Number(lat),
          longitude: Number(lng),
        }
      }
      biz.potentialAction = buildReserveActionSchema(
        landing.bookingUrl,
        websiteOnly ? 'Anfragen' : 'Jetzt buchen',
      )
      const social = tenantPublicSocialLinks(tenant)
      if (social.length) {
        biz.sameAs = [...new Set([...(Array.isArray(biz.sameAs) ? biz.sameAs : []), ...social.map((s) => s.href)])]
      }
      if (tenant.uid_number) biz.taxID = String(tenant.uid_number).trim()
      if (tenant.legal_company_name) biz.legalName = String(tenant.legal_company_name).trim()
      const extraPlaces = (blocks.find((b) => b.type === 'contact')?.content?.meeting_points || [])
        .filter((p: any) => p?.name && String(p.id || '') !== 'pickup' && p.address)
        .slice(0, 6)
        .map((p: any) => ({
          '@type': 'Place',
          name: String(p.name),
          address: String(p.address),
        }))
      if (extraPlaces.length) biz.location = extraPlaces
      graph[bizIdx] = biz
    }

    graph = graph.filter((n: any) => {
      const id = String(n?.['@id'] || '')
      return !id.includes('#course-') && !id.includes('#slot-') && !id.includes('#product-')
    })

    const siteUrl =
      String(opts?.siteUrl || landing.siteUrl || '').replace(/\/$/, '') || landing.siteUrl

    if (faqs.length) {
      const faqNode = {
        '@type': 'FAQPage',
        '@id': `${siteUrl}#faq`,
        mainEntity: faqs.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      }
      const faqSchemaIdx = graph.findIndex((n: any) => n?.['@type'] === 'FAQPage')
      if (faqSchemaIdx >= 0) graph[faqSchemaIdx] = faqNode
      else graph.push(faqNode)
    }

    for (const [i, c] of courses.slice(0, 5).entries()) {
      graph.push({
        '@type': 'Course',
        '@id': `${siteUrl}#course-${i + 1}`,
        name: c.title,
        provider: { '@id': `${siteUrl}#business` },
        ...(c.category ? { category: c.category } : {}),
        ...(c.price_chf != null
          ? {
              offers: {
                '@type': 'Offer',
                price: String(c.price_chf),
                priceCurrency: 'CHF',
                availability:
                  c.spots_left != null && c.spots_left <= 0
                    ? 'https://schema.org/SoldOut'
                    : 'https://schema.org/InStock',
                url: c.href || landing.bookingUrl,
              },
            }
          : {}),
        ...(c.starts_at
          ? {
              hasCourseInstance: {
                '@type': 'CourseInstance',
                courseMode: 'onsite',
                startDate: c.starts_at,
                ...(c.ends_at ? { endDate: c.ends_at } : {}),
                location: c.location
                  ? { '@type': 'Place', name: c.location }
                  : undefined,
              },
            }
          : {}),
      })
    }

    for (const [i, p] of products.slice(0, 8).entries()) {
      graph.push({
        '@type': 'Product',
        '@id': `${siteUrl}#product-${i + 1}`,
        name: p.name,
        ...(p.description ? { description: p.description } : {}),
        ...(p.category ? { category: p.category } : {}),
        brand: { '@id': `${siteUrl}#business` },
        ...(p.price_cents != null
          ? {
              offers: {
                '@type': 'Offer',
                price: String(Math.round(p.price_cents / 100)),
                priceCurrency: 'CHF',
                availability: 'https://schema.org/InStock',
                url: p.shop_url || `${siteUrl}#produkte`,
              },
            }
          : {}),
      })
    }

    graph.push(
      ...buildSlotEventSchema(slots, {
        siteUrl,
        businessName: tenant.name || landing.brand?.name || 'Angebot',
        max: 5,
      }),
    )

    if (navPages.length || opts?.pageSlug) {
      const homeUrl = String(siteUrl || '').replace(/\/$/, '') || landing.siteUrl
      const crumbs: any[] = [
        {
          '@type': 'ListItem',
          position: 1,
          name: tenant.name || landing.brand?.name || 'Home',
          item: `${homeUrl}/`,
        },
      ]
      if (opts?.pageSlug && opts.pageSlug !== 'index') {
        crumbs.push({
          '@type': 'ListItem',
          position: 2,
          name: opts.pageTitle || opts.pageSlug,
          item: `${homeUrl}/${opts.pageSlug}`,
        })
      }
      const crumbNode = {
        '@type': 'BreadcrumbList',
        '@id': `${homeUrl}#breadcrumb`,
        itemListElement: crumbs,
      }
      const crumbIdx = graph.findIndex((n: any) => n?.['@type'] === 'BreadcrumbList')
      if (crumbIdx >= 0) graph[crumbIdx] = crumbNode
      else graph.push(crumbNode)
    }

    const webIdx = graph.findIndex((n: any) => n?.['@type'] === 'WebSite')
    if (webIdx >= 0) {
      graph[webIdx] = {
        ...graph[webIdx],
        potentialAction: buildReserveActionSchema(
          landing.bookingUrl,
          websiteOnly ? 'Anfragen' : 'Jetzt buchen',
        ),
      }
    }

    schema['@graph'] = graph
  }

  const brand = {
    ...landing.brand,
    hide_powered_by: landing.brand?.hide_powered_by !== false,
    template: landing.brand?.template || 'classic',
    website_only: websiteOnly,
  }

  // Conversion order for existing published landings (without republish)
  const orderedBlocks = reorderLandingBlocks(blocks)

  return {
    ...landing,
    brand,
    blocks: orderedBlocks,
    schema: schema || landing.schema,
    nav_slots: {
      services:
        orderedBlocks.some((b) => b.type === 'services' && (b.content?.services || []).length) ||
        Boolean(blocks.find((b) => b.type === 'services')),
      products: products.length > 0,
      courses: courses.length > 0,
      team: team.length > 0,
    },
  }
}

async function loadUpcomingCourses(
  supabase: SupabaseLike,
  tenant: Record<string, any>,
  bookingUrl: string,
): Promise<UpcomingCourseCard[]> {
  try {
    const { data: setting } = await supabase
      .from('tenant_settings')
      .select('setting_value')
      .eq('tenant_id', tenant.id)
      .eq('setting_key', 'courses_enabled')
      .maybeSingle()

    const enabled = (() => {
      const v = setting?.setting_value
      if (v === true || v === 'true') return true
      if (typeof v === 'object' && v && 'enabled' in v) return !!(v as any).enabled
      return false
    })()
    if (!enabled) return []

    const { data: courses } = await supabase
      .from('courses')
      .select('id, title, category, price_per_participant_rappen, max_participants, current_participants')
      .eq('tenant_id', tenant.id)
      .eq('is_public', true)
      .eq('is_active', true)
      .limit(20)

    if (!courses?.length) return []
    const ids = courses.map((c: any) => c.id)
    const byId = Object.fromEntries(courses.map((c: any) => [c.id, c]))
    const now = new Date().toISOString()

    const { data: sessions } = await supabase
      .from('course_sessions')
      .select(
        'id, start_time, end_time, custom_location, course_id, max_participants, current_participants, individual_price_rappen, is_active',
      )
      .in('course_id', ids)
      .eq('is_active', true)
      .gte('start_time', now)
      .order('start_time', { ascending: true })
      .limit(8)

    const base = String(bookingUrl || '')
      .replace(/\/booking\/availability\/[^/?#]+.*$/, '')
      .replace(/\/$/, '')
    const coursesUrl = tenant.slug
      ? `${base}/customer/courses/${encodeURIComponent(tenant.slug)}`
      : null

    return (sessions || []).map((s: any) => {
      const course = byId[s.course_id] || {}
      const maxP =
        s.max_participants != null
          ? Number(s.max_participants)
          : course.max_participants != null
            ? Number(course.max_participants)
            : null
      const curP =
        s.current_participants != null
          ? Number(s.current_participants)
          : course.current_participants != null
            ? Number(course.current_participants)
            : 0
      const spots = maxP != null ? Math.max(0, maxP - curP) : null
      const priceRappen =
        s.individual_price_rappen != null
          ? Number(s.individual_price_rappen)
          : course.price_per_participant_rappen != null
            ? Number(course.price_per_participant_rappen)
            : null
      const href = coursesUrl
        ? `${coursesUrl}${coursesUrl.includes('?') ? '&' : '?'}courseId=${encodeURIComponent(String(s.course_id))}`
        : null
      return {
        id: String(s.id),
        title: course.title || s.title || 'Kurs',
        category: course.category || null,
        starts_at: s.start_time || null,
        ends_at: s.end_time || null,
        location: s.custom_location || null,
        spots_left: spots,
        price_chf: priceRappen != null ? Math.round(priceRappen / 100) : null,
        href,
      } as UpcomingCourseCard
    })
  } catch {
    return []
  }
}

function resolveWebsiteTeam(
  configured: any[] | null,
  liveStaff: LandingTeamMember[],
  tenant?: Record<string, any> | null,
): LandingTeamMember[] {
  const hideName = (name: string) => isPlaceholderStaffName(name, tenant)
  if (!Array.isArray(configured) || !configured.length) {
    return dedupeWebsiteTeam(liveStaff.filter((m) => !hideName(m.name))).slice(0, 12)
  }

  const byId = new Map(liveStaff.map((m) => [String(m.id), m]))
  const hiddenIds = new Set(
    configured
      .filter((m) => m && m.visible === false && !isSeedPlaceholderStaffName(String(m.name || '')))
      .map((m) => String(m.id)),
  )
  const out: LandingTeamMember[] = []

  for (const m of configured) {
    if (!m || hiddenIds.has(String(m.id))) continue
    const live = byId.get(String(m.id))
    const name = String(m.name || live?.name || '').trim()
    if (!name || hideName(name)) continue
    if (live) {
      out.push({
        ...live,
        name,
        role_label: String(m.role_label || live.role_label || 'Team').trim(),
        photo_url: (typeof m.photo_url === 'string' && m.photo_url.trim()) || live.photo_url || null,
      })
      continue
    }
    out.push({
      id: String(m.id || name),
      name,
      role_label: String(m.role_label || 'Team').trim(),
      languages: Array.isArray(m.languages) ? m.languages.map(String) : [],
      categories: Array.isArray(m.categories) ? m.categories.map(String) : [],
      photo_url: typeof m.photo_url === 'string' ? m.photo_url : null,
    })
  }

  for (const live of liveStaff) {
    if (hiddenIds.has(live.id) || hideName(live.name)) continue
    if (out.some((m) => m.id === live.id)) continue
    out.push(live)
  }

  const resolved = dedupeWebsiteTeam(out.filter((m) => !hideName(m.name)))
  if (!resolved.length) {
    return dedupeWebsiteTeam(liveStaff.filter((m) => !hideName(m.name))).slice(0, 12)
  }
  return resolved.slice(0, 12)
}

function urlsLikelySame(a: string, b: string) {
  if (!a || !b) return false
  if (a === b) return true
  try {
    const ua = new URL(a)
    const ub = new URL(b)
    return ua.pathname === ub.pathname || ua.pathname.endsWith(ub.pathname) || ub.pathname.endsWith(ua.pathname)
  } catch {
    return a.split('?')[0] === b.split('?')[0]
  }
}

/** hero → services → products → slots → testimonials → process → team → courses → gallery → faq → cta → contact */
const LANDING_BLOCK_ORDER = [
  'hero',
  'services',
  'products',
  'slots',
  'testimonials',
  'process',
  'team',
  'courses',
  'gallery',
  'pages',
  'faq',
  'cta',
  'contact',
] as const

function reorderLandingBlocks(blocks: any[]) {
  const rank = new Map(LANDING_BLOCK_ORDER.map((t, i) => [t, i]))
  return [...blocks].sort((a, b) => {
    const ra = rank.has(a?.type) ? (rank.get(a.type) as number) : 50
    const rb = rank.has(b?.type) ? (rank.get(b.type) as number) : 50
    return ra - rb
  })
}
