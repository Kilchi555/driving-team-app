import { defineEventHandler, readBody, createError, getRequestHeader } from 'h3'
import { requireAdminOnly } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { logger } from '~/utils/logger'
import {
  CUSTOMER_IMPORT_BATCH_SIZE,
  accountPlannedRows,
  accountingBalances,
  dryRunDuplicates,
  failedRows,
  nameKey,
  normalizePhone,
  parseImportDate,
  planCustomerImport,
  refineSupplementPlans,
  sanitizeImportText,
  settleInsertBatch,
  updatePayloadIsSafe,
  type CustomerImportLookups,
  type CustomerImportRawRow,
  type InsertPlan,
  type PlannedRow,
  type UpdatePlan,
} from '~/server/utils/customer-import'

/**
 * POST /api/admin/import-users
 *
 * Normalization, validation, file-internal duplicates and language handling
 * live in customer-import.ts. Dry-run and execute use that same plan.
 * Dry-run returns before any insert into public.users. The rate-limit log
 * write above is existing global infrastructure and still runs.
 *
 * tenant_id and role are server-derived. auth_user_id is never taken from
 * the client. Updates stay scoped to profile.tenant_id.
 */
export default defineEventHandler(async (event) => {
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
    rows: CustomerImportRawRow[]
    duplicateMode?: string
    rowActions?: Record<number, string>
    dryRun?: boolean
    metadataFields?: string[]
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'rows array is required and must not be empty' })
  }
  if (rows.length > 5000) {
    throw createError({ statusCode: 400, statusMessage: 'Max 5,000 rows per import' })
  }

  const supabase = getSupabaseAdmin()
  const lookups = await loadLookups(supabase, rows, profile.tenant_id)
  const paymentCodes = await loadPaymentCodes(supabase, rows)

  let planned = planCustomerImport({
    rows,
    tenantId: profile.tenant_id,
    duplicateMode,
    rowActions,
    metadataFields,
    lookups,
    paymentCodes,
  })
  planned = await applySupplement(supabase, planned, lookups, profile.tenant_id)

  if (dryRun) {
    const accounting = accountPlannedRows(planned)
    const review = dryRunDuplicates(planned)
    return {
      dryRun: true,
      total: accounting.total,
      created: accounting.created,
      updated: accounting.updated,
      skipped: accounting.skipped,
      failed: accounting.failed,
      // Subset of skipped. The review array below keeps the name `duplicates`
      // for the existing table and may also list planned updates.
      skippedDuplicates: accounting.duplicates,
      totalRows: accounting.total,
      newCount: accounting.created,
      duplicateCount: review.length,
      invalidCount: accounting.failed,
      duplicates: review,
      invalids: failedRows(planned, 50),
    }
  }

  const inserts = planned.filter((row): row is InsertPlan => row.kind === 'insert')
  const insertOutcomes: PlannedRow[] = []
  for (let offset = 0; offset < inserts.length; offset += CUSTOMER_IMPORT_BATCH_SIZE) {
    const batch = inserts.slice(offset, offset + CUSTOMER_IMPORT_BATCH_SIZE)
    const { data: inserted, error: insertError } = await supabase
      .from('users')
      .insert(batch.map(row => row.record))
      .select('id')

    const outcome = settleInsertBatch(batch, {
      error: !!insertError,
      insertedCount: inserted?.length ?? 0,
      message: insertError?.message,
    })
    if (outcome.created === 0) {
      logger.error('Customer import batch rejected:', insertError?.message || 'insert result did not cover the batch')
    }
    insertOutcomes.push(...outcome.rows)
  }

  const otherOutcomes: PlannedRow[] = []
  for (const row of planned) {
    if (row.kind === 'insert') continue
    if (row.kind !== 'update') {
      otherOutcomes.push(row)
      continue
    }
    otherOutcomes.push(await applyUpdate(supabase, row, profile.tenant_id))
  }

  return responseFrom([...insertOutcomes, ...otherOutcomes])
})

async function loadLookups(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  rows: CustomerImportRawRow[],
  tenantId: string,
): Promise<CustomerImportLookups> {
  const existingByEmail = new Map<string, { id: string; role: string }>()
  const existingByPhone = new Map<string, { id: string; role: string }>()
  const existingByNameBirthdate = new Map<string, { id: string; role: string }>()
  const existingByLernfahrausweis = new Map<string, { id: string; role: string }>()

  const emailList = [...new Set(rows.map(row => (row.email || '').trim().toLowerCase()).filter(Boolean))]
  const phoneList = [...new Set(rows.map(row => normalizePhone(row.phone)).filter((phone): phone is string => !!phone))]
  const phoneSet = new Set(phoneList)
  const birthdateList = [...new Set(rows.map(row => parseImportDate(row.birthdate)).filter((value): value is string => !!value))]
  const nrList = [...new Set(rows.map(row => {
    const trimmed = row.lernfahrausweis_nr?.trim()
    return trimmed ? sanitizeImportText(trimmed) : ''
  }).filter(Boolean))]
  const PHONE_SCAN_LIMIT = 20000

  await Promise.all([
    emailList.length > 0
      ? supabase.from('users').select('id, email, role').eq('tenant_id', tenantId).in('email', emailList)
          .then(({ data }) => {
            for (const user of data || []) {
              if (user.email) existingByEmail.set(user.email.toLowerCase(), { id: user.id, role: user.role })
            }
          })
      : Promise.resolve(),
    phoneList.length > 0
      ? supabase.from('users').select('id, phone, role').eq('tenant_id', tenantId).not('phone', 'is', null).limit(PHONE_SCAN_LIMIT)
          .then(({ data }) => {
            for (const user of data || []) {
              const phone = normalizePhone(user.phone)
              if (phone && phoneSet.has(phone)) existingByPhone.set(phone, { id: user.id, role: user.role })
            }
          })
      : Promise.resolve(),
    birthdateList.length > 0
      ? supabase.from('users').select('id, first_name, last_name, birthdate, role').eq('tenant_id', tenantId).in('birthdate', birthdateList)
          .then(({ data }) => {
            for (const user of data || []) {
              const key = nameKey(user.first_name, user.last_name, user.birthdate)
              if (key) existingByNameBirthdate.set(key, { id: user.id, role: user.role })
            }
          })
      : Promise.resolve(),
    nrList.length > 0
      ? supabase.from('users').select('id, lernfahrausweis_nr, role').eq('tenant_id', tenantId).in('lernfahrausweis_nr', nrList)
          .then(({ data }) => {
            for (const user of data || []) {
              if (user.lernfahrausweis_nr) existingByLernfahrausweis.set(user.lernfahrausweis_nr, { id: user.id, role: user.role })
            }
          })
      : Promise.resolve(),
  ])

  return {
    byEmail: existingByEmail,
    byPhone: existingByPhone,
    byNameBirthdate: existingByNameBirthdate,
    byLernfahrausweis: existingByLernfahrausweis,
  }
}

async function loadPaymentCodes(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  rows: CustomerImportRawRow[],
): Promise<Set<string> | null | undefined> {
  const needsPayment = rows.some(row => !!row.preferred_payment_method?.trim())
  if (!needsPayment) return undefined
  const { data, error } = await supabase.from('payment_methods').select('method_code')
  if (error) return null
  return new Set((data || []).map(row => row.method_code).filter((code): code is string => !!code))
}

async function applySupplement(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  planned: PlannedRow[],
  lookups: CustomerImportLookups,
  tenantId: string,
): Promise<PlannedRow[]> {
  const ids = planned
    .filter((row): row is UpdatePlan => row.kind === 'update' && row.mode === 'supplement')
    .map(row => row.id)
  if (ids.length === 0) return planned

  const { data } = await supabase
    .from('users')
    .select('id, email, phone, birthdate, street, street_nr, zip, city, lernfahrausweis_nr, category, profession, language, preferred_payment_method, faberid, sari_faberid, sari_birthdate, acquisition_source, referred_by_code, metadata')
    .in('id', ids)
    .eq('tenant_id', tenantId)

  const existingRecordsById = new Map<string, Record<string, unknown>>()
  for (const user of data || []) existingRecordsById.set(user.id, user)
  return refineSupplementPlans(planned, existingRecordsById, lookups.byPhone)
}

async function applyUpdate(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  row: UpdatePlan,
  tenantId: string,
): Promise<PlannedRow> {
  if (!updatePayloadIsSafe(row.updatePayload) || Object.keys(row.updatePayload).length === 0) {
    return {
      kind: 'fail',
      sourceRow: row.sourceRow,
      identifier: row.identifier,
      reason: 'Update enthält keine zulässigen Felder',
    }
  }

  const { error } = await supabase
    .from('users')
    .update(row.updatePayload)
    .eq('id', row.id)
    .eq('tenant_id', tenantId)

  if (error) {
    return {
      kind: 'fail',
      sourceRow: row.sourceRow,
      identifier: row.identifier,
      reason: error.message,
    }
  }
  return row
}

function responseFrom(planned: PlannedRow[]) {
  const accounting = accountPlannedRows(planned)
  if (!accountingBalances(accounting)) {
    logger.error('Import accounting mismatch')
  }
  return {
    success: true,
    total: accounting.total,
    created: accounting.created,
    updated: accounting.updated,
    skipped: accounting.skipped,
    failed: accounting.failed,
    duplicates: accounting.duplicates,
    importedCount: accounting.created,
    updatedCount: accounting.updated,
    skippedCount: accounting.skipped,
    errorCount: accounting.failed,
    errors: failedRows(planned, 100),
  }
}
