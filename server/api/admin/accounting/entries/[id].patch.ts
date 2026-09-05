import { defineEventHandler, readBody, createError } from 'h3'
import { requireAccountingAccess } from '~/server/utils/accountant-access'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import {
  ACCOUNTING_MATERIAL_FIELDS,
  ACCOUNTING_OPERATIONAL_FIELDS,
  canEditAccountingMaterial,
  changedMaterialFields,
  documentKindToEntryType,
  isAccountingDocumentKind,
} from '~/server/utils/accounting'
import { syncEntryLedger } from '~/server/utils/accounting-ledger-db'
import { assertPersistableReceiptRef, isHttpReceiptUrl, tenantOwnsReceiptPath } from '~/server/utils/receipt-storage'

const ALLOWED_FIELDS = [...ACCOUNTING_MATERIAL_FIELDS, ...ACCOUNTING_OPERATIONAL_FIELDS] as const

export default defineEventHandler(async (event) => {
  const profile = await requireAccountingAccess(event, { write: true })
  const supabase = getSupabaseAdmin()
  const id = event.context.params?.id
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID fehlt' })

  const body = await readBody(event)

  const { data: existing } = await supabase
    .from('accounting_entries')
    .select('id, locked_at, linked_payment_id, storno_of_id, created_at, edit_history, amount_rappen, entry_date, description, category_id, vat_rate, vat_amount_rappen, document_kind')
    .eq('id', id)
    .eq('tenant_id', profile.tenant_id)
    .is('deleted_at', null)
    .single()

  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Eintrag nicht gefunden' })

  if (existing.locked_at) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Diese Buchung ist gesperrt und kann nicht mehr bearbeitet werden. Bitte eine Storno-Buchung erstellen.',
    })
  }

  if (existing.storno_of_id) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Storno-Buchungen können nicht bearbeitet werden.',
    })
  }

  const updates: Record<string, unknown> = {}
  for (const field of ALLOWED_FIELDS) {
    if (field in body) updates[field] = body[field]
  }
  if ('document_kind' in updates) {
    if (!isAccountingDocumentKind(updates.document_kind)) {
      throw createError({ statusCode: 400, statusMessage: 'Ungültige Beleg-Art' })
    }
    updates.type = documentKindToEntryType(updates.document_kind)
  }
  if ('notes' in updates && typeof updates.notes === 'string') {
    updates.notes = updates.notes.trim() || null
  }
  if ('receipt_url' in updates) {
    try {
      updates.receipt_url = assertPersistableReceiptRef(updates.receipt_url)
    } catch (err: any) {
      throw createError({ statusCode: 400, statusMessage: err.message || 'Ungültiger Beleg-Pfad' })
    }
    const receiptRef = updates.receipt_url
    if (typeof receiptRef === 'string' && !isHttpReceiptUrl(receiptRef) && !tenantOwnsReceiptPath(profile.tenant_id, receiptRef)) {
      throw createError({ statusCode: 403, statusMessage: 'Beleg gehört nicht zu diesem Mandanten' })
    }
  }

  if (Object.keys(updates).length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Keine Felder zum Aktualisieren' })
  }

  const materialChanged = changedMaterialFields(existing as Record<string, unknown>, updates)
  if (materialChanged.length > 0 && !canEditAccountingMaterial(existing)) {
    throw createError({
      statusCode: 403,
      statusMessage: existing.linked_payment_id
        ? 'Aus Zahlungen erzeugte Buchungen können nicht geändert werden. Bei Rückerstattung entsteht automatisch ein Storno.'
        : 'Betrag, Datum, Text oder Kategorie können nach 24 Stunden nur noch per Storno korrigiert werden (OR Art. 957a).',
    })
  }

  if (materialChanged.length > 0) {
    const history = Array.isArray(existing.edit_history) ? existing.edit_history : []
    updates.edit_history = [
      ...history,
      {
        at: new Date().toISOString(),
        by: profile.id,
        fields: Object.fromEntries(materialChanged.map((field) => [
          field,
          { from: (existing as Record<string, unknown>)[field] ?? null, to: updates[field] ?? null },
        ])),
      },
    ]
  }

  const { data, error } = await supabase
    .from('accounting_entries')
    .update(updates)
    .eq('id', id)
    .eq('tenant_id', profile.tenant_id)
    .select(`*, category:accounting_categories(id, name, type, color)`)
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  await syncEntryLedger(supabase, profile.tenant_id, id)

  return { success: true, data }
})
