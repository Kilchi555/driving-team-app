import { defineEventHandler, readBody, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
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
}

/**
 * skip        – leave existing record untouched, discard CSV row
 * overwrite   – replace all fields in existing record with CSV values
 * supplement  – only fill fields that are currently NULL/empty in the existing record
 * create      – always insert as a new record, even if a match is found
 */
type DuplicateMode = 'skip' | 'overwrite' | 'supplement' | 'create'

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
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
  const profile = await requireAdminProfile(event)
  const body = await readBody(event)
  const {
    rows,
    duplicateMode = 'skip',
    rowActions = {},
    dryRun = false,
  } = body as {
    rows: UserRow[]
    duplicateMode?: DuplicateMode
    rowActions?: Record<number, DuplicateMode>
    dryRun?: boolean
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
    const firstName = row.first_name?.trim() || ''
    const lastName = row.last_name?.trim() || ''
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
      street: row.street?.trim() || null,
      street_nr: row.street_nr?.trim() || null,
      zip: row.zip?.trim() || null,
      city: row.city?.trim() || null,
    })
  })

  // ── Build lookup maps — ALL methods run in parallel ──────────────────────
  const existingByEmail = new Map<string, string>()
  const existingByPhone = new Map<string, string>()
  const existingByNameBirthdate = new Map<string, string>()
  const existingByLernfahrausweis = new Map<string, string>()

  const emailList = validRows.map(r => r.email).filter(Boolean) as string[]
  const phoneList = validRows.map(r => r.phone_normalized).filter(Boolean) as string[]
  const birthdateList = [...new Set(validRows.map(r => r.birthdate).filter(Boolean) as string[])]
  const nrList = validRows.map(r => r.lernfahrausweis_nr).filter(Boolean) as string[]

  await Promise.all([
    // Email lookup
    emailList.length > 0
      ? supabase.from('users').select('id, email').eq('tenant_id', profile.tenant_id).in('email', emailList)
          .then(({ data }) => { for (const u of data || []) if (u.email) existingByEmail.set(u.email.toLowerCase(), u.id) })
      : Promise.resolve(),

    // Phone lookup (fetch all non-null phones, normalize & compare)
    phoneList.length > 0
      ? supabase.from('users').select('id, phone').eq('tenant_id', profile.tenant_id).not('phone', 'is', null)
          .then(({ data }) => { for (const u of data || []) { const n = normalizePhone(u.phone); if (n && phoneList.includes(n)) existingByPhone.set(n, u.id) } })
      : Promise.resolve(),

    // Name + birthdate lookup (pre-filtered by birthdate)
    birthdateList.length > 0
      ? supabase.from('users').select('id, first_name, last_name, birthdate').eq('tenant_id', profile.tenant_id).in('birthdate', birthdateList)
          .then(({ data }) => { for (const u of data || []) { const k = nameKey(u.first_name, u.last_name, u.birthdate); if (k) existingByNameBirthdate.set(k, u.id) } })
      : Promise.resolve(),

    // Lernfahrausweis-Nr lookup
    nrList.length > 0
      ? supabase.from('users').select('id, lernfahrausweis_nr').eq('tenant_id', profile.tenant_id).in('lernfahrausweis_nr', nrList)
          .then(({ data }) => { for (const u of data || []) if (u.lernfahrausweis_nr) existingByLernfahrausweis.set(u.lernfahrausweis_nr, u.id) })
      : Promise.resolve(),
  ])

  // ── Fetch full existing records for supplement mode ───────────────────────
  // (needed to know which fields are already set)
  const existingRecordsById = new Map<string, any>()
  if (duplicateMode === 'supplement' || dryRun) {
    // We'll fetch lazily per matched ID below — collected first
  }

  // ── Classify each row — check ALL methods, collect all matches ───────────
  const toInsert: any[] = []
  const toUpdate: { id: string; data: any; rowIndex: number; matchedOn: string; mode: DuplicateMode }[] = []

  for (const row of validRows) {
    const { _rowIndex, phone_normalized, phone_raw, name_key, ...userData } = row

    // Collect all matches across all methods
    const matches: { id: string; via: string }[] = []
    if (row.email) { const id = existingByEmail.get(row.email); if (id) matches.push({ id, via: 'E-Mail' }) }
    if (phone_normalized) { const id = existingByPhone.get(phone_normalized); if (id && !matches.find(m => m.id === id)) matches.push({ id, via: 'Telefon' }) }
    if (name_key) { const id = existingByNameBirthdate.get(name_key); if (id && !matches.find(m => m.id === id)) matches.push({ id, via: 'Name+Geburtsdatum' }) }
    if (row.lernfahrausweis_nr) { const id = existingByLernfahrausweis.get(row.lernfahrausweis_nr); if (id && !matches.find(m => m.id === id)) matches.push({ id, via: 'Lernfahrausweis-Nr' }) }

    // Use first/best match as the canonical existing record
    const existingId = matches[0]?.id
    const matchedOn = matches.map(m => m.via).join(', ')

    const insertData = { ...userData, phone: phone_raw }
    const identifier = row.email || phone_raw || row.lernfahrausweis_nr || `${row.first_name} ${row.last_name}`

    // Per-row action overrides the global duplicateMode
    const effectiveMode: DuplicateMode = existingId
      ? ((rowActions[_rowIndex] as DuplicateMode) || duplicateMode)
      : duplicateMode

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
  if (duplicateMode === 'supplement' && toUpdate.length > 0) {
    const ids = toUpdate.map(r => r.id)
    const { data: existingData } = await supabase
      .from('users')
      .select('id, email, phone, birthdate, street, street_nr, zip, city, lernfahrausweis_nr')
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
      const SUPPLEMENTABLE = ['first_name', 'last_name', 'phone', 'birthdate', 'street', 'street_nr', 'zip', 'city', 'lernfahrausweis_nr'] as const
      for (const field of SUPPLEMENTABLE) {
        const incomingVal = field === 'phone' ? data.phone : data[field]
        const existingVal = existing[field]
        // Only update if existing is null/empty AND incoming has a value
        if ((existingVal === null || existingVal === undefined || existingVal === '') && incomingVal) {
          updatePayload[field] = incomingVal
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
        ...(data.lernfahrausweis_nr ? { lernfahrausweis_nr: data.lernfahrausweis_nr } : {}),
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
