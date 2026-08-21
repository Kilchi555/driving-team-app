// server/api/invoices/camt-import.post.ts
// Parst eine CAMT.053 / CAMT.054 XML-Datei und matcht Einträge mit offenen Rechnungen

import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import {
  matchEntriesToInvoices, flagAlreadyImported,
  type OpenInvoiceForMatching,
} from '~/server/utils/bank-reconciliation'
import { parseCamtXml } from '~/server/utils/camt-parse'

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
    throw createError({ statusCode: 403, statusMessage: 'Nur Admins können CAMT-Dateien importieren' })
  }

  const body = await readBody(event)
  const xmlContent: string = body.xml_content

  if (!xmlContent || typeof xmlContent !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'xml_content fehlt' })
  }

  const entries = parseCamtXml(xmlContent, { directions: ['CRDT'] })
  if (entries.length === 0) {
    throw createError({ statusCode: 422, statusMessage: 'Keine Zahlungseingänge in der CAMT-Datei gefunden' })
  }

  // Tenant-QR-IBAN laden, um pro Rechnung die exakt erwartete Zahlungsreferenz
  // (QRR bei QR-IBAN, SCOR bei normaler IBAN) berechnen zu können.
  const { data: tenant } = await supabase
    .from('tenants')
    .select('qr_iban')
    .eq('id', staffUser.tenant_id)
    .single()
  const tenantQrIban = tenant?.qr_iban || ''

  // Alle offenen Rechnungen dieses Tenants laden
  const { data: openInvoices } = await supabase
    .from('invoices')
    .select(`
      id, invoice_number, total_amount_rappen, subtotal_rappen,
      payment_status, status,
      billing_contact_person, billing_company_name,
      notes
    `)
    .eq('tenant_id', staffUser.tenant_id)
    .eq('document_kind', 'invoice')
    .in('status', ['sent', 'overdue', 'pdf_created'])
    .neq('payment_status', 'paid')
    .order('invoice_date', { ascending: false })

  const invoices: OpenInvoiceForMatching[] = openInvoices || []

  // Matching + Duplikat-Erkennung
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
