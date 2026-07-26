// server/api/invoices/csv-import.post.ts
// Importiert Zahlungseingänge aus einer generischen Bank-CSV-Datei (für Banken/
// Zahlungsdienstleister ohne CAMT/ISO-20022-Export) und matcht sie mit offenen
// Rechnungen — nutzt dieselbe Matching-Engine wie der CAMT-Import.

import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import {
  parseCsv, parseSwissAmount, parseFlexibleDate, enrichCsvPaymentFields,
  type ColumnMapping,
} from '~/server/utils/csv-parse'
import {
  matchEntriesToInvoices, flagAlreadyImported, computeDedupeKey,
  type MatchableEntry, type OpenInvoiceForMatching,
} from '~/server/utils/bank-reconciliation'

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser?.id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const supabase = getSupabaseAdmin()
  const { data: staffUser } = await supabase
    .from('users')
    .select('id, tenant_id, role')
    .eq('auth_user_id', authUser.id)
    .single()

  if (!staffUser || !['admin', 'tenant_admin'].includes(staffUser.role)) {
    throw createError({ statusCode: 403, statusMessage: 'Nur Admins können Zahlungsdateien importieren' })
  }

  const body = await readBody(event)
  const csvContent: string = body.csv_content
  const mapping: ColumnMapping = body.mapping

  if (!csvContent || typeof csvContent !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'csv_content fehlt' })
  }
  if (!mapping?.date || (!mapping.amount && !mapping.credit)) {
    throw createError({ statusCode: 400, statusMessage: 'Spalten-Zuordnung unvollständig: Datum und Betrag (oder Gutschrift) erforderlich' })
  }

  const { headers, rows } = parseCsv(csvContent)
  const colIndex = (name?: string) => (name ? headers.indexOf(name) : -1)

  const dateIdx = colIndex(mapping.date)
  const amountIdx = colIndex(mapping.amount)
  const creditIdx = colIndex(mapping.credit)
  const debitIdx = colIndex(mapping.debit)
  const referenceIdx = colIndex(mapping.reference)
  const descriptionIdx = colIndex(mapping.description)
  const debtorNameIdx = colIndex(mapping.debtor_name)
  const transactionIdIdx = colIndex(mapping.transaction_id)

  if (dateIdx === -1) throw createError({ statusCode: 400, statusMessage: `Spalte "${mapping.date}" nicht gefunden` })

  const entries: MatchableEntry[] = []
  let skippedNoAmount = 0
  let skippedInvalidDate = 0

  for (const row of rows) {
    const dateRaw = row[dateIdx] || ''
    const date = parseFlexibleDate(dateRaw)
    if (!date) { skippedInvalidDate++; continue }

    // Separate Gutschrift/Lastschrift-Spalten (üblich bei CH-Bank-Exporten) oder
    // eine einzelne Betragsspalte mit Vorzeichen.
    let amount = 0
    if (creditIdx > -1) {
      amount = parseSwissAmount(row[creditIdx] || '')
      // Eine reine Lastschrift-Zeile (Ausgang) ist für den Zahlungsabgleich irrelevant.
      if (amount <= 0 && debitIdx > -1 && parseSwissAmount(row[debitIdx] || '') > 0) continue
    } else if (amountIdx > -1) {
      amount = parseSwissAmount(row[amountIdx] || '')
    }
    // Nur Zahlungseingänge (positive Beträge) sind für den Abgleich relevant.
    if (amount <= 0) { skippedNoAmount++; continue }

    const reference = (referenceIdx > -1 ? row[referenceIdx] || '' : '').trim()
    const description = (descriptionIdx > -1 ? row[descriptionIdx] || '' : '').trim()
    const mappedDebtor = (debtorNameIdx > -1 ? row[debtorNameIdx] || '' : '').trim()
    const bankRef = (transactionIdIdx > -1 ? row[transactionIdIdx] || '' : '').trim() || null

    // Spaltenübergreifend: QRR/Name/Rechnungsnr. aus der ganzen Zeile —
    // Banken streuen dieselben Infos auf unterschiedliche Spalten.
    const enriched = enrichCsvPaymentFields({
      row,
      headers,
      mappedReference: reference,
      mappedDescription: description,
      mappedDebtorName: mappedDebtor,
      skipHeaderIndexes: [dateIdx, amountIdx, creditIdx, debitIdx, transactionIdIdx].filter(i => i > -1),
    })

    const amountRappen = Math.round(amount * 100)

    entries.push({
      amount_rappen: amountRappen,
      date,
      reference: enriched.reference,
      reference_raw: enriched.reference_raw,
      debtor_name: enriched.debtor_name,
      iban: '',
      remittance_info: enriched.remittance_info,
      raw_amount: amount,
      bank_ref: bankRef,
      dedupe_key: computeDedupeKey({
        bankRef,
        date,
        amountRappen,
        reference: enriched.reference || enriched.reference_raw,
        debtorName: enriched.debtor_name,
      }),
    })
  }

  if (entries.length === 0) {
    throw createError({
      statusCode: 422,
      statusMessage: `Keine Zahlungseingänge erkannt (${skippedInvalidDate} Zeilen mit ungültigem Datum, ${skippedNoAmount} ohne positiven Betrag). Bitte Spalten-Zuordnung prüfen.`,
    })
  }

  const { data: tenant } = await supabase
    .from('tenants')
    .select('qr_iban')
    .eq('id', staffUser.tenant_id)
    .single()
  const tenantQrIban = tenant?.qr_iban || ''

  const { data: openInvoices } = await supabase
    .from('invoices')
    .select(`
      id, invoice_number, total_amount_rappen, subtotal_rappen,
      payment_status, status,
      billing_contact_person, billing_company_name,
      notes
    `)
    .eq('tenant_id', staffUser.tenant_id)
    .in('status', ['sent', 'overdue', 'pdf_created'])
    .neq('payment_status', 'paid')
    .order('invoice_date', { ascending: false })

  const invoices: OpenInvoiceForMatching[] = openInvoices || []

  const results = matchEntriesToInvoices(entries, invoices, tenantQrIban)

  const dedupeKeys = entries.map(e => e.dedupe_key)
  const { data: existingImports } = await supabase
    .from('bank_import_records')
    .select('dedupe_key, imported_at')
    .eq('tenant_id', staffUser.tenant_id)
    .in('dedupe_key', dedupeKeys)
  const importedKeyMap = new Map((existingImports || []).map(r => [r.dedupe_key, r.imported_at]))
  flagAlreadyImported(results, importedKeyMap)

  return {
    entries_count: entries.length,
    skipped_no_amount: skippedNoAmount,
    skipped_invalid_date: skippedInvalidDate,
    matched_count: results.filter(r => r.confidence >= 65 && !r.already_imported).length,
    already_imported_count: results.filter(r => r.already_imported).length,
    results,
    open_invoices: invoices.map(i => ({
      id: i.id,
      invoice_number: i.invoice_number,
      total_amount_rappen: i.total_amount_rappen,
      customer_name: i.billing_contact_person || i.billing_company_name || '',
      payment_status: i.payment_status,
      status: i.status,
    })),
  }
})
