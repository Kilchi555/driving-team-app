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

function parseDate(value: string | undefined): string | null {
  if (!value) return null
  const cleaned = value.trim()
  // Support DD.MM.YYYY, YYYY-MM-DD, MM/DD/YYYY
  const formats = [
    /^(\d{2})\.(\d{2})\.(\d{4})$/, // DD.MM.YYYY
    /^(\d{4})-(\d{2})-(\d{2})$/,   // YYYY-MM-DD
    /^(\d{2})\/(\d{2})\/(\d{4})$/, // MM/DD/YYYY
  ]
  for (const fmt of formats) {
    const m = cleaned.match(fmt)
    if (m) {
      // Normalize to YYYY-MM-DD
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
 */
export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const body = await readBody(event)
  const { rows, duplicateMode = 'skip' } = body as {
    rows: UserRow[]
    duplicateMode?: 'skip' | 'update'
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'rows array is required and must not be empty' })
  }
  if (rows.length > 5000) {
    throw createError({ statusCode: 400, statusMessage: 'Max 5,000 rows per import' })
  }

  const supabase = getSupabaseAdmin()

  const errorsLog: { row: number; email: string; reason: string }[] = []
  let importedCount = 0
  let skippedCount = 0
  let updatedCount = 0

  // Validate and normalize
  const validRows: any[] = []
  rows.forEach((row, index) => {
    // DB-seitige NOT NULL Felder: first_name und last_name
    // email ist nullable in der DB, aber wir warnen wenn fehlend
    const email = (row.email || '').trim().toLowerCase()
    const firstName = row.first_name?.trim() || ''
    const lastName = row.last_name?.trim() || ''

    if (!firstName && !lastName) {
      errorsLog.push({ row: index + 2, email: email || '(keine Email)', reason: 'Vor- oder Nachname erforderlich (DB NOT NULL)' })
      return
    }

    // Warn (as skipped) if email is invalid but don't block if it's empty — email is nullable in DB
    if (email && !isValidEmail(email)) {
      errorsLog.push({ row: index + 2, email: row.email || '', reason: 'Ungültige E-Mail-Adresse (übersprungen)' })
      return
    }

    validRows.push({
      _rowIndex: index + 2,
      email: email || null,
      first_name: firstName,
      last_name: lastName,
      phone: row.phone?.trim() || null,
      birthdate: parseDate(row.birthdate),
      street: row.street?.trim() || null,
      street_nr: row.street_nr?.trim() || null,
      zip: row.zip?.trim() || null,
      city: row.city?.trim() || null,
    })
  })

  // Fetch existing emails for this tenant in one query (only for rows that have an email)
  const emailList = validRows.map(r => r.email).filter(Boolean) as string[]
  const existingByEmail = new Map<string, string>()
  if (emailList.length > 0) {
    const { data: existingUsers } = await supabase
      .from('users')
      .select('id, email')
      .eq('tenant_id', profile.tenant_id)
      .in('email', emailList)
    for (const u of existingUsers || []) {
      if (u.email) existingByEmail.set(u.email, u.id)
    }
  }

  const toInsert: any[] = []
  const toUpdate: { id: string; data: any; rowIndex: number }[] = []

  for (const row of validRows) {
    const { _rowIndex, ...userData } = row
    const existingId = row.email ? existingByEmail.get(row.email) : undefined

    if (existingId) {
      if (duplicateMode === 'update') {
        toUpdate.push({ id: existingId, data: userData, rowIndex: _rowIndex })
      } else {
        skippedCount++
        errorsLog.push({ row: _rowIndex, email: row.email, reason: 'Bereits vorhanden (übersprungen)' })
      }
    } else {
      toInsert.push({
        ...userData,
        role: 'client',
        tenant_id: profile.tenant_id,
        is_active: true,
      })
    }
  }

  // Batch insert new users (500 per batch)
  const BATCH_SIZE = 500
  for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
    const batch = toInsert.slice(i, i + BATCH_SIZE)
    const { data: inserted, error: insertError } = await supabase
      .from('users')
      .insert(batch)
      .select('id')

    if (insertError) {
      logger.error('❌ Batch insert error:', insertError)
      // Log each row in this batch as error
      batch.forEach((_, batchIdx) => {
        errorsLog.push({
          row: i + batchIdx + 2,
          email: batch[batchIdx]?.email || '',
          reason: insertError.message,
        })
      })
    } else {
      importedCount += inserted?.length ?? 0
    }
  }

  // Update existing users if duplicateMode === 'update'
  for (const { id, data, rowIndex } of toUpdate) {
    const { error: updateError } = await supabase
      .from('users')
      .update({
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone,
        birth_date: data.birth_date,
        street: data.street,
        street_nr: data.street_nr,
        zip: data.zip,
        city: data.city,
      })
      .eq('id', id)
      .eq('tenant_id', profile.tenant_id)

    if (updateError) {
      errorsLog.push({ row: rowIndex, email: data.email, reason: updateError.message })
    } else {
      updatedCount++
    }
  }

  logger.debug(`✅ User import complete: ${importedCount} inserted, ${updatedCount} updated, ${skippedCount} skipped, ${errorsLog.length} errors`)

  return {
    success: true,
    importedCount,
    updatedCount,
    skippedCount,
    errorCount: errorsLog.length,
    errors: errorsLog.slice(0, 100),
  }
})
