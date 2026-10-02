/**
 * Manual sales workspace classification.
 * Reads already stored prospect facts. Does not send, write, or treat consent as granted.
 */

export const SALES_STATUSES = [
  'new',
  'review_required',
  'contact_1',
  'contacted',
  'conversation',
  'demo_booked',
  'demo_completed',
  'proposal',
  'won',
  'lost',
  'nurture',
  'do_not_contact',
  'excluded_existing_tenant',
] as const

export const CONTACT_CHANNELS = ['phone', 'email', 'sms', 'whatsapp', 'other'] as const
export const CONTACT_RESULTS = [
  'no_answer',
  'callback_requested',
  'conversation',
  'interested',
  'not_interested',
  'wrong_contact',
  'existing_customer',
  'do_not_contact',
  'demo_requested',
  'demo_booked',
] as const
export const NEXT_ACTIONS = ['call', 'email', 'demo', 'proposal', 'nurture', 'none'] as const

export type SalesStatus = (typeof SALES_STATUSES)[number]
export type ContactChannel = (typeof CONTACT_CHANNELS)[number]
export type ContactResult = (typeof CONTACT_RESULTS)[number]
export type NextAction = (typeof NEXT_ACTIONS)[number]
export type EngagementLevel = 'HOT' | 'WARM' | 'COLD' | 'UNKNOWN'
export type BusinessPotential = 'HIGH_EVIDENCE' | 'MEDIUM_EVIDENCE' | 'LOW_EVIDENCE' | 'AMBIGUOUS'
export type EvidenceConfidence = 'HIGH' | 'MEDIUM' | 'LOW' | 'AMBIGUOUS'
export type Priority = 'P1' | 'P2' | 'P3' | 'P4'
export type Contactability =
  | 'REVIEW_REQUIRED'
  | 'OPT_OUT'
  | 'EXISTING_TENANT'
  | 'POSSIBLE_EXISTING_TENANT'

export interface SalesLeadInput {
  id: string
  name: string | null
  first_name: string | null
  phone: string | null
  email: string | null
  website: string | null
  city: string | null
  postal_code: string | null
  address: string | null
  notes: string | null
  created_at?: string | null
}

export interface SalesTenantInput {
  id: string
  name: string | null
  contact_email: string | null
  from_email: string | null
  contact_phone: string | null
  website_url: string | null
  domain: string | null
  website_domain: string | null
}

export interface SalesStaffInput {
  email: string | null
  phone: string | null
  role: string | null
}

export interface SalesConsentInput {
  email: string | null
  status: string | null
}

export interface SalesMailSignal {
  sent: boolean
  opened: boolean
  clicked: boolean
}

export interface SalesAugustInput {
  mails: Record<1 | 2 | 3 | 4, SalesMailSignal>
  sms_note: boolean
}

export interface SalesProspect {
  prospect_id: string
  name: string
  person: string | null
  phone: string | null
  email: string | null
  website: string | null
  website_host: string | null
  city: string | null
  postal_code: string | null
  address: string | null
  organization_domain: string | null
  priority: Priority | null
  engagement_level: EngagementLevel
  business_potential: BusinessPotential
  size_evidence_confidence: EvidenceConfidence
  business_score: number
  contactability: Contactability
  contactability_label: string
  consent_status: string
  existing_tenant_match: boolean
  possible_existing_tenant: boolean
  opt_out: boolean
  matched_tenant_name: string | null
  duplicate_group_size: number
  strong_people: number
  why: string[]
  august: {
    sent: number
    opened: boolean
    clicked: boolean
    mails: Record<1 | 2 | 3 | 4, SalesMailSignal>
    sms_note: boolean
    historical: true
  }
  eligible: boolean
  contact_completeness: number
  source_ids: string[]
  additional_phones: string[]
  additional_emails: string[]
  additional_addresses: string[]
}

const FREEMAIL = new Set([
  'gmail.com', 'googlemail.com', 'icloud.com', 'me.com', 'mac.com',
  'outlook.com', 'hotmail.com', 'hotmail.ch', 'live.com', 'msn.com',
  'proton.me', 'protonmail.com', 'pm.me', 'bluewin.ch', 'gmx.ch', 'gmx.net',
  'gmx.com', 'gmx.de', 'posteo.ch', 'posteo.de', 'aol.com', 'yahoo.com',
  'yahoo.de', 'jimdo.com', 'wix.com', 'wordpress.com', 'facebook.com',
  'instagram.com', 'simy.ch', 'hispeed.ch', 'sunrise.ch', 'web.de',
])

const DOMAIN_STOP = new Set(['fahrschule', 'fahrschulen', 'fahrlehrer', 'driving', 'motorrad'])
const TOKEN_STOP = new Set([
  ...DOMAIN_STOP, 'gmbh', 'ag', 'und', 'der', 'die', 'das', 'the', 'and',
])
const STAFF_ROLES = new Set(['staff', 'admin', 'super_admin', 'tenant_admin'])
const EMPTY_MAIL: SalesMailSignal = { sent: false, opened: false, clicked: false }

export function emptyAugust(): SalesAugustInput {
  return {
    mails: { 1: { ...EMPTY_MAIL }, 2: { ...EMPTY_MAIL }, 3: { ...EMPTY_MAIL }, 4: { ...EMPTY_MAIL } },
    sms_note: false,
  }
}

function normalizeEmail(value: string | null | undefined): string {
  return (value || '').trim().toLowerCase()
}

function emailDomain(email: string): string {
  const at = email.lastIndexOf('@')
  return at >= 0 ? email.slice(at + 1) : ''
}

export function hostOf(value: string | null | undefined): string {
  return (value || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0]
    .split('?')[0]
    .replace(/\.$/, '')
}

export function normalizePhone(value: string | null | undefined): string | null {
  let digits = (value || '').replace(/\D/g, '')
  if (!digits) return null
  if (digits.startsWith('0041')) digits = digits.slice(4)
  if (digits.startsWith('41') && digits.length >= 11) digits = digits.slice(2)
  if (digits.startsWith('0')) digits = digits.slice(1)
  if (digits.length < 9) return null
  if (digits === '440000000' || digits === '791234567') return null
  return digits
}

export function foldText(value: string | null | undefined): string {
  return (value || '')
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[éèê]/g, 'e')
    .replace(/[àáâ]/g, 'a')
}

export function displayPerson(firstName: string | null | undefined): string | null {
  const raw = (firstName || '').trim()
  if (raw.length < 2) return null
  if (/liebe|kolleg|fahrlehrer|^hallo$/i.test(raw)) return null
  return raw
}

function isFreemail(host: string): boolean {
  return !host || FREEMAIL.has(host) || host.endsWith('.simy.ch')
}

function nameTokens(value: string): string[] {
  return foldText(value).split(/[^a-z0-9]+/).filter((token) => token.length >= 5)
}

function domainLabels(host: string): string[] {
  return host.split('.')[0].split(/[^a-z0-9]+/).filter((token) => token.length > 0)
}

export function organizationDomain(lead: SalesLeadInput): string | null {
  const website = hostOf(lead.website)
  const mail = emailDomain(normalizeEmail(lead.email))
  const tokens = nameTokens(`${lead.name || ''} ${lead.city || ''}`)
  const plausible = (host: string) => {
    if (isFreemail(host)) return false
    if (/(fahr|drive|auto|moto)/.test(host)) return true
    const labels = domainLabels(host)
    return tokens.some((token) => labels.includes(token))
  }
  if (plausible(website)) return website
  if (plausible(mail)) return mail
  return null
}

function domainStems(host: string): string[] {
  const base = host.replace(/\.(ch|com|org|net|swiss|rocks)$/i, '')
  return base
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 6 && !DOMAIN_STOP.has(token))
}

function isStrong(lead: SalesLeadInput, org: string | null): boolean {
  if (!org) return false
  const hay = `${foldText(lead.name)} ${foldText(lead.city)}`
  return domainStems(org).some((stem) => hay.includes(stem))
}

function personText(name: string): string {
  const match = name.match(/\(([^)]*)\)/)
  if (match && /fahrschule/i.test(match[1])) return name.replace(/\([^)]*\)/g, ' ')
  if (match) return match[1]
  return name
}

function signatureTokens(text: string): string[] {
  return [...new Set(
    foldText(text)
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length >= 4 && !TOKEN_STOP.has(token)),
  )]
}

function personParts(name: string): string[][] {
  return personText(name)
    .split(/\s*(?:\/|&| und )\s*/i)
    .map(signatureTokens)
    .filter((tokens) => tokens.length > 0)
}

function sharePerson(left: string[], right: string[]): boolean {
  const a = left.join(' ')
  const b = right.join(' ')
  if (a === b) return true
  if (a.length >= 6 && b.length >= 6 && (a.includes(b) || b.includes(a))) return true
  return left.some((token) => token.length >= 6 && right.includes(token))
}

function orgIdentityTokens(org: string): string[] {
  return [...new Set([
    ...domainStems(org),
    ...domainLabels(org).filter((token) => token.length >= 4 && !TOKEN_STOP.has(token)),
  ])]
}

function isBrandOnly(tokens: string[], org: string): boolean {
  if (tokens.length === 0) return true
  const identity = orgIdentityTokens(org)
  return tokens.every((token) => identity.some((stem) => stem === token || stem.includes(token) || token.includes(stem)))
}

function looksLikeBusiness(text: string): boolean {
  return /fahrschule|fahrlehrer|driving|drive|auto|moto|ecole|schule/i.test(text)
    || /[a-z0-9.-]+\.(?:ch|com|net|org)/i.test(text)
}

function businessBrandTokens(name: string): string[] {
  const tokens: string[] = []
  const parens = [...name.matchAll(/\(([^)]*)\)/g)].map((match) => match[1])
  const outside = name.replace(/\([^)]*\)/g, ' ')
  for (const text of [...parens, outside]) {
    if (!looksLikeBusiness(text)) continue
    tokens.push(...signatureTokens(text))
  }
  return [...new Set(tokens)]
}

function foreignBrandTokens(tokens: string[], org: string | null): string[] {
  const stems = org ? domainStems(org) : []
  return tokens.filter((token) => !stems.some((stem) => stem === token || stem.includes(token) || (token.length >= 4 && token.includes(stem))))
}

function schoolStems(org: string | null): string[] {
  if (!org) return []
  const generic = new Set(['drive', 'schule', 'ecole'])
  return [...new Set([
    ...domainStems(org),
    ...domainLabels(org).filter((token) => token.length >= 5 && !DOMAIN_STOP.has(token) && !generic.has(token)),
  ])]
}

function mailboxKey(email: string): string {
  const normalized = normalizeEmail(email)
  const at = normalized.lastIndexOf('@')
  if (at < 0) return normalized
  return `${normalized.slice(0, at).split('+')[0]}@${normalized.slice(at + 1)}`
}

function sameEngagementIdentity(canonical: SalesLeadInput, member: SalesLeadInput, org: string | null): boolean {
  const canonMail = mailboxKey(canonical.email || '')
  const memberMail = mailboxKey(member.email || '')
  if (canonMail.length > 1 && canonMail === memberMail) return true
  const canonPeople = personParts(canonical.name || '')
  const memberPeople = personParts(member.name || '')
  if (canonPeople.some((left) => memberPeople.some((right) => sharePerson(left, right)))) return true
  const canonForeign = foreignBrandTokens(businessBrandTokens(canonical.name || ''), org)
  const memberForeign = foreignBrandTokens(businessBrandTokens(member.name || ''), org)
  if (canonForeign.length > 0 && memberForeign.length > 0 && canonForeign.some((token) => memberForeign.includes(token))) return true
  const stems = schoolStems(org)
  return canonForeign.length === 0 && memberForeign.length === 0 && stems.length > 0
}

interface PersonPart {
  tokens: string[]
  email: string
  explicit: boolean
}

function countPeople(rows: SalesLeadInput[], org: string): { people: number; cities: number; weakNamed: boolean } {
  const strong = rows.filter((row) => isStrong(row, org))
  const parts: PersonPart[] = []
  for (const row of strong) {
    const email = normalizeEmail(row.email)
    const extracted = personParts(row.name || '').filter((tokens) => !isBrandOnly(tokens, org))
    if (extracted.length >= 2) {
      for (const tokens of extracted) parts.push({ tokens, email, explicit: true })
    } else if (extracted.length === 1) {
      parts.push({ tokens: extracted[0], email, explicit: false })
    }
  }
  const parent = parts.map((_, index) => index)
  const find = (index: number): number => {
    let cursor = index
    while (parent[cursor] !== cursor) cursor = parent[cursor]
    let again = index
    while (parent[again] !== cursor) {
      const next = parent[again]
      parent[again] = cursor
      again = next
    }
    return cursor
  }
  for (let i = 0; i < parts.length; i += 1) {
    for (let j = i + 1; j < parts.length; j += 1) {
      const sameMailbox = !!parts[i].email && parts[i].email === parts[j].email
      const explicitPair = parts[i].explicit && parts[j].explicit
      if (sharePerson(parts[i].tokens, parts[j].tokens) || (sameMailbox && !explicitPair)) parent[find(i)] = find(j)
    }
  }
  const roots = new Set(parts.map((_, index) => find(index)))
  const strongParts = strong.flatMap((row) => personParts(row.name || ''))
  const cities = new Set(
    strong
      .map((row) => foldText(row.city).trim())
      .filter((city) => city.length >= 3 && city !== 'st'),
  )
  const weakNamed = rows.some((row) => {
    if (isStrong(row, org) || !/fahrschule/i.test(row.name || '')) return false
    const weakParts = personParts(row.name || '')
    if (weakParts.length === 0) return true
    return !weakParts.every((part) => strongParts.some((other) => sharePerson(part, other)))
  })
  return { people: roots.size, cities: cities.size, weakNamed }
}

function canonicalAligns(canonical: SalesLeadInput, rows: SalesLeadInput[], org: string): boolean {
  const mine = personParts(canonical.name || '')
  const email = normalizeEmail(canonical.email)
  return rows.some((row) => {
    if (row.id === canonical.id || !isStrong(row, org)) return false
    const parts = personParts(row.name || '')
    if (mine.some((left) => parts.some((right) => sharePerson(left, right)))) return true
    if (!email || normalizeEmail(row.email) !== email) return false
    return parts.some((tokens) => !isBrandOnly(tokens, org))
  })
}

function multiNamed(name: string): boolean {
  return /\([^)]*(?:\/| und |& )[^)]*\)/i.test(name)
}

function contactScore(lead: SalesLeadInput): number {
  return [lead.email, lead.phone, lead.city, lead.address, lead.website].filter((value) => (value || '').trim()).length
}

class UnionFind {
  private parent = new Map<string, string>()

  add(id: string) {
    if (!this.parent.has(id)) this.parent.set(id, id)
  }

  find(id: string): string {
    let cursor = id
    while (this.parent.get(cursor) !== cursor) cursor = this.parent.get(cursor) || cursor
    let again = id
    while (again !== cursor) {
      const next = this.parent.get(again) || cursor
      this.parent.set(again, cursor)
      again = next
    }
    return cursor
  }

  union(a: string, b: string) {
    const left = this.find(a)
    const right = this.find(b)
    if (left !== right) this.parent.set(right, left)
  }
}

function tenantHost(tenant: SalesTenantInput): string | null {
  const website = hostOf(tenant.website_url)
  const explicit = hostOf(tenant.website_domain)
  const domain = hostOf(tenant.domain)
  if (website && !isFreemail(website)) return website
  if (explicit && !isFreemail(explicit)) return explicit
  if (domain && !domain.includes('/') && !isFreemail(domain)) return domain
  return null
}

interface TenantIndex {
  emails: Map<string, string>
  phones: Map<string, string>
  hosts: Map<string, string>
  labels: { label: string; name: string }[]
}

function buildTenantIndex(tenants: SalesTenantInput[], staff: SalesStaffInput[]): TenantIndex {
  const emails = new Map<string, string>()
  const phones = new Map<string, string>()
  const hosts = new Map<string, string>()
  const labels: { label: string; name: string }[] = []
  const remember = (host: string, name: string) => {
    if (!host || isFreemail(host) || host.includes('/')) return
    if (!hosts.has(host)) hosts.set(host, name)
    const label = host.replace(/\.(ch|com|org|net|swiss|rocks)$/i, '')
    if (label.length >= 8) labels.push({ label, name })
  }

  for (const tenant of tenants) {
    const name = tenant.name || 'Bestehender Tenant'
    const contact = normalizeEmail(tenant.contact_email)
    const from = normalizeEmail(tenant.from_email)
    const contactDomain = emailDomain(contact)
    const ownHost = tenantHost(tenant)
    if (contact) emails.set(contact, name)
    if (from) emails.set(from, name)
    const phone = normalizePhone(tenant.contact_phone)
    if (phone) phones.set(phone, name)
    if (ownHost) remember(ownHost, name)
    if (contactDomain && !isFreemail(contactDomain)) remember(contactDomain, name)
    const fromDomain = emailDomain(from)
    if (fromDomain && !isFreemail(fromDomain) && (fromDomain === ownHost || fromDomain === contactDomain)) {
      remember(fromDomain, name)
    }
  }

  for (const person of staff) {
    if (!STAFF_ROLES.has(person.role || '')) continue
    const email = normalizeEmail(person.email)
    if (email) emails.set(email, emails.get(email) || 'Simy-Benutzer')
    const phone = normalizePhone(person.phone)
    if (phone) phones.set(phone, phones.get(phone) || 'Simy-Benutzer')
  }

  return { emails, phones, hosts, labels }
}

function matchLead(lead: SalesLeadInput, index: TenantIndex, org: string | null): { high: string | null; possible: string | null } {
  const email = normalizeEmail(lead.email)
  if (email && index.emails.has(email)) return { high: index.emails.get(email) || 'Bestehender Tenant', possible: null }
  const phone = normalizePhone(lead.phone)
  if (phone && index.phones.has(phone)) return { high: index.phones.get(phone) || 'Bestehender Tenant', possible: null }
  const website = hostOf(lead.website)
  if (website && index.hosts.has(website)) return { high: index.hosts.get(website) || 'Bestehender Tenant', possible: null }
  const mailDomain = emailDomain(email)
  if (mailDomain && index.hosts.has(mailDomain)) return { high: index.hosts.get(mailDomain) || 'Bestehender Tenant', possible: null }
  if (org) {
    const label = org.replace(/\.(ch|com|org|net|swiss|rocks)$/i, '')
    const near = index.labels.find((item) => shortBrandPrefix(item.label, label))
    if (near) return { high: null, possible: near.name }
  }
  return { high: null, possible: null }
}

function shortBrandPrefix(left: string, right: string): boolean {
  if (!left || !right || left === right || left.length < 8 || right.length < 8) return false
  if (left.includes('-') || right.includes('-')) return false
  const shorter = left.length <= right.length ? left : right
  const longer = left.length <= right.length ? right : left
  const extra = longer.length - shorter.length
  if (extra < 2 || extra > 3 || !longer.endsWith(shorter)) return false
  return /^[a-z]{2,3}$/.test(longer.slice(0, extra))
}

function groupAugust(
  group: Array<{ lead: SalesLeadInput; email: string; org: string | null }>,
  augustByEmail: Map<string, SalesAugustInput>,
  canonical: { lead: SalesLeadInput; org: string | null },
): SalesAugustInput {
  const merged = emptyAugust()
  for (const row of group) {
    if (row.lead.id !== canonical.lead.id && !sameEngagementIdentity(canonical.lead, row.lead, canonical.org || row.org)) continue
    const august = row.email ? augustByEmail.get(row.email) : undefined
    if (!august) continue
    for (const mail of [1, 2, 3, 4] as const) {
      const prev = merged.mails[mail]
      const next = august.mails[mail]
      merged.mails[mail] = {
        sent: prev.sent || next.sent,
        opened: prev.opened || next.opened,
        clicked: prev.clicked || next.clicked,
      }
    }
  }
  return merged
}

function engagementOf(august: SalesAugustInput): EngagementLevel {
  const mails = [1, 2, 3, 4] as const
  if (mails.some((mail) => august.mails[mail].clicked)) return 'HOT'
  if (mails.some((mail) => august.mails[mail].opened)) return 'WARM'
  if (mails.some((mail) => august.mails[mail].sent)) return 'COLD'
  return 'UNKNOWN'
}

function evidenceOf(
  canonical: SalesLeadInput,
  org: string | null,
  stats: { people: number; weakNamed: boolean; aligned: boolean },
): BusinessPotential {
  const strong = isStrong(canonical, org)
  if ((strong || stats.aligned) && stats.people >= 2 && !stats.weakNamed) return 'HIGH_EVIDENCE'
  if (strong && (stats.people >= 2 || multiNamed(canonical.name || ''))) return 'MEDIUM_EVIDENCE'
  const mailDomain = emailDomain(normalizeEmail(canonical.email))
  const otherHost = (canonical.name || '').match(/[a-z0-9.-]+\.(?:ch|com|net|org)/i)?.[0]?.toLowerCase()
  if (!strong && /fahrschule/i.test(canonical.name || '') && org && (
    (!!otherHost && otherHost !== org) || stats.weakNamed || (!!mailDomain && mailDomain !== org)
  )) return 'AMBIGUOUS'
  return 'LOW_EVIDENCE'
}

function confidenceOf(evidence: BusinessPotential, people: number, weakNamed: boolean): EvidenceConfidence {
  if (evidence === 'AMBIGUOUS' || weakNamed) return 'AMBIGUOUS'
  if (evidence === 'HIGH_EVIDENCE' && people >= 2) return 'HIGH'
  if (evidence === 'MEDIUM_EVIDENCE') return 'MEDIUM'
  return 'LOW'
}

function scoreOf(lead: SalesLeadInput, org: string | null, stats: { people: number; cities: number; weakNamed: boolean }, evidence: BusinessPotential): number {
  const strong = isStrong(lead, org)
  let score = 0
  if (strong && stats.people >= 2) score += 30
  if (strong && stats.people >= 6 && !stats.weakNamed) score += 20
  if (strong && stats.people >= 2 && stats.cities >= 2) score += 15
  if (lead.email && lead.phone && (lead.city || lead.address)) score += 10
  const mailDomain = emailDomain(normalizeEmail(lead.email))
  if (evidence !== 'AMBIGUOUS' && (strong || (!!org && mailDomain === org))) score += 10
  return score
}

function priorityOf(input: {
  eligible: boolean
  engagement: EngagementLevel
  evidence: BusinessPotential
  lead: SalesLeadInput
  org: string | null
}): Priority | null {
  if (!input.eligible) return null
  const hot = input.engagement === 'HOT'
  const warm = input.engagement === 'WARM'
  const cold = input.engagement === 'COLD'
  const high = input.evidence === 'HIGH_EVIDENCE' || input.evidence === 'MEDIUM_EVIDENCE'
  const low = input.evidence === 'LOW_EVIDENCE'
  const complete = !!(input.lead.email && input.lead.phone && (input.lead.city || input.lead.address))
  const own = isStrong(input.lead, input.org) || emailDomain(normalizeEmail(input.lead.email)) === input.org
  if (hot && (high || (low && complete && !!input.org && own))) return 'P1'
  if ((warm && high) || (hot && low)) return 'P2'
  if ((warm && low) || (cold && high)) return 'P3'
  return 'P4'
}

function whyLines(prospect: {
  engagement: EngagementLevel
  org: string | null
  lead: SalesLeadInput
  people: number
  august: SalesAugustInput
  hasPhone?: boolean
  hasEmail?: boolean
  hasPlace?: boolean
}): string[] {
  const lines: string[] = []
  if (prospect.engagement === 'HOT') lines.push('August-Kampagne geklickt')
  else if (prospect.engagement === 'WARM') lines.push('August-Kampagne geöffnet, kein Click')
  else if (prospect.engagement === 'COLD') lines.push('August-Kampagne gesendet, kein Open')
  else lines.push('Kein gespeichertes Kampagnensignal')
  if (prospect.org) lines.push('Eigene Domain')
  if (prospect.hasPhone ?? prospect.lead.phone) lines.push('Telefon vorhanden')
  if (prospect.hasEmail ?? prospect.lead.email) lines.push('E-Mail vorhanden')
  if (prospect.hasPlace ?? (prospect.lead.city || prospect.lead.address)) lines.push('Ort vorhanden')
  if (prospect.people >= 2) lines.push(`${prospect.people} Kontaktsignaturen erkannt`)
  if (prospect.august.sms_note) lines.push('SMS-Notiz vorhanden')
  lines.push('Keine gespeicherte Antwort gefunden')
  return lines
}

function consentFor(email: string, rows: SalesConsentInput[]): string {
  const statuses = rows
    .filter((row) => normalizeEmail(row.email) === email)
    .map((row) => (row.status || '').toLowerCase())
  if (statuses.includes('unsubscribed')) return 'unsubscribed'
  if (statuses.includes('active')) return 'active'
  if (statuses.includes('pending_consent')) return 'pending_consent'
  if (statuses.includes('bounced')) return 'bounced'
  return email ? 'unknown' : 'unknown'
}

function addressKey(value: string | null | undefined): string {
  return foldText(value).replace(/[^a-z0-9]+/g, ' ').trim()
}

export function primaryGroupedPhone(canonicalPhone: string | null | undefined, siblingPhones: readonly string[]): string | null {
  const canonical = (canonicalPhone || '').trim()
  if (normalizePhone(canonical)) return canonical
  for (const phone of siblingPhones) {
    const trimmed = phone.trim()
    if (normalizePhone(trimmed)) return trimmed
  }
  return null
}

export function groupedProspectContacts(
  group: Array<{ lead: SalesLeadInput }>,
  canonical: SalesLeadInput,
): { additional_phones: string[]; additional_emails: string[]; additional_addresses: string[] } {
  const seenPhones = new Set<string>()
  const seenEmails = new Set<string>()
  const seenAddresses = new Set<string>()
  const primaryPhone = normalizePhone(canonical.phone)
  const primaryEmail = normalizeEmail(canonical.email)
  const primaryAddress = addressKey(canonical.address)
  if (primaryPhone) seenPhones.add(primaryPhone)
  if (primaryEmail) seenEmails.add(primaryEmail)
  if (primaryAddress) seenAddresses.add(primaryAddress)
  const additional_phones: string[] = []
  const additional_emails: string[] = []
  const additional_addresses: string[] = []
  for (const row of [...group].sort((a, b) => a.lead.id.localeCompare(b.lead.id))) {
    const phoneKey = normalizePhone(row.lead.phone)
    const phone = (row.lead.phone || '').trim()
    if (phoneKey && phone && !seenPhones.has(phoneKey)) {
      seenPhones.add(phoneKey)
      additional_phones.push(phone)
    }
    const email = normalizeEmail(row.lead.email)
    if (email && !seenEmails.has(email)) {
      seenEmails.add(email)
      additional_emails.push(email)
    }
    const address = (row.lead.address || '').trim()
    const key = addressKey(address)
    if (key && !seenAddresses.has(key)) {
      seenAddresses.add(key)
      additional_addresses.push(address)
    }
  }
  return { additional_phones, additional_emails, additional_addresses }
}

function groupConsent(group: Array<{ lead: SalesLeadInput }>, canonicalEmail: string, consent: SalesConsentInput[]): { status: string; optOut: boolean } {
  const canonical = normalizeEmail(canonicalEmail)
  const status = consentFor(canonical, consent)
  if (status === 'unsubscribed') return { status, optOut: true }
  for (const row of group) {
    const email = normalizeEmail(row.lead.email)
    if (!email || email === canonical) continue
    if (consentFor(email, consent) === 'unsubscribed') return { status: 'unsubscribed', optOut: true }
  }
  return { status, optOut: false }
}

function groupHasReachableContact(
  group: Array<{ lead: SalesLeadInput }>,
  canonical: SalesLeadInput,
  consent: SalesConsentInput[],
): boolean {
  if (canonical.email || normalizePhone(canonical.phone)) return true
  for (const row of group) {
    if (normalizePhone(row.lead.phone)) return true
    const email = normalizeEmail(row.lead.email)
    if (email && consentFor(email, consent) !== 'unsubscribed') return true
  }
  return false
}

export function buildSalesProspects(input: {
  leads: SalesLeadInput[]
  tenants: SalesTenantInput[]
  staff: SalesStaffInput[]
  consent: SalesConsentInput[]
  augustByEmail: Map<string, SalesAugustInput>
}): SalesProspect[] {
  const index = buildTenantIndex(input.tenants, input.staff)
  const prepared = input.leads.map((lead) => ({
    lead,
    org: organizationDomain(lead),
    email: normalizeEmail(lead.email),
  }))
  const groups = new UnionFind()
  for (const row of prepared) groups.add(row.lead.id)
  const link = (key: string, bucket: Map<string, string>, id: string) => {
    const existing = bucket.get(key)
    if (existing) groups.union(existing, id)
    else bucket.set(key, id)
  }
  const byEmail = new Map<string, string>()
  const byOrg = new Map<string, string>()
  const byNameCity = new Map<string, string>()
  for (const row of prepared) {
    if (row.email) link(row.email, byEmail, row.lead.id)
    if (row.org) link(row.org, byOrg, row.lead.id)
    const nameKey = foldText(row.lead.name).replace(/[^a-z0-9]+/g, '')
    const cityKey = foldText(row.lead.city).trim()
    if (nameKey.length >= 8 && cityKey) link(`${nameKey}|${cityKey}`, byNameCity, row.lead.id)
  }

  const members = new Map<string, typeof prepared>()
  for (const row of prepared) {
    const root = groups.find(row.lead.id)
    const list = members.get(root) || []
    list.push(row)
    members.set(root, list)
  }

  const byOrgRows = new Map<string, SalesLeadInput[]>()
  for (const row of prepared) {
    if (!row.org) continue
    const list = byOrgRows.get(row.org) || []
    list.push(row.lead)
    byOrgRows.set(row.org, list)
  }
  const orgStats = new Map<string, { people: number; cities: number; weakNamed: boolean }>()
  for (const [org, rows] of byOrgRows) orgStats.set(org, countPeople(rows, org))

  const prospects: SalesProspect[] = []
  for (const group of members.values()) {
    const canonical = [...group].sort((a, b) => {
      const score = contactScore(b.lead) - contactScore(a.lead)
      if (score) return score
      const length = (b.lead.name || '').length - (a.lead.name || '').length
      if (length) return length
      return (a.lead.created_at || '').localeCompare(b.lead.created_at || '')
    })[0]
    let high: string | null = null
    let possible: string | null = null
    for (const row of group) {
      const match = matchLead(row.lead, index, row.org)
      if (match.high) high = match.high
      else if (match.possible) possible = match.possible
    }
    const august = groupAugust(group, input.augustByEmail, canonical)
    if (/sms/i.test(canonical.lead.notes || '')) august.sms_note = true
    const engagement = engagementOf(august)
    const stats = canonical.org ? (orgStats.get(canonical.org) || { people: 0, cities: 0, weakNamed: false }) : { people: 0, cities: 0, weakNamed: false }
    const aligned = !!canonical.org && canonicalAligns(canonical.lead, byOrgRows.get(canonical.org) || [], canonical.org)
    const evidence = evidenceOf(canonical.lead, canonical.org, { ...stats, aligned })
    const consent = groupConsent(group, canonical.email, input.consent)
    const optOut = consent.optOut
    const existing = !!high
    const possibleOnly = !existing && !!possible
    const contacts = groupedProspectContacts(group, canonical.lead)
    const phone = primaryGroupedPhone(canonical.lead.phone, contacts.additional_phones)
    const primaryPhoneKey = normalizePhone(phone)
    const additionalPhones = primaryPhoneKey
      ? contacts.additional_phones.filter((value) => normalizePhone(value) !== primaryPhoneKey)
      : contacts.additional_phones
    const eligible = !existing && !possibleOnly && !optOut && groupHasReachableContact(group, canonical.lead, input.consent)
    const priority = priorityOf({ eligible, engagement, evidence, lead: canonical.lead, org: canonical.org })
    const contactability: Contactability = existing
      ? 'EXISTING_TENANT'
      : possibleOnly
        ? 'POSSIBLE_EXISTING_TENANT'
        : optOut
          ? 'OPT_OUT'
          : 'REVIEW_REQUIRED'
    const sentCount = ([1, 2, 3, 4] as const).filter((mail) => august.mails[mail].sent).length
    const source_ids = group.map((row) => row.lead.id).sort((a, b) => a.localeCompare(b))
    prospects.push({
      prospect_id: canonical.lead.id,
      name: canonical.lead.name || 'Ohne Name',
      person: displayPerson(canonical.lead.first_name),
      phone,
      email: canonical.lead.email,
      website: canonical.lead.website,
      website_host: hostOf(canonical.lead.website) || null,
      city: canonical.lead.city,
      postal_code: canonical.lead.postal_code,
      address: canonical.lead.address,
      organization_domain: canonical.org,
      priority,
      engagement_level: engagement,
      business_potential: evidence,
      size_evidence_confidence: confidenceOf(evidence, stats.people, stats.weakNamed),
      business_score: scoreOf(canonical.lead, canonical.org, stats, evidence),
      contactability,
      contactability_label: contactabilityLabel(contactability),
      consent_status: consent.status,
      existing_tenant_match: existing,
      possible_existing_tenant: possibleOnly,
      opt_out: optOut,
      matched_tenant_name: high || possible,
      duplicate_group_size: group.length,
      strong_people: stats.people,
      why: whyLines({
        engagement,
        org: canonical.org,
        lead: canonical.lead,
        people: stats.people,
        august,
        hasPhone: !!(phone || additionalPhones.length),
        hasEmail: !!(canonical.lead.email || contacts.additional_emails.length),
        hasPlace: !!(canonical.lead.city || canonical.lead.address || contacts.additional_addresses.length),
      }),
      august: {
        sent: sentCount,
        opened: engagement === 'HOT' || engagement === 'WARM',
        clicked: engagement === 'HOT',
        mails: august.mails,
        sms_note: august.sms_note,
        historical: true,
      },
      eligible,
      contact_completeness: contactScore(canonical.lead),
      source_ids,
      additional_phones: additionalPhones,
      additional_emails: contacts.additional_emails,
      additional_addresses: contacts.additional_addresses,
    })
  }
  return prospects
}

export function contactabilityLabel(value: Contactability): string {
  if (value === 'OPT_OUT') return 'OPT-OUT — DO NOT CONTACT'
  if (value === 'EXISTING_TENANT') return 'EXISTING TENANT — EXCLUDED'
  if (value === 'POSSIBLE_EXISTING_TENANT') return 'POSSIBLE EXISTING TENANT'
  return 'CONTACTABILITY REVIEW REQUIRED'
}

const PRIORITY_RANK: Record<string, number> = { P1: 1, P2: 2, P3: 3, P4: 4 }
const ENGAGEMENT_RANK: Record<EngagementLevel, number> = { HOT: 1, WARM: 2, COLD: 3, UNKNOWN: 4 }
const EVIDENCE_RANK: Record<BusinessPotential, number> = {
  HIGH_EVIDENCE: 1,
  MEDIUM_EVIDENCE: 2,
  LOW_EVIDENCE: 3,
  AMBIGUOUS: 4,
}
const CONFIDENCE_RANK: Record<EvidenceConfidence, number> = { HIGH: 1, MEDIUM: 2, LOW: 3, AMBIGUOUS: 4 }

export function compareSalesProspects(a: SalesProspect, b: SalesProspect): number {
  const priority = (PRIORITY_RANK[a.priority || ''] || 9) - (PRIORITY_RANK[b.priority || ''] || 9)
  if (priority) return priority
  const engagement = ENGAGEMENT_RANK[a.engagement_level] - ENGAGEMENT_RANK[b.engagement_level]
  if (engagement) return engagement
  const evidence = EVIDENCE_RANK[a.business_potential] - EVIDENCE_RANK[b.business_potential]
  if (evidence) return evidence
  if (b.business_score !== a.business_score) return b.business_score - a.business_score
  if (b.contact_completeness !== a.contact_completeness) return b.contact_completeness - a.contact_completeness
  const confidence = CONFIDENCE_RANK[a.size_evidence_confidence] - CONFIDENCE_RANK[b.size_evidence_confidence]
  if (confidence) return confidence
  const id = (a.prospect_id || '').localeCompare(b.prospect_id || '')
  if (id) return id
  const email = normalizeEmail(a.email).localeCompare(normalizeEmail(b.email))
  if (email) return email
  return `${a.organization_domain || ''}|${foldText(a.name)}`.localeCompare(`${b.organization_domain || ''}|${foldText(b.name)}`)
}

export interface SalesListQuery {
  sprint?: boolean
  sprintLimit?: number
  priority?: string
  engagement?: string
  evidence?: string
  contactability?: string
  salesStatus?: string
  assignedTo?: string
  followUp?: string
  quick?: string
}

export interface SalesProfileAttachment {
  prospect_id: string
  sales_status?: string | null
  assigned_to?: string | null
  next_follow_up_at?: string | null
  last_contacted_at?: string | null
  contact_attempts?: number
  updated_at?: string | null
}

export function findSalesProspect(prospects: SalesProspect[], id: string): SalesProspect | null {
  return prospects.find((row) => row.prospect_id === id || row.source_ids.includes(id)) || null
}

export function profileForProspect<T extends Omit<SalesProfileAttachment, 'prospect_id'>>(
  prospect: { prospect_id: string; source_ids?: readonly string[] },
  manual: Map<string, T>,
): (T & { prospect_id: string }) | null {
  const ids = prospect.source_ids?.length ? prospect.source_ids : [prospect.prospect_id]
  const matches = [...new Set([prospect.prospect_id, ...ids])].flatMap((id) => {
    const row = manual.get(id)
    return row ? [{ ...row, prospect_id: id }] : []
  })
  if (!matches.length) return null
  const exact = matches.find((row) => row.prospect_id === prospect.prospect_id)
  if (exact) return exact
  return [...matches].sort((a, b) => {
    const updated = (b.updated_at || '').localeCompare(a.updated_at || '')
    if (updated) return updated
    const contacted = (b.last_contacted_at || '').localeCompare(a.last_contacted_at || '')
    if (contacted) return contacted
    const attempts = (b.contact_attempts || 0) - (a.contact_attempts || 0)
    if (attempts) return attempts
    return a.prospect_id.localeCompare(b.prospect_id)
  })[0]
}

export function filterSalesProspects(
  prospects: SalesProspect[],
  query: SalesListQuery,
  manual: Map<string, { sales_status?: string | null; assigned_to?: string | null; next_follow_up_at?: string | null }>,
): SalesProspect[] {
  const today = new Date().toISOString().slice(0, 10)
  return prospects.filter((prospect) => {
    const profile = profileForProspect(prospect, manual)
    if (query.sprint && !(prospect.eligible && (prospect.priority === 'P1' || prospect.priority === 'P2'))) return false
    if (query.priority && prospect.priority !== query.priority) return false
    if (query.engagement && prospect.engagement_level !== query.engagement) return false
    if (query.evidence && prospect.business_potential !== query.evidence) return false
    if (query.contactability && prospect.contactability !== query.contactability) return false
    if (query.salesStatus && (profile?.sales_status || 'new') !== query.salesStatus) return false
    if (query.assignedTo && profile?.assigned_to !== query.assignedTo) return false
    if (query.followUp === 'due') {
      const due = profile?.next_follow_up_at?.slice(0, 10)
      if (!due || due > today) return false
    }
    if (query.followUp === 'upcoming') {
      const due = profile?.next_follow_up_at?.slice(0, 10)
      if (!due || due <= today) return false
    }
    if (query.quick === 'HOT' && prospect.engagement_level !== 'HOT') return false
    if (query.quick === 'P1' && prospect.priority !== 'P1') return false
    if (query.quick === 'follow_up') {
      const due = profile?.next_follow_up_at?.slice(0, 10)
      if (!due || due > today) return false
    }
    if (query.quick === 'demo' && !['demo_booked', 'demo_completed'].includes(profile?.sales_status || '')) return false
    if (query.quick === 'proposal' && profile?.sales_status !== 'proposal') return false
    if (query.quick === 'nurture' && profile?.sales_status !== 'nurture') return false
    return true
  }).sort(compareSalesProspects)
}

export function initialSprint(prospects: SalesProspect[], limit = 50): { rows: SalesProspect[]; total: number } {
  const sorted = filterSalesProspects(prospects, { sprint: true }, new Map())
  return { rows: sorted.slice(0, limit), total: sorted.length }
}

export function augustFromCampaignRows(rows: Array<{
  campaign_name: string | null
  email: string | null
  status: string | null
  sent_at: string | null
  opened_at: string | null
  clicked_at: string | null
}>): Map<string, SalesAugustInput> {
  const map = new Map<string, SalesAugustInput>()
  for (const row of rows) {
    const email = normalizeEmail(row.email)
    const match = (row.campaign_name || '').match(/Mail\s+([1-4])/i)
    if (!email || !match || !/fahrlehrer/i.test(row.campaign_name || '') || !/outreach/i.test(row.campaign_name || '')) continue
    const mail = Number(match[1]) as 1 | 2 | 3 | 4
    const current = map.get(email) || emptyAugust()
    const status = (row.status || '').toLowerCase()
    const sent = !!row.sent_at || status === 'sent' || status === 'opened' || status === 'clicked'
    const opened = !!row.opened_at || status === 'opened' || status === 'clicked'
    const clicked = !!row.clicked_at || status === 'clicked'
    const prev = current.mails[mail]
    current.mails[mail] = {
      sent: prev.sent || sent,
      opened: prev.opened || opened,
      clicked: prev.clicked || clicked,
    }
    map.set(email, current)
  }
  return map
}
