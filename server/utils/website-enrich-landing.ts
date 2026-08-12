/**
 * Enrich baked landing payload with live premium data (team, courses, hours freshness).
 */
import type { LandingPagePayload } from '~/server/utils/website-landing-builder'
import { buildConfirmationProcessStep } from '~/server/utils/website-confirmation-copy'
import { getTerminologyDefaults } from '~/composables/useTerminology'
import { buildLocalFaqs, extractCityFromAddress } from '~/server/utils/website-local-seo'
import {
  formatOpeningHours,
  mapStaffToTeam,
  mapsEmbedUrl,
  mapsExternalUrl,
  openingHoursToSchema,
  resolveWorkingTemplate,
  whatsappUrlFromPhone,
  type UpcomingCourseCard,
} from '~/server/utils/website-premium'
import {
  buildReserveActionSchema,
  buildSlotEventSchema,
  loadWebsiteTeaserSlots,
} from '~/server/utils/website-next-slots'

type SupabaseLike = {
  from: (table: string) => any
}

export async function enrichLandingPremium(
  supabase: SupabaseLike,
  tenant: Record<string, any> | null,
  landing: LandingPagePayload | null,
  opts?: { siteUrl?: string; subdomain?: string },
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
  opts?: { siteUrl?: string; subdomain?: string },
): Promise<LandingPagePayload> {
  const blocks = landing.blocks.map((b) => ({
    type: b.type,
    content: { ...(b.content || {}) },
  })) as LandingPagePayload['blocks']

  // --- Services deep-book ---
  const servicesIdx = blocks.findIndex((b) => b.type === 'services')
  if (servicesIdx >= 0 && Array.isArray(blocks[servicesIdx].content.services)) {
    const bookingUrl = landing.bookingUrl
    blocks[servicesIdx].content.services = blocks[servicesIdx].content.services.map((s: any) => {
      if (s.book_url) return s
      const cat = s.category || s.name
      if (!cat || !bookingUrl) return s
      const sep = bookingUrl.includes('?') ? '&' : '?'
      return { ...s, book_url: `${bookingUrl}${sep}category=${encodeURIComponent(String(cat))}` }
    })
  }
  let staffRows: any[] = []
  try {
    const res = await supabase
      .from('users')
      .select('id, first_name, last_name, role, language, category, metadata, is_active')
      .eq('tenant_id', tenant.id)
      .eq('is_active', true)
      .in('role', ['staff', 'admin'])
      .order('role', { ascending: true })
      .limit(12)
    staffRows = res.data || []
  } catch {
    staffRows = []
  }

  const team = mapStaffToTeam(staffRows)
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
    blocks[teamIdx].content.members = team
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

  // --- Courses ---
  const courses = await loadUpcomingCourses(supabase, tenant, landing.bookingUrl)
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
  try {
    slots = await loadWebsiteTeaserSlots(supabase, {
      tenantId: tenant.id,
      bookingUrl: landing.bookingUrl,
      leadTimeHours: tenant.minimum_booking_lead_time_hours,
    })
  } catch {
    slots = []
  }
  let slotsIdx = blocks.findIndex((b) => b.type === 'slots')
  if (slotsIdx < 0 && slots.length) {
    const afterServices = blocks.findIndex((b) => b.type === 'services')
    const insertAt = afterServices >= 0 ? afterServices + 1 : 1
    blocks.splice(insertAt, 0, {
      type: 'slots',
      content: {
        eyebrow: 'Termine',
        title: 'Nächste freie Fahrstunden',
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
    const city = c.city || tenant.city || null
    const hoursTpl = resolveWorkingTemplate(tenant)
    const addrParts = [c.address || tenant.address, c.postal_code || tenant.postal_code, city]
    const siteUrl = (opts?.siteUrl || landing.siteUrl || '').replace(/\/$/, '')
    const sub = opts?.subdomain
    const impressumPath = sub ? `/s/${sub}/impressum` : `${siteUrl}/impressum`
    const datenschutzPath = sub ? `/s/${sub}/datenschutz` : `${siteUrl}/datenschutz`

    c.phone = channels.phone ? phone : null
    c.email = channels.email ? email : null
    c.whatsapp_url = channels.whatsapp ? whatsappUrlFromPhone(phone) : null
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
  }

  // --- Hero / CTA WhatsApp ---
  const contactChannels = blocks.find((b) => b.type === 'contact')?.content?.channels
  const waAllowed = contactChannels?.whatsapp !== false
  const wa = waAllowed ? whatsappUrlFromPhone(tenant.contact_phone || tenant.phone) : null
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
          { n: 1, title: 'Online buchen', text: 'Termin und Kategorie in wenigen Klicks wählen.' },
          { n: 2, title: confirm.title, text: confirm.text },
          { n: 3, title: 'Losfahren', text: `${tenant.name || 'Wir'} begleiten Sie Schritt für Schritt.` },
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
  const faqCity =
    String(tenant.city || '').trim() ||
    extractCityFromAddress(tenant.address) ||
    null
  const faqTerms = getTerminologyDefaults(tenant.business_type)
  const faqs = buildLocalFaqs(
    faqTerms,
    tenant.name || landing.brand?.name || 'Wir',
    formalFaq,
    tenant.business_type,
    faqCity,
  )
  let faqBlockIdx = blocks.findIndex((b) => b.type === 'faq')
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
        tenant.postal_code,
        tenant.city,
        tenant.invoice_city,
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
      biz.potentialAction = buildReserveActionSchema(landing.bookingUrl, 'Jetzt buchen')
      graph[bizIdx] = biz
    }

    graph = graph.filter((n: any) => {
      const id = String(n?.['@id'] || '')
      return !id.includes('#course-') && !id.includes('#slot-')
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

    graph.push(
      ...buildSlotEventSchema(slots, {
        siteUrl,
        businessName: tenant.name || landing.brand?.name || 'Angebot',
        max: 5,
      }),
    )

    const webIdx = graph.findIndex((n: any) => n?.['@type'] === 'WebSite')
    if (webIdx >= 0) {
      graph[webIdx] = {
        ...graph[webIdx],
        potentialAction: buildReserveActionSchema(landing.bookingUrl, 'Jetzt buchen'),
      }
    }

    schema['@graph'] = graph
  }

  const brand = {
    ...landing.brand,
    hide_powered_by: landing.brand?.hide_powered_by !== false,
    template: landing.brand?.template || 'classic',
  }

  // Conversion order for existing published landings (without republish)
  const orderedBlocks = reorderLandingBlocks(blocks)

  return {
    ...landing,
    brand,
    blocks: orderedBlocks,
    schema: schema || landing.schema,
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

/** hero → services → slots → testimonials → process → team → courses → gallery → faq → cta → contact */
const LANDING_BLOCK_ORDER = [
  'hero',
  'services',
  'slots',
  'testimonials',
  'process',
  'team',
  'courses',
  'gallery',
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
