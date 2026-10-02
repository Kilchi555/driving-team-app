/**
 * Customer import planning (public.users, role client).
 *
 * Dry-run and execute both call `planCustomerImport`. This module does not
 * touch Supabase. The HTTP handler performs tenant-scoped reads and writes.
 *
 * FILE-INTERNAL DUPLICATE RULE
 * Rows are processed in file order. The first row that passes validation
 * owns its lowercased email and its canonical phone. A later row that reuses
 * either key is skipped as a duplicate in every duplicateMode, including
 * create. The database unique indexes cannot store two of those keys, so the
 * later row is never sent to INSERT. Invalid rows do not own keys: a later
 * valid row can still win.
 *
 * PHONE CANONICAL FORM (normalization = storage = duplicate key)
 * Existing rule, not a new scheme:
 *   trim; strip spaces, hyphens, dots, parentheses, slashes;
 *   length < 7 → null;
 *   Swiss national /^07\d{8}$/ → '+41' + remainder without the leading 0
 *     (0791234567 and "+41 79 123 45 67" both become +41791234567);
 *   otherwise the cleaned string is kept unchanged.
 * The international prefix 0041 is NOT rewritten to +41.
 * 0041791234567 stays 0041791234567 and is a different key from +41791234567.
 * New inserts and phone updates store this canonical value. Existing
 * production rows are not migrated.
 *
 * STORAGE vs EXPORT (formula safety)
 * There is no separate CSV/Excel export layer for these user fields.
 * Free text that can later be exported is neutralized on the way in by
 * prefixing a single quote when the value starts with =, +, -, @ or a tab.
 * Email and phone are NOT quote-prefixed: quoting would break the unique
 * keys, and a leading + is valid E.164. A phone that still starts with
 * =, @ or tab after normalization is rejected instead of stored.
 *
 * ACCOUNTING
 * Each input row is exactly one of created, updated, skipped, failed.
 * `duplicates` counts skipped rows whose reason is a duplicate
 * (file-internal or an existing record left unchanged). duplicates ⊆ skipped.
 * created + updated + skipped + failed = total.
 *
 * The dry-run `duplicates` array is a review list. It also contains planned
 * updates so the operator can still choose overwrite/supplement. That array
 * is therefore not the same number as `duplicates` / `duplicateCount`.
 * Planned updates are counted in `updated`, not in `duplicates`.
 */

export const ALLOWED_LANGUAGES = ['de', 'en', 'sq', 'it', 'es', 'fr', 'hr', 'sr', 'bs', 'tr', 'ru'] as const

export type AllowedLanguage = (typeof ALLOWED_LANGUAGES)[number]

export const CUSTOMER_IMPORT_BATCH_SIZE = 500

export const FABER_ID_MAX_LENGTH = 20

const DUPLICATE_MODES = ['skip', 'overwrite', 'supplement', 'create'] as const

export type DuplicateMode = (typeof DUPLICATE_MODES)[number]

export interface ExistingRef {
  id: string
  role: string
}

export interface CustomerImportLookups {
  byEmail: Map<string, ExistingRef>
  byPhone: Map<string, ExistingRef>
  byNameBirthdate: Map<string, ExistingRef>
  byLernfahrausweis: Map<string, ExistingRef>
}

export interface CustomerImportRawRow {
  email?: string
  first_name?: string
  last_name?: string
  phone?: string
  birthdate?: string
  street?: string
  street_nr?: string
  zip?: string
  city?: string
  lernfahrausweis_nr?: string
  category?: string
  profession?: string
  language?: string
  preferred_payment_method?: string
  faberid?: string
  sari_faberid?: string
  sari_birthdate?: string
  acquisition_source?: string
  referred_by_code?: string
  [key: string]: string | undefined
}

export interface CustomerFieldBag {
  email: string | null
  phone: string | null
  first_name: string
  last_name: string
  birthdate: string | null
  street: string | null
  street_nr: string | null
  zip: string | null
  city: string | null
  lernfahrausweis_nr: string | null
  category: string[] | null
  profession: string | null
  /** Present only when a valid language was supplied. Absent → omit on INSERT. */
  language?: AllowedLanguage
  preferred_payment_method: string | null
  faberid: string | null
  sari_faberid: string | null
  sari_birthdate: string | null
  acquisition_source: string | null
  referred_by_code: string | null
  metadata: Record<string, string> | null
  nameKey: string | null
}

export interface InsertPlan {
  kind: 'insert'
  sourceRow: number
  identifier: string
  record: Record<string, unknown>
}

export interface UpdatePlan {
  kind: 'update'
  sourceRow: number
  identifier: string
  id: string
  mode: 'overwrite' | 'supplement'
  matchedOn: string
  fields: CustomerFieldBag
  updatePayload: Record<string, unknown>
}

export interface SkipPlan {
  kind: 'skip'
  sourceRow: number
  identifier: string
  reason: string
  duplicate: boolean
  fileInternal?: boolean
  locked?: boolean
  matchedOn?: string
}

export interface FailPlan {
  kind: 'fail'
  sourceRow: number
  identifier: string
  reason: string
}

export type PlannedRow = InsertPlan | UpdatePlan | SkipPlan | FailPlan

export interface ImportAccounting {
  total: number
  created: number
  updated: number
  skipped: number
  failed: number
  /** Subset of `skipped`: file-internal and unchanged existing duplicates. */
  duplicates: number
}

export interface DryRunDuplicate {
  row: number
  identifier: string
  matchedOn: string
  action: string
  locked?: boolean
}

const ACTION_LABEL: Record<DuplicateMode, string> = {
  skip: 'Überspringen',
  overwrite: 'Überschreiben',
  supplement: 'Ergänzen',
  create: 'Neu anlegen',
}

const OVERWRITE_ALWAYS = [
  'first_name',
  'last_name',
  'phone',
  'birthdate',
  'street',
  'street_nr',
  'zip',
  'city',
] as const

const OVERWRITE_IF_PRESENT = [
  'lernfahrausweis_nr',
  'category',
  'profession',
  'preferred_payment_method',
  'faberid',
  'sari_faberid',
  'sari_birthdate',
  'acquisition_source',
  'referred_by_code',
] as const

const SUPPLEMENTABLE = [
  'first_name',
  'last_name',
  'phone',
  'birthdate',
  'street',
  'street_nr',
  'zip',
  'city',
  'lernfahrausweis_nr',
  'category',
  'profession',
  'language',
  'preferred_payment_method',
  'faberid',
  'sari_faberid',
  'sari_birthdate',
  'acquisition_source',
  'referred_by_code',
] as const

const FORBIDDEN_WRITE_KEYS = [
  'auth_user_id',
  'credits',
  'deleted_at',
  'created_at',
  'role',
  'tenant_id',
  'is_active',
  'email',
] as const

export function asDuplicateMode(value: unknown, fallback: DuplicateMode = 'skip'): DuplicateMode {
  return typeof value === 'string' && (DUPLICATE_MODES as readonly string[]).includes(value)
    ? value as DuplicateMode
    : fallback
}

/** Spreadsheet formula neutralization for free-text storage. */
export function sanitizeImportText(value: string): string {
  return /^[=+\-@\t]/.test(value) ? `'${value}` : value
}

function isValidEmail(email: string): boolean {
  const trimmed = email.trim()
  if (trimmed.length === 0 || trimmed.length > 254) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)
}

/**
 * Canonical phone. See module comment for the 0041 rule.
 * 0791234567 and "+41 79 123 45 67" → +41791234567.
 * 0041791234567 stays 0041791234567.
 */
export function normalizePhone(raw: string | undefined | null): string | null {
  if (!raw) return null
  const cleaned = raw.trim().replace(/[\s\-.()/]/g, '')
  if (cleaned.length < 7) return null
  if (/^07\d{8}$/.test(cleaned)) return '+41' + cleaned.slice(1)
  return cleaned
}

function isRealCalendarDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

/** Accepts DD.MM.YYYY, YYYY-MM-DD and MM/DD/YYYY. Impossible calendar dates return null. */
export function parseImportDate(value: string | undefined | null): string | null {
  if (!value) return null
  const cleaned = value.trim()
  if (!cleaned) return null

  let year: number
  let month: number
  let day: number
  const dotted = cleaned.match(/^(\d{2})\.(\d{2})\.(\d{4})$/)
  const iso = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  const us = cleaned.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (dotted) {
    day = Number(dotted[1])
    month = Number(dotted[2])
    year = Number(dotted[3])
  } else if (iso) {
    year = Number(iso[1])
    month = Number(iso[2])
    day = Number(iso[3])
  } else if (us) {
    month = Number(us[1])
    day = Number(us[2])
    year = Number(us[3])
  } else {
    return null
  }

  if (!isRealCalendarDate(year, month, day)) return null
  const pad = (n: number, width: number) => String(n).padStart(width, '0')
  return `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}`
}

export function nameKey(firstName: string, lastName: string, birthdate: string | null): string | null {
  if (!firstName || !lastName || !birthdate) return null
  return `${firstName.toLowerCase().trim()}|${lastName.toLowerCase().trim()}|${birthdate}`
}

function sanitizeMetaKey(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_|_$/g, '')
}

function parseCategories(raw: string | undefined): string[] | null {
  if (!raw?.trim()) return null
  const categories = raw
    .split(/[,;]/)
    .map(part => sanitizeImportText(part.trim()).toUpperCase())
    .filter(Boolean)
  return categories.length > 0 ? categories : null
}

function optionalText(raw: string | undefined): string | null {
  const trimmed = raw?.trim() || ''
  if (!trimmed) return null
  return sanitizeImportText(trimmed)
}

function boundedId(raw: string | undefined, label: string, errors: string[]): string | null {
  const value = optionalText(raw)
  if (value && value.length > FABER_ID_MAX_LENGTH) {
    errors.push(`${label} ist länger als ${FABER_ID_MAX_LENGTH} Zeichen`)
    return null
  }
  return value
}

/**
 * Language: empty/unmapped → omit the column (DB default 'de' applies).
 * A supplied value must be one of the users_language_check codes.
 */
export function resolveLanguage(raw: string | undefined | null): { language?: AllowedLanguage; error?: string } {
  const trimmed = raw?.trim() || ''
  if (!trimmed) return {}
  const code = trimmed.toLowerCase()
  if ((ALLOWED_LANGUAGES as readonly string[]).includes(code)) {
    return { language: code as AllowedLanguage }
  }
  return { error: `Ungültige Sprache "${trimmed}" (erlaubt: ${ALLOWED_LANGUAGES.join(', ')})` }
}

function requireDate(raw: string | undefined, label: string, errors: string[]): string | null {
  const trimmed = raw?.trim() || ''
  if (!trimmed) return null
  const parsed = parseImportDate(trimmed)
  if (!parsed) {
    errors.push(`${label} ist kein gültiges Datum`)
    return null
  }
  return parsed
}

export function normalizeCustomerRow(
  row: CustomerImportRawRow,
  metadataFields: string[],
  paymentCodes: Set<string> | null | undefined,
): { ok: true; bag: CustomerFieldBag; identifier: string } | { ok: false; identifier: string; reason: string } {
  const errors: string[] = []
  const emailRaw = (row.email || '').trim()
  const email = emailRaw ? emailRaw.toLowerCase() : null
  if (email && !isValidEmail(email)) errors.push('Ungültige E-Mail-Adresse')

  const firstName = sanitizeImportText(row.first_name?.trim() || '')
  const lastName = sanitizeImportText(row.last_name?.trim() || '')
  if (!firstName && !lastName) errors.push('Vor- oder Nachname fehlt')

  const phone = normalizePhone(row.phone)
  if (phone && /^[=@\t]/.test(phone)) {
    errors.push('Telefonnummer ist kein speicherbarer Wert')
  }

  const birthdate = requireDate(row.birthdate, 'Geburtsdatum', errors)
  const sariBirthdate = requireDate(row.sari_birthdate, 'SARI-Geburtsdatum', errors)
  const language = resolveLanguage(row.language)
  if (language.error) errors.push(language.error)

  const payment = row.preferred_payment_method?.trim() || ''
  let preferredPayment: string | null = null
  if (payment) {
    if (paymentCodes === undefined) {
      preferredPayment = payment
    } else if (paymentCodes === null || !paymentCodes.has(payment)) {
      errors.push('Unbekannte Zahlungsart')
    } else {
      preferredPayment = payment
    }
  }

  const faberid = boundedId(row.faberid, 'Faber-ID', errors)
  const sariFaberid = boundedId(row.sari_faberid, 'SARI-Faber-ID', errors)

  const metadata: Record<string, string> = {}
  for (const colName of metadataFields) {
    const val = row[colName]?.trim()
    const key = sanitizeMetaKey(colName)
    if (val && key) metadata[key] = sanitizeImportText(val)
  }

  const identifier = email || phone || optionalText(row.lernfahrausweis_nr) || `${firstName} ${lastName}`.trim() || '–'
  if (errors.length > 0) {
    return { ok: false, identifier, reason: errors.join('; ') }
  }

  const bag: CustomerFieldBag = {
    email,
    phone: phone && /^[=@\t]/.test(phone) ? null : phone,
    first_name: firstName,
    last_name: lastName,
    birthdate,
    street: optionalText(row.street),
    street_nr: optionalText(row.street_nr),
    zip: optionalText(row.zip),
    city: optionalText(row.city),
    lernfahrausweis_nr: optionalText(row.lernfahrausweis_nr),
    category: parseCategories(row.category),
    profession: optionalText(row.profession),
    preferred_payment_method: preferredPayment,
    faberid,
    sari_faberid: sariFaberid,
    sari_birthdate: sariBirthdate,
    acquisition_source: optionalText(row.acquisition_source),
    referred_by_code: optionalText(row.referred_by_code),
    metadata: Object.keys(metadata).length > 0 ? metadata : null,
    nameKey: nameKey(firstName, lastName, birthdate),
  }
  if (language.language) bag.language = language.language

  return { ok: true, bag, identifier }
}

export function buildUserInsertRecord(bag: CustomerFieldBag, tenantId: string): Record<string, unknown> {
  const record: Record<string, unknown> = {
    first_name: bag.first_name,
    last_name: bag.last_name,
    email: bag.email,
    phone: bag.phone,
    birthdate: bag.birthdate,
    street: bag.street,
    street_nr: bag.street_nr,
    zip: bag.zip,
    city: bag.city,
    lernfahrausweis_nr: bag.lernfahrausweis_nr,
    category: bag.category,
    profession: bag.profession,
    preferred_payment_method: bag.preferred_payment_method,
    faberid: bag.faberid,
    sari_faberid: bag.sari_faberid,
    sari_birthdate: bag.sari_birthdate,
    acquisition_source: bag.acquisition_source,
    referred_by_code: bag.referred_by_code,
    role: 'client',
    tenant_id: tenantId,
    is_active: true,
  }
  if (bag.language) record.language = bag.language
  if (bag.metadata) record.metadata = bag.metadata
  return record
}

export function buildOverwritePayload(bag: CustomerFieldBag): Record<string, unknown> {
  const payload: Record<string, unknown> = {}
  for (const field of OVERWRITE_ALWAYS) payload[field] = bag[field]
  for (const field of OVERWRITE_IF_PRESENT) {
    if (bag[field] != null) payload[field] = bag[field]
  }
  if (bag.language) payload.language = bag.language
  if (bag.metadata) payload.metadata = bag.metadata
  return payload
}

function isEmptyStored(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return true
  return Array.isArray(value) && value.length === 0
}

function phoneCollides(phone: string | null, targetId: string, byPhone: Map<string, ExistingRef>): boolean {
  if (!phone) return false
  const owner = byPhone.get(phone)
  return !!owner && owner.id !== targetId
}

/**
 * Turns supplement updates into a sparse payload, or into a duplicate skip
 * when every incoming field is already filled. Missing tenant rows fail closed.
 */
export function refineSupplementPlans(
  rows: PlannedRow[],
  existingById: Map<string, Record<string, unknown>>,
  byPhone: Map<string, ExistingRef>,
): PlannedRow[] {
  return rows.map((row) => {
    if (row.kind !== 'update' || row.mode !== 'supplement') return row
    const existing = existingById.get(row.id)
    if (!existing) {
      return {
        kind: 'fail',
        sourceRow: row.sourceRow,
        identifier: row.identifier,
        reason: 'Bestehender Datensatz gehört nicht zu diesem Tenant',
      }
    }

    if (phoneCollides(row.fields.phone, row.id, byPhone) && isEmptyStored(existing.phone)) {
      return {
        kind: 'fail',
        sourceRow: row.sourceRow,
        identifier: row.identifier,
        reason: 'Telefonnummer gehört bereits zu einem anderen Kunden',
      }
    }

    const updatePayload: Record<string, unknown> = {}
    for (const field of SUPPLEMENTABLE) {
      const incoming = row.fields[field]
      if (isEmptyStored(existing[field]) && incoming) updatePayload[field] = incoming
    }
    if (row.fields.metadata) {
      const existingMeta = (existing.metadata && typeof existing.metadata === 'object')
        ? existing.metadata as Record<string, string>
        : {}
      const merged = { ...row.fields.metadata, ...existingMeta }
      if (JSON.stringify(merged) !== JSON.stringify(existingMeta)) updatePayload.metadata = merged
    }
    if (Object.keys(updatePayload).length === 0) {
      return {
        kind: 'skip',
        sourceRow: row.sourceRow,
        identifier: row.identifier,
        reason: `Bereits vorhanden via ${row.matchedOn} — keine neuen Felder zum Ergänzen`,
        duplicate: true,
        matchedOn: row.matchedOn,
      }
    }
    return { ...row, updatePayload }
  })
}

export function planCustomerImport(input: {
  rows: CustomerImportRawRow[]
  tenantId: string
  duplicateMode?: unknown
  rowActions?: Record<number | string, unknown>
  metadataFields?: string[]
  lookups: CustomerImportLookups
  /** undefined = do not check; null = lookup unavailable, fail closed. */
  paymentCodes?: Set<string> | null
}): PlannedRow[] {
  const duplicateMode = asDuplicateMode(input.duplicateMode, 'skip')
  const metadataFields = input.metadataFields ?? []
  const ownedEmails = new Set<string>()
  const ownedPhones = new Set<string>()
  const planned: PlannedRow[] = []

  input.rows.forEach((raw, index) => {
    const sourceRow = index + 2
    const normalized = normalizeCustomerRow(raw, metadataFields, input.paymentCodes)
    if (!normalized.ok) {
      planned.push({
        kind: 'fail',
        sourceRow,
        identifier: normalized.identifier,
        reason: normalized.reason,
      })
      return
    }

    const { bag, identifier } = normalized
    const fileHits: string[] = []
    if (bag.email && ownedEmails.has(bag.email)) fileHits.push('E-Mail')
    if (bag.phone && ownedPhones.has(bag.phone)) fileHits.push('Telefon')
    if (fileHits.length > 0) {
      planned.push({
        kind: 'skip',
        sourceRow,
        identifier,
        duplicate: true,
        fileInternal: true,
        locked: true,
        matchedOn: `Datei (${fileHits.join(', ')})`,
        reason: `Duplikat in derselben Datei via ${fileHits.join(', ')} — die erste gültige Zeile bleibt`,
      })
      return
    }
    if (bag.email) ownedEmails.add(bag.email)
    if (bag.phone) ownedPhones.add(bag.phone)

    const matches: { id: string; via: string; role: string }[] = []
    if (bag.email) {
      const match = input.lookups.byEmail.get(bag.email)
      if (match) matches.push({ id: match.id, via: 'E-Mail', role: match.role })
    }
    if (bag.phone) {
      const match = input.lookups.byPhone.get(bag.phone)
      if (match && !matches.some(item => item.id === match.id)) {
        matches.push({ id: match.id, via: 'Telefon', role: match.role })
      }
    }
    if (bag.nameKey) {
      const match = input.lookups.byNameBirthdate.get(bag.nameKey)
      if (match && !matches.some(item => item.id === match.id)) {
        matches.push({ id: match.id, via: 'Name+Geburtsdatum', role: match.role })
      }
    }
    if (bag.lernfahrausweis_nr) {
      const match = input.lookups.byLernfahrausweis.get(bag.lernfahrausweis_nr)
      if (match && !matches.some(item => item.id === match.id)) {
        matches.push({ id: match.id, via: 'Lernfahrausweis-Nr', role: match.role })
      }
    }

    const distinctIds = new Set(matches.map(match => match.id))
    if (distinctIds.size > 1) {
      planned.push({
        kind: 'fail',
        sourceRow,
        identifier,
        reason: `Uneindeutiger Treffer (${matches.map(match => match.via).join(', ')}) — bitte manuell prüfen`,
      })
      return
    }

    const existing = matches[0]
    const requested = input.rowActions?.[sourceRow] ?? input.rowActions?.[String(sourceRow)]
    const effectiveMode = existing
      ? asDuplicateMode(requested, duplicateMode)
      : duplicateMode
    const matchedOn = matches.map(match => match.via).join(', ')
    const uniqueHit = matches.some(match => match.via === 'E-Mail' || match.via === 'Telefon')

    if (existing && existing.role !== 'client' && effectiveMode !== 'create') {
      planned.push({
        kind: 'skip',
        sourceRow,
        identifier,
        duplicate: true,
        locked: true,
        matchedOn,
        reason: `Treffer via ${matchedOn} ist ein ${existing.role}-Konto — nicht überschrieben`,
      })
      return
    }

    if (existing && effectiveMode === 'create' && uniqueHit) {
      planned.push({
        kind: 'fail',
        sourceRow,
        identifier,
        reason: `Bereits vorhanden via ${matchedOn} — Unique-Constraint, kein zweites Profil`,
      })
      return
    }

    if (existing && effectiveMode !== 'create') {
      if (effectiveMode === 'skip') {
        planned.push({
          kind: 'skip',
          sourceRow,
          identifier,
          duplicate: true,
          matchedOn,
          reason: `Bereits vorhanden via ${matchedOn} (übersprungen)`,
        })
        return
      }
      if (phoneCollides(bag.phone, existing.id, input.lookups.byPhone)) {
        planned.push({
          kind: 'fail',
          sourceRow,
          identifier,
          reason: 'Telefonnummer gehört bereits zu einem anderen Kunden',
        })
        return
      }
      planned.push({
        kind: 'update',
        sourceRow,
        identifier,
        id: existing.id,
        mode: effectiveMode,
        matchedOn,
        fields: bag,
        updatePayload: effectiveMode === 'overwrite' ? buildOverwritePayload(bag) : {},
      })
      return
    }

    planned.push({
      kind: 'insert',
      sourceRow,
      identifier,
      record: buildUserInsertRecord(bag, input.tenantId),
    })
  })

  return planned
}

export function accountPlannedRows(rows: PlannedRow[]): ImportAccounting {
  const accounting: ImportAccounting = {
    total: rows.length,
    created: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    duplicates: 0,
  }
  for (const row of rows) {
    if (row.kind === 'insert') accounting.created += 1
    else if (row.kind === 'update') accounting.updated += 1
    else if (row.kind === 'skip') {
      accounting.skipped += 1
      if (row.duplicate) accounting.duplicates += 1
    } else {
      accounting.failed += 1
    }
  }
  return accounting
}

export function accountingBalances(accounting: ImportAccounting): boolean {
  return accounting.created + accounting.updated + accounting.skipped + accounting.failed === accounting.total
    && accounting.duplicates <= accounting.skipped
}

export function dryRunDuplicates(rows: PlannedRow[]): DryRunDuplicate[] {
  const review: DryRunDuplicate[] = []
  for (const row of rows) {
    if (row.kind === 'update') {
      review.push({
        row: row.sourceRow,
        identifier: row.identifier,
        matchedOn: row.matchedOn,
        action: ACTION_LABEL[row.mode],
      })
    } else if (row.kind === 'skip' && row.duplicate) {
      review.push({
        row: row.sourceRow,
        identifier: row.identifier,
        matchedOn: row.matchedOn || '',
        action: ACTION_LABEL.skip,
        locked: row.locked || row.fileInternal || false,
      })
    }
  }
  return review.sort((a, b) => a.row - b.row)
}

export function failedRows(rows: PlannedRow[], limit = 100): { row: number; identifier: string; reason: string }[] {
  return rows
    .filter((row): row is FailPlan => row.kind === 'fail')
    .slice(0, limit)
    .map(row => ({ row: row.sourceRow, identifier: row.identifier, reason: row.reason }))
}

/**
 * A Postgres INSERT statement is atomic. If it errors, or if the returned
 * row count does not match the batch, none of these rows are counted as
 * created. Callers continue with later batches. Source row numbers stay
 * attached to the plan, not to the insert offset.
 */
export function settleInsertBatch(
  batch: InsertPlan[],
  result: { error: boolean; insertedCount: number; message?: string },
): { created: number; rows: PlannedRow[] } {
  if (!result.error && result.insertedCount === batch.length) {
    return { created: batch.length, rows: batch }
  }
  const reason = result.message || 'Datenbank hat den Insert-Batch abgelehnt'
  return {
    created: 0,
    rows: batch.map(row => ({
      kind: 'fail' as const,
      sourceRow: row.sourceRow,
      identifier: row.identifier,
      reason,
    })),
  }
}

export function insertPayloadIsSafe(record: Record<string, unknown>): boolean {
  return record.role === 'client'
    && typeof record.tenant_id === 'string'
    && record.auth_user_id === undefined
    && record.credits === undefined
    && record.deleted_at === undefined
    && record.created_at === undefined
    && !('language' in record && record.language == null)
}

export function updatePayloadIsSafe(payload: Record<string, unknown>): boolean {
  return FORBIDDEN_WRITE_KEYS.every(key => !(key in payload))
}
