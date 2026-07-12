import { defineEventHandler, readBody, createError, getRequestHeader } from 'h3'
import { requireAdminOnly } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { logger } from '~/utils/logger'

interface UserRow {
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
  // Extended fields
  category?: string        // comma-separated → text[] in DB
  profession?: string
  language?: string
  preferred_payment_method?: string
  faberid?: string
  sari_faberid?: string
  sari_birthdate?: string  // date string, same parsing as birthdate
  acquisition_source?: string
  referred_by_code?: string
  // Extra: arbitrary key-value pairs from metadata columns
  [key: string]: string | undefined
}

/** Sanitize a raw CSV column name into a valid JSONB key */
function sanitizeMetaKey(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_|_$/g, '')
}

/** Parse comma/semicolon-separated category string into array */
function parseCategories(raw: string | undefined): string[] | null {
  if (!raw?.trim()) return null
  return raw.split(/[,;]/).map(c => c.trim().toUpperCase()).filter(Boolean)
}

/**
 * skip        – leave existing record untouched, discard CSV row
 * overwrite   – replace all fields in existing record with CSV values
 * supplement  – only fill fields that are currently NULL/empty in the existing record
 * create      – always insert as a new record, even if a match is found
 */
type DuplicateMode = 'skip' | 'overwrite' | 'supplement' | 'create'

function isValidEmail(email: string): boolean {
  const trimmed = email.trim()
  if (trimmed.length === 0 || trimmed.length > 254) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)
}

/**
 * Neutralizes CSV/spreadsheet formula-injection payloads: values starting
 * with `=`, `+`, `-`, `@` or a tab are interpreted as formulas by Excel/
 * Sheets and could run arbitrary logic (or leak data) for anyone who later
 * exports this data back to a spreadsheet. Prefixing a single quote forces
 * spreadsheet apps to treat the value as plain text.
 */
function sanitizeCsvValue(value: string): string {
  return /^[=+\-@\t]/.test(value) ? `'${value}` : value
}

/** Normalize phone to E.164-ish digits for comparison */
function normalizePhone(raw: string | undefined | null): string | null {
  if (!raw) return null
  const cleaned = raw.trim().replace(/[\s\-.()/]/g, '')
  if (cleaned.length < 7) return null
  // Swiss 07x → +417x
  if (/^07\d{8}$/.test(cleaned)) return '+41' + cleaned.slice(1)
  return cleaned
}

function parseDate(value: string | undefined): string | null {
  if (!value) return null
  const cleaned = value.trim()
  const formats = [
    /^(\d{2})\.(\d{2})\.(\d{4})$/, // DD.MM.YYYY
    /^(\d{4})-(\d{2})-(\d{2})$/,   // YYYY-MM-DD
    /^(\d{2})\/(\d{2})\/(\d{4})$/, // MM/DD/YYYY
  ]
  for (const fmt of formats) {
    const m = cleaned.match(fmt)
    if (m) {
      if (fmt === formats[0]) return `${m[3]}-${m[2]}-${m[1]}`
      if (fmt === formats[1]) return `${m[1]}-${m[2]}-${m[3]}`
      if (fmt === formats[2]) return `${m[3]}-${m[1]}-${m[2]}`
    }
  }
  return null
}

/** Composite key: "vorname|nachname|YYYY-MM-DD" (lowercased) */
function nameKey(firstName: string, lastName: string, birthdate: string | null): string | null {
  if (!firstName || !lastName || !birthdate) return null
  return `${firstName.toLowerCase().trim()}|${lastName.toLowerCase().trim()}|${birthdate}`
}

/**
 * POST /api/admin/import-users
 *
 * Always checks ALL dedup methods simultaneously:
 *   email, phone (normalized), name+birthdate, lernfahrausweis_nr
 *
 * Body:
 *   rows          – array of mapped user objects
 *   duplicateMode – 'skip' | 'overwrite' | 'supplement' | 'create'
 *   dryRun        – if true, only analyse without writing to DB
 */
export default defineEventHandler(async (event) => {
  // Admin-only (not staff): bulk import can overwrite/supplement any user
  // record in the tenant, so it's restricted to the same role tier as other
  // destructive tenant-wide operations.
  const profile = await requireAdminOnly(event)

  const ip = getRequestHeader(event, 'x-forwarded-for')?.split(',')[0]?.trim()
    || getRequestHeader(event, 'x-real-ip')
    || event.node.req.socket?.remoteAddress
    || 'unknown'
  const rateLimit = await checkRateLimit(ip, 'admin_import_users', 20, 60 * 60 * 1000, undefined, profile.tenant_id)
  if (!rateLimit.allowed) {
    throw createError({ statusCode: 429, statusMessage: 'Zu viele Import-Anfragen. Bitte später erneut versuchen.' })
  }

  const body = await readBody(event)
  const {
    rows,
    duplicateMode = 'skip',
    rowActions = {},
    dryRun = false,
    metadataFields = [],
  } = body as {
    rows: UserRow[]
    duplicateMode?: DuplicateMode
    rowActions?: Record<number, DuplicateMode>
    dryRun?: boolean
    metadataFields?: string[]   // CSV column names to store in metadata JSONB
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'rows array is required and must not be empty' })
  }
  if (rows.length > 5000) {
    throw createError({ statusCode: 400, statusMessage: 'Max 5,000 rows per import' })
  }

  const supabase = getSupabaseAdmin()
  const errorsLog: { row: number; identifier: string; reason: string }[] = []
  let importedCount = 0
  let skippedCount = 0
  let updatedCount = 0

  // ── Validate & normalize input rows ──────────────────────────────────────
  const validRows: any[] = []
  rows.forEach((row, index) => {
    const email = (row.email || '').trim().toLowerCase() || null
    const firstName = sanitizeCsvValue(row.first_name?.trim() || '')
    const lastName = sanitizeCsvValue(row.last_name?.trim() || '')
    const phone = normalizePhone(row.phone)
    const birthdate = parseDate(row.birthdate)
    const lernfahrausweis = row.lernfahrausweis_nr?.trim() || null

    // DB NOT NULL: first_name or last_name required
    if (!firstName && !lastName) {
      errorsLog.push({ row: index + 2, identifier: email || phone || '–', reason: 'Vor- oder Nachname fehlt (DB NOT NULL)' })
      return
    }

    if (email && !isValidEmail(email)) {
      errorsLog.push({ row: index + 2, identifier: row.email || '', reason: 'Ungültige E-Mail-Adresse' })
      return
    }

    // Build metadata object from designated CSV columns
    const metadata: Record<string, string> = {}
    for (const colName of metadataFields) {
      const val = row[colName]?.trim()
      if (val) metadata[sanitizeMetaKey(colName)] = sanitizeCsvValue(val)
    }

    validRows.push({
      _rowIndex: index + 2,
      email,
      phone_normalized: phone,
      phone_raw: row.phone?.trim() || null,
      first_name: firstName,
      last_name: lastName,
      birthdate,
      name_key: nameKey(firstName, lastName, birthdate),
      lernfahrausweis_nr: lernfahrausweis,
      street: sanitizeCsvValue(row.street?.trim() || '') || null,
      street_nr: row.street_nr?.trim() || null,
      zip: row.zip?.trim() || null,
      city: sanitizeCsvValue(row.city?.trim() || '') || null,
      // Extended fields
      category: parseCategories(row.category),
      profession: sanitizeCsvValue(row.profession?.trim() || '') || null,
      language: row.language?.trim() || null,
      preferred_payment_method: row.preferred_payment_method?.trim() || null,
      faberid: row.faberid?.trim() || null,
      sari_faberid: row.sari_faberid?.trim() || null,
      sari_birthdate: parseDate(row.sari_birthdate),
      acquisition_source: sanitizeCsvValue(row.acquisition_source?.trim() || '') || null,
      referred_by_code: row.referred_by_code?.trim() || null,
      _metadata: Object.keys(metadata).length > 0 ? metadata : null,
    })
  })

  // ── Build lookup maps — ALL methods run in parallel ──────────────────────
  // Each match carries the existing user's role so privileged accounts
  // (admin/staff/super_admin) can be protected from CSV-driven overwrites.
  const existingByEmail = new Map<string, { id: string; role: string }>()
  const existingByPhone = new Map<string, { id: string; role: string }>()
  const existingByNameBirthdate = new Map<string, { id: string; role: string }>()
  const existingByLernfahrausweis = new Map<string, { id: string; role: string }>()

  const emailList = validRows.map(r => r.email).filter(Boolean) as string[]
  const phoneList = validRows.map(r => r.phone_normalized).filter(Boolean) as string[]
  const birthdateList = [...new Set(validRows.map(r => r.birthdate).filter(Boolean) as string[])]
  const nrList = validRows.map(r => r.lernfahrausweis_nr).filter(Boolean) as string[]

  // Phone matching requires re-normalizing every stored phone number, which
  // can't be pushed down into the query. Cap the scanned set so a huge
  // tenant can't turn every import into a full-table scan.
  const PHONE_SCAN_LIMIT = 20000

  await Promise.all([
    // Email lookup
    emailList.length > 0
      ? supabase.from('users').select('id, email, role').eq('tenant_id', profile.tenant_id).in('email', emailList)
          .then(({ data }) => { for (const u of data || []) if (u.email) existingByEmail.set(u.email.toLowerCase(), { id: u.id, role: u.role }) })
      : Promise.resolve(),

    // Phone lookup (fetch non-null phones up to a bounded limit, normalize & compare)
    phoneList.length > 0
      ? supabase.from('users').select('id, phone, role').eq('tenant_id', profile.tenant_id).not('phone', 'is', null).limit(PHONE_SCAN_LIMIT)
          .then(({ data }) => { for (const u of data || []) { const n = normalizePhone(u.phone); if (n && phoneList.includes(n)) existingByPhone.set(n, { id: u.id, role: u.role }) } })
      : Promise.resolve(),

    // Name + birthdate lookup (pre-filtered by birthdate)
    birthdateList.length > 0
      ? supabase.from('users').select('id, first_name, last_name, birthdate, role').eq('tenant_id', profile.tenant_id).in('birthdate', birthdateList)
          .then(({ data }) => { for (const u of data || []) { const k = nameKey(u.first_name, u.last_name, u.birthdate); if (k) existingByNameBirthdate.set(k, { id: u.id, role: u.role }) } })
      : Promise.resolve(),

    // Lernfahrausweis-Nr lookup
    nrList.length > 0
      ? supabase.from('users').select('id, lernfahrausweis_nr, role').eq('tenant_id', profile.tenant_id).in('lernfahrausweis_nr', nrList)
          .then(({ data }) => { for (const u of data || []) if (u.lernfahrausweis_nr) existingByLernfahrausweis.set(u.lernfahrausweis_nr, { id: u.id, role: u.role }) })
      : Promise.resolve(),
  ])

  // ── Fetch full existing records for supplement mode ───────────────────────
  // (needed to know which fields are already set)
  const existingRecordsById = new Map<string, any>()

  // ── Classify each row — check ALL methods, collect all matches ───────────
  const toInsert: any[] = []
  const toUpdate: { id: string; data: any; rowIndex: number; matchedOn: string; mode: DuplicateMode }[] = []

  for (const row of validRows) {
    const { _rowIndex, phone_normalized, phone_raw, name_key, _metadata, ...userData } = row

    // Collect all matches across all methods
    const matches: { id: string; via: string; role: string }[] = []
    if (row.email) { const m = existingByEmail.get(row.email); if (m) matches.push({ id: m.id, via: 'E-Mail', role: m.role }) }
    if (phone_normalized) { const m = existingByPhone.get(phone_normalized); if (m && !matches.find(x => x.id === m.id)) matches.push({ id: m.id, via: 'Telefon', role: m.role }) }
    if (name_key) { const m = existingByNameBirthdate.get(name_key); if (m && !matches.find(x => x.id === m.id)) matches.push({ id: m.id, via: 'Name+Geburtsdatum', role: m.role }) }
    if (row.lernfahrausweis_nr) { const m = existingByLernfahrausweis.get(row.lernfahrausweis_nr); if (m && !matches.find(x => x.id === m.id)) matches.push({ id: m.id, via: 'Lernfahrausweis-Nr', role: m.role }) }

    const identifier = row.email || phone_raw || row.lernfahrausweis_nr || `${row.first_name} ${row.last_name}`

    // Different match methods disagreeing on WHICH existing user this row
    // belongs to is ambiguous — silently picking one risks merging/overwriting
    // the wrong account. Flag for manual review instead.
    const distinctIds = new Set(matches.map(m => m.id))
    if (distinctIds.size > 1) {
      skippedCount++
      errorsLog.push({
        row: _rowIndex,
        identifier,
        reason: `Uneindeutiger Treffer: mehrere unterschiedliche bestehende Nutzer gefunden (${matches.map(m => m.via).join(', ')}) — bitte manuell prüfen`,
      })
      continue
    }

    // Use first/best match as the canonical existing record
    const existingId = matches[0]?.id
    const existingRole = matches[0]?.role
    const matchedOn = matches.map(m => m.via).join(', ')

    const insertData = {
      ...userData,
      phone: phone_raw,
      ...(_metadata ? { metadata: _metadata } : {}),
    }

    // Per-row action overrides the global duplicateMode
    const effectiveMode: DuplicateMode = existingId
      ? ((rowActions[_rowIndex] as DuplicateMode) || duplicateMode)
      : duplicateMode

    // Never let a CSV row overwrite/supplement a privileged account
    // (admin/staff/super_admin) — those aren't "customers" and shouldn't be
    // mutated by a bulk customer import.
    if (existingId && existingRole && existingRole !== 'client' && effectiveMode !== 'create') {
      skippedCount++
      errorsLog.push({ row: _rowIndex, identifier, reason: `Treffer via ${matchedOn} ist ein ${existingRole}-Konto — aus Sicherheitsgründen nicht überschrieben` })
      continue
    }

    if (existingId && effectiveMode !== 'create') {
      if (effectiveMode === 'skip') {
        skippedCount++
        errorsLog.push({ row: _rowIndex, identifier, reason: `Bereits vorhanden via ${matchedOn} (übersprungen)` })
      } else {
        toUpdate.push({ id: existingId, data: insertData, rowIndex: _rowIndex, matchedOn, mode: effectiveMode })
      }
    } else {
      // No match found, OR effectiveMode === 'create' (always insert)
      toInsert.push({
        ...insertData,
        role: 'client',
        tenant_id: profile.tenant_id,
        is_active: true,
      })
    }
  }

  // ── For supplement mode: fetch existing records to compare ────────────────
  // Checked per-row (not just the global duplicateMode) because a per-row
  // action override (rowActions) can set an individual row to 'supplement'
  // even when the global mode is something else — without this, those rows'
  // existing data would look empty and get fully overwritten instead of
  // supplemented.
  if (toUpdate.some(r => r.mode === 'supplement')) {
    const ids = toUpdate.map(r => r.id)
    const { data: existingData } = await supabase
      .from('users')
      .select('id, email, phone, birthdate, street, street_nr, zip, city, lernfahrausweis_nr, category, profession, language, preferred_payment_method, faberid, sari_faberid, sari_birthdate, acquisition_source, referred_by_code, metadata')
      .in('id', ids)
    for (const u of existingData || []) {
      existingRecordsById.set(u.id, u)
    }
  }

  // ── Dry-run: return classification without writing ────────────────────────
  if (dryRun) {
    const actionLabel: Record<DuplicateMode, string> = {
      skip: 'Überspringen',
      overwrite: 'Überschreiben',
      supplement: 'Ergänzen',
      create: 'Neu anlegen',
    }

    const duplicateDetails = [
      ...toUpdate.map(r => ({
        row: r.rowIndex,
        identifier: r.data.email || r.data.phone || `${r.data.first_name} ${r.data.last_name}`,
        matchedOn: r.matchedOn,
        action: actionLabel[r.mode],
      })),
      ...errorsLog
        .filter(e => e.reason.includes('Bereits vorhanden'))
        .map(e => ({
          row: e.row,
          identifier: e.identifier,
          matchedOn: e.reason.match(/via (.+?) \(/)?.[1] || '',
          action: actionLabel['skip'],
        })),
    ].sort((a, b) => a.row - b.row)

    return {
      dryRun: true,
      totalRows: validRows.length,
      newCount: toInsert.length,
      duplicateCount: toUpdate.length + skippedCount,
      invalidCount: errorsLog.filter(e => !e.reason.includes('Bereits vorhanden')).length,
      duplicates: duplicateDetails,
      invalids: errorsLog.filter(e => !e.reason.includes('Bereits vorhanden')).slice(0, 50),
    }
  }

  // ── Batch insert ──────────────────────────────────────────────────────────
  const BATCH_SIZE = 500
  for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
    const batch = toInsert.slice(i, i + BATCH_SIZE)
    const { data: inserted, error: insertError } = await supabase
      .from('users')
      .insert(batch)
      .select('id')

    if (insertError) {
      logger.error('❌ Batch insert error:', insertError)
      batch.forEach((r, idx) => {
        errorsLog.push({ row: i + idx + 2, identifier: r.email || r.phone || '–', reason: insertError.message })
      })
    } else {
      importedCount += inserted?.length ?? 0
    }
  }

  // ── Update existing records ───────────────────────────────────────────────
  for (const { id, data, rowIndex, matchedOn, mode } of toUpdate) {
    let updatePayload: Record<string, any>

    if (mode === 'supplement') {
      // Only set fields that are currently NULL/empty in the existing record
      const existing = existingRecordsById.get(id) || {}
      updatePayload = {}
      const SUPPLEMENTABLE = [
        'first_name', 'last_name', 'phone', 'birthdate', 'street', 'street_nr', 'zip', 'city',
        'lernfahrausweis_nr', 'category', 'profession', 'language', 'preferred_payment_method',
        'faberid', 'sari_faberid', 'sari_birthdate', 'acquisition_source', 'referred_by_code',
      ] as const
      for (const field of SUPPLEMENTABLE) {
        const incomingVal = field === 'phone' ? data.phone : data[field]
        const existingVal = existing[field]
        // Only update if existing is null/empty AND incoming has a value
        if ((existingVal === null || existingVal === undefined || existingVal === '' ||
             (Array.isArray(existingVal) && existingVal.length === 0)) && incomingVal) {
          updatePayload[field] = incomingVal
        }
      }
      // Supplement metadata: merge new keys into existing JSONB (don't overwrite existing keys)
      if (data.metadata && typeof data.metadata === 'object') {
        const existingMeta = existing.metadata || {}
        const mergedMeta = { ...data.metadata, ...existingMeta } // existing keys take priority
        if (JSON.stringify(mergedMeta) !== JSON.stringify(existingMeta)) {
          updatePayload.metadata = mergedMeta
        }
      }
      if (Object.keys(updatePayload).length === 0) {
        // Nothing to supplement — skip
        skippedCount++
        errorsLog.push({ row: rowIndex, identifier: data.email || data.phone || '–', reason: `Bereits vorhanden via ${matchedOn} — keine neuen Felder zum Ergänzen` })
        continue
      }
    } else {
      // overwrite: replace all fields with incoming values
      updatePayload = {
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone,
        birthdate: data.birthdate,
        street: data.street,
        street_nr: data.street_nr,
        zip: data.zip,
        city: data.city,
        ...(data.lernfahrausweis_nr != null ? { lernfahrausweis_nr: data.lernfahrausweis_nr } : {}),
        ...(data.category != null ? { category: data.category } : {}),
        ...(data.profession != null ? { profession: data.profession } : {}),
        ...(data.language != null ? { language: data.language } : {}),
        ...(data.preferred_payment_method != null ? { preferred_payment_method: data.preferred_payment_method } : {}),
        ...(data.faberid != null ? { faberid: data.faberid } : {}),
        ...(data.sari_faberid != null ? { sari_faberid: data.sari_faberid } : {}),
        ...(data.sari_birthdate != null ? { sari_birthdate: data.sari_birthdate } : {}),
        ...(data.acquisition_source != null ? { acquisition_source: data.acquisition_source } : {}),
        ...(data.referred_by_code != null ? { referred_by_code: data.referred_by_code } : {}),
        ...(data.metadata != null ? { metadata: data.metadata } : {}),
      }
    }

    const { error: updateError } = await supabase
      .from('users')
      .update(updatePayload)
      .eq('id', id)
      .eq('tenant_id', profile.tenant_id)

    if (updateError) {
      errorsLog.push({ row: rowIndex, identifier: data.email || data.phone || '–', reason: updateError.message })
    } else {
      updatedCount++
      logger.debug(`✏️ ${mode === 'supplement' ? 'Supplemented' : 'Overwrote'} user ${id} matched via ${matchedOn} (fields: ${Object.keys(updatePayload).join(', ')})`)
    }
  }

  logger.debug(`✅ Import done: ${importedCount} inserted, ${updatedCount} updated, ${skippedCount} skipped, ${errorsLog.length} errors`)

  return {
    success: true,
    importedCount,
    updatedCount,
    skippedCount,
    errorCount: errorsLog.length,
    errors: errorsLog.slice(0, 100),
  }
})
