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

type DedupKey = 'email' | 'phone' | 'email_or_phone' | 'name_birthdate' | 'lernfahrausweis'

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
 * Body:
 *   rows          – array of mapped user objects
 *   duplicateMode – 'skip' | 'update'
 *   dedupKey      – 'email' | 'phone' | 'email_or_phone' | 'name_birthdate' | 'lernfahrausweis'
 */
export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const body = await readBody(event)
  const {
    rows,
    duplicateMode = 'skip',
    dedupKey = 'email_or_phone',
  } = body as {
    rows: UserRow[]
    duplicateMode?: 'skip' | 'update'
    dedupKey?: DedupKey
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

  // ── Build lookup maps from existing DB users ──────────────────────────────
  const existingByEmail = new Map<string, string>()
  const existingByPhone = new Map<string, string>()
  const existingByNameBirthdate = new Map<string, string>()
  const existingByLernfahrausweis = new Map<string, string>()

  const useEmail = ['email', 'email_or_phone'].includes(dedupKey)
  const usePhone = ['phone', 'email_or_phone'].includes(dedupKey)
  const useNameBirthdate = dedupKey === 'name_birthdate'
  const useLernfahrausweis = dedupKey === 'lernfahrausweis'

  if (useEmail) {
    const emailList = validRows.map(r => r.email).filter(Boolean) as string[]
    if (emailList.length > 0) {
      const { data } = await supabase
        .from('users')
        .select('id, email')
        .eq('tenant_id', profile.tenant_id)
        .in('email', emailList)
      for (const u of data || []) {
        if (u.email) existingByEmail.set(u.email.toLowerCase(), u.id)
      }
    }
  }

  if (usePhone) {
    const phoneList = validRows.map(r => r.phone_normalized).filter(Boolean) as string[]
    if (phoneList.length > 0) {
      const { data } = await supabase
        .from('users')
        .select('id, phone')
        .eq('tenant_id', profile.tenant_id)
        .not('phone', 'is', null)
      for (const u of data || []) {
        const norm = normalizePhone(u.phone)
        if (norm && phoneList.includes(norm)) existingByPhone.set(norm, u.id)
      }
    }
  }

  if (useNameBirthdate) {
    const birthdateList = validRows.map(r => r.birthdate).filter(Boolean) as string[]
    if (birthdateList.length > 0) {
      // Fetch users with a matching birthdate (already a significant filter)
      const { data } = await supabase
        .from('users')
        .select('id, first_name, last_name, birthdate')
        .eq('tenant_id', profile.tenant_id)
        .in('birthdate', birthdateList)
      for (const u of data || []) {
        const key = nameKey(u.first_name, u.last_name, u.birthdate)
        if (key) existingByNameBirthdate.set(key, u.id)
      }
    }
  }

  if (useLernfahrausweis) {
    const nrList = validRows.map(r => r.lernfahrausweis_nr).filter(Boolean) as string[]
    if (nrList.length > 0) {
      const { data } = await supabase
        .from('users')
        .select('id, lernfahrausweis_nr')
        .eq('tenant_id', profile.tenant_id)
        .in('lernfahrausweis_nr', nrList)
      for (const u of data || []) {
        if (u.lernfahrausweis_nr) existingByLernfahrausweis.set(u.lernfahrausweis_nr, u.id)
      }
    }
  }

  // ── Classify each row ─────────────────────────────────────────────────────
  const toInsert: any[] = []
  const toUpdate: { id: string; data: any; rowIndex: number; matchedOn: string }[] = []

  for (const row of validRows) {
    const { _rowIndex, phone_normalized, phone_raw, name_key, ...userData } = row

    let existingId: string | undefined
    let matchedOn = ''

    if (useEmail && row.email) {
      existingId = existingByEmail.get(row.email)
      if (existingId) matchedOn = 'E-Mail'
    }
    if (!existingId && usePhone && phone_normalized) {
      existingId = existingByPhone.get(phone_normalized)
      if (existingId) matchedOn = 'Telefon'
    }
    if (!existingId && useNameBirthdate && name_key) {
      existingId = existingByNameBirthdate.get(name_key)
      if (existingId) matchedOn = 'Name + Geburtsdatum'
    }
    if (!existingId && useLernfahrausweis && row.lernfahrausweis_nr) {
      existingId = existingByLernfahrausweis.get(row.lernfahrausweis_nr)
      if (existingId) matchedOn = 'Lernfahrausweis-Nr'
    }

    const insertData = { ...userData, phone: phone_raw }

    if (existingId) {
      if (duplicateMode === 'update') {
        toUpdate.push({ id: existingId, data: insertData, rowIndex: _rowIndex, matchedOn })
      } else {
        skippedCount++
        errorsLog.push({
          row: _rowIndex,
          identifier: row.email || phone_raw || row.lernfahrausweis_nr || `${row.first_name} ${row.last_name}`,
          reason: `Bereits vorhanden via ${matchedOn} (übersprungen)`,
        })
      }
    } else {
      toInsert.push({
        ...insertData,
        role: 'client',
        tenant_id: profile.tenant_id,
        is_active: true,
      })
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
  for (const { id, data, rowIndex, matchedOn } of toUpdate) {
    const { error: updateError } = await supabase
      .from('users')
      .update({
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone,
        birthdate: data.birthdate,
        street: data.street,
        street_nr: data.street_nr,
        zip: data.zip,
        city: data.city,
        ...(data.lernfahrausweis_nr ? { lernfahrausweis_nr: data.lernfahrausweis_nr } : {}),
      })
      .eq('id', id)
      .eq('tenant_id', profile.tenant_id)

    if (updateError) {
      errorsLog.push({ row: rowIndex, identifier: data.email || data.phone || '–', reason: updateError.message })
    } else {
      updatedCount++
      logger.debug(`✏️ Updated user ${id} matched via ${matchedOn}`)
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
