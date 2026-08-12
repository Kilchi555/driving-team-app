/**
 * One-pager slot schema — only CR/SEO-safe fields are editable.
 * Shared by API (merge-save) and admin editor UI.
 */

export const WEBSITE_TEMPLATE_ID = 'onepager@v1'

export type LandingBlock = {
  type:
    | 'hero'
    | 'services'
    | 'team'
    | 'courses'
    | 'slots'
    | 'gallery'
    | 'process'
    | 'testimonials'
    | 'faq'
    | 'cta'
    | 'contact'
  content: Record<string, any>
}

export type LandingPagePayload = {
  seo: {
    title: string
    description: string
    keywords: string
  }
  brand: {
    name: string
    primary: string
    secondary: string
    accent: string
    logo_url: string | null
    hero_image_url: string | null
    hero_video_url?: string | null
    formal_address?: 'sie' | 'du'
    hero_image_source?: 'own' | 'stock' | 'ai' | null
    hero_attribution?: {
      photographer?: string | null
      photographer_url?: string | null
      unsplash_url?: string | null
    } | null
  }
  bookingUrl: string
  siteUrl: string
  blocks: LandingBlock[]
  schema: Record<string, any>
}

export type SlotKind = 'text' | 'textarea' | 'url' | 'image' | 'video' | 'enum' | 'color'

export type SlotGroup =
  | 'brand'
  | 'hero'
  | 'services'
  | 'faq'
  | 'cta'
  | 'contact'
  | 'seo'

export type SlotDef = {
  id: string
  group: SlotGroup
  label: string
  kind: SlotKind
  /** Max string length (text/textarea) */
  maxLength?: number
  enumValues?: readonly string[]
  formalAware?: boolean
  /** Hint shown in editor */
  hint?: string
}

/** Static slots (always present) */
export const STATIC_SLOTS: readonly SlotDef[] = [
  {
    id: 'brand.name',
    group: 'brand',
    label: 'Name / Brand',
    kind: 'text',
    maxLength: 80,
  },
  {
    id: 'brand.formal_address',
    group: 'brand',
    label: 'Anrede',
    kind: 'enum',
    enumValues: ['sie', 'du'] as const,
    formalAware: true,
    hint: 'Sie = formell, Du = locker',
  },
  {
    id: 'brand.logo_url',
    group: 'brand',
    label: 'Logo',
    kind: 'image',
  },
  {
    id: 'brand.hero_image_url',
    group: 'brand',
    label: 'Hero-Bild',
    kind: 'image',
  },
  {
    id: 'brand.hero_video_url',
    group: 'brand',
    label: 'Hero-Video (optional)',
    kind: 'video',
    hint: 'MP4/WebM, max 40 MB, empfohlen ≤720p. Muted Autoplay — Poster = Hero-Bild. URL oder Upload.',
  },
  {
    id: 'brand.primary',
    group: 'brand',
    label: 'Primärfarbe',
    kind: 'color',
  },
  {
    id: 'brand.secondary',
    group: 'brand',
    label: 'Sekundärfarbe',
    kind: 'color',
  },
  {
    id: 'brand.accent',
    group: 'brand',
    label: 'Akzentfarbe',
    kind: 'color',
  },
  {
    id: 'hero.headline',
    group: 'hero',
    label: 'Hero-Überschrift (H1)',
    kind: 'text',
    maxLength: 90,
    formalAware: true,
    hint: 'Lokal & klar — z.B. Fahrschule Zürich — …',
  },
  {
    id: 'hero.subheadline',
    group: 'hero',
    label: 'Hero-Unterzeile (Bio)',
    kind: 'textarea',
    maxLength: 280,
    formalAware: true,
  },
  {
    id: 'hero.trust_0_value',
    group: 'hero',
    label: 'Trust 1 Wert',
    kind: 'text',
    maxLength: 24,
  },
  {
    id: 'hero.trust_0_label',
    group: 'hero',
    label: 'Trust 1 Label',
    kind: 'text',
    maxLength: 40,
  },
  {
    id: 'hero.trust_1_value',
    group: 'hero',
    label: 'Trust 2 Wert',
    kind: 'text',
    maxLength: 24,
  },
  {
    id: 'hero.trust_1_label',
    group: 'hero',
    label: 'Trust 2 Label',
    kind: 'text',
    maxLength: 40,
  },
  {
    id: 'hero.trust_2_value',
    group: 'hero',
    label: 'Trust 3 Wert',
    kind: 'text',
    maxLength: 24,
  },
  {
    id: 'hero.trust_2_label',
    group: 'hero',
    label: 'Trust 3 Label',
    kind: 'text',
    maxLength: 40,
  },
  {
    id: 'cta.headline',
    group: 'cta',
    label: 'CTA Überschrift',
    kind: 'text',
    maxLength: 100,
    formalAware: true,
  },
  {
    id: 'cta.subheadline',
    group: 'cta',
    label: 'CTA Unterzeile',
    kind: 'textarea',
    maxLength: 200,
    formalAware: true,
  },
  {
    id: 'contact.email',
    group: 'contact',
    label: 'E-Mail',
    kind: 'text',
    maxLength: 120,
  },
  {
    id: 'contact.phone',
    group: 'contact',
    label: 'Telefon',
    kind: 'text',
    maxLength: 40,
  },
  {
    id: 'contact.address',
    group: 'contact',
    label: 'Adresse',
    kind: 'text',
    maxLength: 160,
  },
  {
    id: 'contact.city',
    group: 'contact',
    label: 'Ort',
    kind: 'text',
    maxLength: 80,
  },
  {
    id: 'contact.postal_code',
    group: 'contact',
    label: 'PLZ',
    kind: 'text',
    maxLength: 12,
  },
  {
    id: 'seo.title',
    group: 'seo',
    label: 'SEO Titel',
    kind: 'text',
    maxLength: 60,
  },
  {
    id: 'seo.description',
    group: 'seo',
    label: 'SEO Beschreibung',
    kind: 'textarea',
    maxLength: 160,
  },
  {
    id: 'seo.keywords',
    group: 'seo',
    label: 'SEO Keywords',
    kind: 'text',
    maxLength: 200,
  },
] as const

export const SLOT_GROUP_LABELS: Record<SlotGroup, string> = {
  brand: 'Brand',
  hero: 'Hero',
  services: 'Angebot',
  faq: 'FAQ',
  cta: 'Abschluss-CTA',
  contact: 'Kontakt',
  seo: 'SEO',
}

export function isLandingPayload(value: unknown): value is LandingPagePayload {
  if (!value || typeof value !== 'object') return false
  const v = value as any
  return Array.isArray(v.blocks) && !!v.seo && !!v.brand
}

export function findBlock(payload: LandingPagePayload, type: LandingBlock['type']): LandingBlock | undefined {
  return payload.blocks.find((b) => b.type === type)
}

export function findBlockIndex(payload: LandingPagePayload, type: LandingBlock['type']): number {
  return payload.blocks.findIndex((b) => b.type === type)
}

/** Dynamic slots derived from current payload (services + FAQ) */
export function getDynamicSlots(payload: LandingPagePayload): SlotDef[] {
  const slots: SlotDef[] = []
  const servicesBlock = findBlock(payload, 'services')
  const services = (servicesBlock?.content?.services || []) as Array<{ id?: string; name?: string }>
  services.forEach((svc, i) => {
    const key = svc.id || String(i)
    slots.push({
      id: `service.${key}.description`,
      group: 'services',
      label: `Beschreibung: ${svc.name || `Service ${i + 1}`}`,
      kind: 'textarea',
      maxLength: 400,
      formalAware: true,
    })
  })

  const faqBlock = findBlock(payload, 'faq')
  const items = (faqBlock?.content?.items || []) as Array<{ q?: string }>
  items.forEach((_, i) => {
    slots.push({
      id: `faq.${i}.q`,
      group: 'faq',
      label: `Frage ${i + 1}`,
      kind: 'text',
      maxLength: 160,
    })
    slots.push({
      id: `faq.${i}.a`,
      group: 'faq',
      label: `Antwort ${i + 1}`,
      kind: 'textarea',
      maxLength: 500,
      formalAware: true,
    })
  })

  return slots
}

export function getAllSlots(payload: LandingPagePayload): SlotDef[] {
  return [...STATIC_SLOTS, ...getDynamicSlots(payload)]
}

export function getSlotById(payload: LandingPagePayload, id: string): SlotDef | undefined {
  return getAllSlots(payload).find((s) => s.id === id)
}

function deepClone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v))
}

export function getSlotValue(payload: LandingPagePayload, slotId: string): string | null {
  if (slotId.startsWith('brand.')) {
    const key = slotId.slice('brand.'.length) as keyof LandingPagePayload['brand']
    const v = payload.brand?.[key]
    if (key === 'formal_address') return (v as string) || 'sie'
    return v == null ? null : String(v)
  }
  if (slotId.startsWith('seo.')) {
    const key = slotId.slice('seo.'.length) as keyof LandingPagePayload['seo']
    const v = payload.seo?.[key]
    return v == null ? null : String(v)
  }
  if (slotId === 'hero.subheadline') {
    return findBlock(payload, 'hero')?.content?.subheadline ?? null
  }
  if (slotId === 'hero.headline') {
    return findBlock(payload, 'hero')?.content?.headline ?? null
  }
  const trustMatch = slotId.match(/^hero\.trust_(\d+)_(value|label)$/)
  if (trustMatch) {
    const idx = Number(trustMatch[1])
    const field = trustMatch[2]
    const trust = findBlock(payload, 'hero')?.content?.trust || []
    return trust[idx]?.[field] ?? null
  }
  if (slotId === 'cta.headline') {
    return findBlock(payload, 'cta')?.content?.headline ?? null
  }
  if (slotId === 'cta.subheadline') {
    return findBlock(payload, 'cta')?.content?.subheadline ?? null
  }
  if (slotId.startsWith('contact.')) {
    const key = slotId.slice('contact.'.length)
    return findBlock(payload, 'contact')?.content?.[key] ?? null
  }
  const serviceMatch = slotId.match(/^service\.(.+)\.description$/)
  if (serviceMatch) {
    const services = findBlock(payload, 'services')?.content?.services || []
    const svc = services.find((s: any, i: number) => String(s.id || i) === serviceMatch[1])
    return svc?.description ?? null
  }
  const faqMatch = slotId.match(/^faq\.(\d+)\.(q|a)$/)
  if (faqMatch) {
    const idx = Number(faqMatch[1])
    const field = faqMatch[2]
    const items = findBlock(payload, 'faq')?.content?.items || []
    return items[idx]?.[field] ?? null
  }
  return null
}

export function getSlotValues(payload: LandingPagePayload): Record<string, string | null> {
  const out: Record<string, string | null> = {}
  for (const slot of getAllSlots(payload)) {
    out[slot.id] = getSlotValue(payload, slot.id)
  }
  return out
}

function normalizeColor(raw: string): string | null {
  const v = raw.trim()
  if (/^#[0-9a-fA-F]{6}$/.test(v)) return v.toUpperCase()
  if (/^#[0-9a-fA-F]{3}$/.test(v)) {
    const r = v[1],
      g = v[2],
      b = v[3]
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase()
  }
  return null
}

function validateSlotValue(slot: SlotDef, raw: unknown): string {
  if (raw == null) {
    throw createSlotError(slot.id, 'Wert fehlt')
  }
  const str = String(raw).trim()

  if (slot.kind === 'enum') {
    if (!slot.enumValues?.includes(str)) {
      throw createSlotError(slot.id, `Erlaubt: ${(slot.enumValues || []).join(', ')}`)
    }
    return str
  }

  if (slot.kind === 'color') {
    const color = normalizeColor(str)
    if (!color) throw createSlotError(slot.id, 'Farbe muss #RGB oder #RRGGBB sein')
    return color
  }

  if (slot.kind === 'image' || slot.kind === 'url' || slot.kind === 'video') {
    if (!str) return ''
    if (!/^https?:\/\//i.test(str) && !str.startsWith('/')) {
      throw createSlotError(slot.id, 'URL ungültig')
    }
    return str
  }

  if (slot.maxLength && str.length > slot.maxLength) {
    throw createSlotError(slot.id, `Max. ${slot.maxLength} Zeichen`)
  }

  return str
}

function createSlotError(slotId: string, message: string): Error & { statusCode: number; slotId: string } {
  const err = new Error(`${slotId}: ${message}`) as Error & { statusCode: number; slotId: string }
  err.statusCode = 400
  err.slotId = slotId
  return err
}

/**
 * Apply a slot patch. Only known slot IDs are accepted.
 * Returns a new payload (does not mutate input).
 */
export function applySlotPatch(
  payload: LandingPagePayload,
  patch: Record<string, unknown>,
): { payload: LandingPagePayload; applied: string[] } {
  if (!isLandingPayload(payload)) {
    throw createSlotError('_payload', 'Ungültige Landing-Payload')
  }

  const next = deepClone(payload)
  const applied: string[] = []
  const allowed = new Set(getAllSlots(next).map((s) => s.id))

  for (const [slotId, raw] of Object.entries(patch || {})) {
    if (!allowed.has(slotId)) {
      throw createSlotError(slotId, 'Slot nicht erlaubt / locked')
    }
    const def = getSlotById(next, slotId)!
    const value = validateSlotValue(def, raw)

    if (slotId.startsWith('brand.')) {
      const key = slotId.slice('brand.'.length)
      ;(next.brand as any)[key] = value || null
      // Keep hero brand signal + contact name in sync when brand name changes
      if (key === 'name' && value) {
        const hero = findBlock(next, 'hero')
        if (hero) hero.content.brand = value
        const contact = findBlock(next, 'contact')
        if (contact) contact.content.name = value
      }
      if (key === 'hero_image_url') {
        const hero = findBlock(next, 'hero')
        if (hero) hero.content.image_url = value || null
      }
      if (key === 'hero_video_url') {
        const hero = findBlock(next, 'hero')
        if (hero) hero.content.video_url = value || null
      }
      if (key === 'logo_url') {
        // logo lives on brand; nav uses it
      }
    } else if (slotId.startsWith('seo.')) {
      const key = slotId.slice('seo.'.length)
      ;(next.seo as any)[key] = value
    } else if (slotId === 'hero.subheadline') {
      const hero = findBlock(next, 'hero')
      if (hero) hero.content.subheadline = value
    } else if (slotId === 'hero.headline') {
      const hero = findBlock(next, 'hero')
      if (hero) hero.content.headline = value
    } else if (slotId.match(/^hero\.trust_(\d+)_(value|label)$/)) {
      const m = slotId.match(/^hero\.trust_(\d+)_(value|label)$/)!
      const idx = Number(m[1])
      const field = m[2]
      const hero = findBlock(next, 'hero')
      if (hero) {
        if (!Array.isArray(hero.content.trust)) hero.content.trust = []
        while (hero.content.trust.length <= idx) {
          hero.content.trust.push({ value: '', label: '', icon: 'shield' })
        }
        hero.content.trust[idx][field] = value
      }
    } else if (slotId === 'cta.headline') {
      const cta = findBlock(next, 'cta')
      if (cta) cta.content.headline = value
    } else if (slotId === 'cta.subheadline') {
      const cta = findBlock(next, 'cta')
      if (cta) cta.content.subheadline = value
    } else if (slotId.startsWith('contact.')) {
      const key = slotId.slice('contact.'.length)
      const contact = findBlock(next, 'contact')
      if (contact) contact.content[key] = value || null
    } else {
      const serviceMatch = slotId.match(/^service\.(.+)\.description$/)
      if (serviceMatch) {
        const servicesBlock = findBlock(next, 'services')
        const services = servicesBlock?.content?.services || []
        const svc = services.find((s: any, i: number) => String(s.id || i) === serviceMatch[1])
        if (svc) svc.description = value
      }
      const faqMatch = slotId.match(/^faq\.(\d+)\.(q|a)$/)
      if (faqMatch) {
        const idx = Number(faqMatch[1])
        const field = faqMatch[2]
        const faq = findBlock(next, 'faq')
        const items = faq?.content?.items || []
        if (items[idx]) items[idx][field] = value
      }
    }

    applied.push(slotId)
  }

  // Sync brand signal on hero if present
  const hero = findBlock(next, 'hero')
  if (hero && next.brand?.name) {
    hero.content.brand = next.brand.name
  }

  return { payload: next, applied }
}

export function groupSlots(slots: SlotDef[]): { group: SlotGroup; label: string; slots: SlotDef[] }[] {
  const order: SlotGroup[] = ['brand', 'hero', 'services', 'faq', 'cta', 'contact', 'seo']
  return order
    .map((group) => ({
      group,
      label: SLOT_GROUP_LABELS[group],
      slots: slots.filter((s) => s.group === group),
    }))
    .filter((g) => g.slots.length > 0)
}
