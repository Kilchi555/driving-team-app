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
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

/** Normalize phone to digits only for dedup comparison (keeps + prefix) */
function normalizePhone(raw: string | undefined | null): string | null {
  if (!raw) return null
  // Strip spaces, dashes, dots, parentheses
  const cleaned = raw.trim().replace(/[\s\-.()/]/g, '')
  if (cleaned.length < 7) return null
  // Normalize Swiss 07x → +417x
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

/**
 * POST /api/admin/import-users
 * Bulk-import rows from a parsed CSV/XLSX into the users table as role='client'.
 *
 * Body:
 *   rows          – array of mapped user objects
 *   duplicateMode – 'skip' | 'update'  (default: 'skip')
 *   dedupKey      – 'email' | 'phone' | 'email_or_phone'  (default: 'email_or_phone')
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
    dedupKey?: 'email' | 'phone' | 'email_or_phone'
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

  // Validate and normalize incoming rows
  const validRows: any[] = []
  rows.forEach((row, index) => {
    const email = (row.email || '').trim().toLowerCase() || null
    const firstName = row.first_name?.trim() || ''
    const lastName = row.last_name?.trim() || ''
    const phone = normalizePhone(row.phone)

    // DB NOT NULL: first_name or last_name required
    if (!firstName && !lastName) {
      errorsLog.push({ row: index + 2, identifier: email || phone || '–', reason: 'Vor- oder Nachname fehlt (DB NOT NULL)' })
      return
    }

    // Invalid email format → skip
    if (email && !isValidEmail(email)) {
      errorsLog.push({ row: index + 2, identifier: row.email || '', reason: 'Ungültige E-Mail-Adresse' })
      return
    }

    validRows.push({
      _rowIndex: index + 2,
      email,
      phone,               // normalized
      phone_raw: row.phone?.trim() || null,  // for insert
      first_name: firstName,
      last_name: lastName,
      birthdate: parseDate(row.birthdate),
      street: row.street?.trim() || null,
      street_nr: row.street_nr?.trim() || null,
      zip: row.zip?.trim() || null,
      city: row.city?.trim() || null,
    })
  })

  // ── Build lookup maps from existing users ─────────────────────────────────
  const existingByEmail = new Map<string, string>()  // email → user_id
  const existingByPhone = new Map<string, string>()  // normalized phone → user_id

  const useEmail = dedupKey === 'email' || dedupKey === 'email_or_phone'
  const usePhone = dedupKey === 'phone' || dedupKey === 'email_or_phone'

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
    const phoneList = validRows.map(r => r.phone).filter(Boolean) as string[]
    if (phoneList.length > 0) {
      // Fetch all users with a phone in this tenant, then normalize & compare
      // (We can't do the normalization in SQL easily, so we fetch candidates and normalize)
      const { data } = await supabase
        .from('users')
        .select('id, phone')
        .eq('tenant_id', profile.tenant_id)
        .not('phone', 'is', null)
      for (const u of data || []) {
        const norm = normalizePhone(u.phone)
        if (norm && phoneList.includes(norm)) {
          existingByPhone.set(norm, u.id)
        }
      }
    }
  }

  // ── Classify rows: insert vs update ──────────────────────────────────────
  const toInsert: any[] = []
  const toUpdate: { id: string; data: any; rowIndex: number; matchedOn: string }[] = []

  for (const row of validRows) {
    const { _rowIndex, phone, phone_raw, ...userData } = row

    // Find existing by configured dedup key(s)
    let existingId: string | undefined
    let matchedOn = ''

    if (useEmail && row.email) {
      existingId = existingByEmail.get(row.email)
      if (existingId) matchedOn = 'E-Mail'
    }
    if (!existingId && usePhone && phone) {
      existingId = existingByPhone.get(phone)
      if (existingId) matchedOn = 'Telefon'
    }

    if (existingId) {
      if (duplicateMode === 'update') {
        toUpdate.push({ id: existingId, data: { ...userData, phone: phone_raw }, rowIndex: _rowIndex, matchedOn })
      } else {
        skippedCount++
        errorsLog.push({
          row: _rowIndex,
          identifier: row.email || phone_raw || '–',
          reason: `Bereits vorhanden via ${matchedOn} (übersprungen)`,
        })
      }
    } else {
      toInsert.push({
        ...userData,
        phone: phone_raw,
        role: 'client',
        tenant_id: profile.tenant_id,
        is_active: true,
      })
    }
  }

  // ── Batch insert (500 per chunk) ──────────────────────────────────────────
  const BATCH_SIZE = 500
  for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
    const batch = toInsert.slice(i, i + BATCH_SIZE)
    const { data: inserted, error: insertError } = await supabase
      .from('users')
      .insert(batch)
      .select('id')

    if (insertError) {
      logger.error('❌ Batch insert error:', insertError)
      batch.forEach((r, batchIdx) => {
        errorsLog.push({ row: i + batchIdx + 2, identifier: r.email || r.phone || '–', reason: insertError.message })
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

  logger.debug(`✅ User import done: ${importedCount} inserted, ${updatedCount} updated, ${skippedCount} skipped, ${errorsLog.length} errors`)

  return {
    success: true,
    importedCount,
    updatedCount,
    skippedCount,
    errorCount: errorsLog.length,
    errors: errorsLog.slice(0, 100),
  }
})
