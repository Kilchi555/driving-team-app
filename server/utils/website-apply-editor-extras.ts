import {
  extraProductsToLanding,
  extraServicesToLanding,
  normalizeExtraProducts,
  normalizeExtraServices,
  normalizeTeamMembers,
  normalizeUsps,
  type WizardExtraProduct,
  type WizardExtraService,
  type WizardTeamMember,
} from '~/utils/website-wizard-content'
import type { LandingPagePayload } from '~/utils/website-slot-schema'

export type WebsiteEditorExtras = {
  extraServices?: WizardExtraService[]
  extraProducts?: WizardExtraProduct[]
  teamMembers?: WizardTeamMember[]
  testimonials?: Array<{ id?: string; author?: string; text?: string; rating?: number }>
  contact_channels?: { phone?: boolean; email?: boolean; whatsapp?: boolean; form?: boolean }
  usps?: string[]
}

export function applyWebsiteEditorExtras(
  landing: LandingPagePayload,
  extras: WebsiteEditorExtras,
): LandingPagePayload {
  const next = JSON.parse(JSON.stringify(landing)) as LandingPagePayload
  const blocks = next.blocks

  if (extras.extraServices) {
    const extrasNorm = normalizeExtraServices(extras.extraServices)
    const idx = blocks.findIndex((b) => b.type === 'services')
    if (idx >= 0) {
      const current = Array.isArray(blocks[idx].content.services) ? blocks[idx].content.services : []
      const keep = current.filter((s: any) => !String(s?.id || '').startsWith('extra-'))
      blocks[idx].content.services = [...keep, ...extraServicesToLanding(extrasNorm)]
    }
  }

  if (extras.extraProducts) {
    const extrasNorm = normalizeExtraProducts(extras.extraProducts)
    const custom = extraProductsToLanding(extrasNorm)
    const idx = blocks.findIndex((b) => b.type === 'products')
    const keepDb =
      idx >= 0 && Array.isArray(blocks[idx].content.products)
        ? blocks[idx].content.products.filter((p: any) => p?.source === 'db')
        : []
    const products = [...keepDb, ...custom]
    if (idx >= 0) {
      blocks[idx].content.products = products
    } else if (products.length) {
      const after = blocks.findIndex((b) => b.type === 'services')
      blocks.splice(after >= 0 ? after + 1 : 1, 0, {
        type: 'products',
        content: {
          eyebrow: 'Produkte',
          title: 'Produkte',
          products,
        },
      })
    }
  }

  if (extras.teamMembers) {
    const team = normalizeTeamMembers(extras.teamMembers)
    ;(next.brand as any).website_team = team
    const members = team
      .filter((m) => m.visible)
      .map((m) => ({
        id: m.id,
        name: m.name,
        role_label: m.role_label || 'Team',
        languages: [],
        categories: [],
        photo_url: m.photo_url || null,
      }))
    const idx = blocks.findIndex((b) => b.type === 'team')
    if (idx >= 0) {
      blocks[idx].content.members = members
    } else if (members.length) {
      const after = blocks.findIndex((b) => b.type === 'process')
      blocks.splice(after >= 0 ? after + 1 : blocks.length, 0, {
        type: 'team',
        content: {
          eyebrow: 'Team',
          title: 'Ihr Team vor Ort',
          members,
        },
      })
    }
  }

  if (extras.testimonials) {
    const items = extras.testimonials
      .filter((t) => String(t?.text || '').trim())
      .map((t, i) => ({
        id: String(t.id || `manual-${i}`),
        author: String(t.author || 'Kunde').trim() || 'Kunde',
        text: String(t.text || '').trim(),
        rating: Number(t.rating) || 5,
      }))
      .slice(0, 8)
    const idx = blocks.findIndex((b) => b.type === 'testimonials')
    if (idx >= 0) {
      blocks[idx].content.testimonials = items
    } else if (items.length) {
      const after = blocks.findIndex((b) => b.type === 'services')
      blocks.splice(after >= 0 ? after + 1 : 1, 0, {
        type: 'testimonials',
        content: {
          eyebrow: 'Stimmen',
          title: 'Das sagen Kunden',
          testimonials: items,
        },
      })
    }
  }

  if (extras.contact_channels) {
    const ch = {
      phone: extras.contact_channels.phone !== false,
      email: extras.contact_channels.email !== false,
      whatsapp: extras.contact_channels.whatsapp !== false,
      form: extras.contact_channels.form !== false,
    }
    const idx = blocks.findIndex((b) => b.type === 'contact')
    if (idx >= 0) {
      blocks[idx].content.channels = ch
      blocks[idx].content.form_enabled = ch.form
      if (!ch.phone) blocks[idx].content.phone = null
      if (!ch.email) blocks[idx].content.email = null
      if (!ch.whatsapp) blocks[idx].content.whatsapp_url = null
    }
  }

  if (extras.usps) {
    ;(next.brand as any).usps = normalizeUsps(extras.usps)
  }

  return next
}
