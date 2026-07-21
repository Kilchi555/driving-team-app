// server/api/invoices/camt-import.post.ts
// Parst eine CAMT.053 / CAMT.054 XML-Datei und matcht Einträge mit offenen Rechnungen

import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import {
  matchEntriesToInvoices, flagAlreadyImported, computeDedupeKey,
  type MatchableEntry, type OpenInvoiceForMatching,
} from '~/server/utils/bank-reconciliation'

// Einfacher XML-Wert-Extraktor ohne externe Dependencies
function xmlVal(xml: string, tag: string): string {
  const m = xml.match(new RegExp(`<(?:[^:>]+:)?${tag}[^>]*>([^<]*)<`, 'i'))
  return m ? m[1].trim() : ''
}

// Wert eines verschachtelten Tags, z.B. <ValDt><Dt>2026-07-15</Dt></ValDt> → '2026-07-15'.
// xmlVal allein scheitert hier, weil der Regex am ersten "<" (dem öffnenden <Dt>) stoppt
// und dadurch immer einen leeren String liefert.
function xmlNestedVal(xml: string, outerTag: string, innerTags: string[]): string {
  const outer = xmlBlock(xml, outerTag)[0]
  if (!outer) return ''
  for (const inner of innerTags) {
    const v = xmlVal(outer, inner)
    if (v) return v
  }
  // Fallback: outer-Block ohne jegliche Tags (z.B. <ValDt>2026-07-15</ValDt> ohne <Dt>)
  return outer.replace(/<[^>]+>/g, '').trim()
}

function xmlAttr(xml: string, tag: string, attr: string): string {
  const m = xml.match(new RegExp(`<(?:[^:>]+:)?${tag}[^>]*\\s${attr}="([^"]*)"`, 'i'))
  return m ? m[1].trim() : ''
}

function xmlAll(xml: string, tag: string): string[] {
  const re = new RegExp(`<(?:[^:>]+:)?${tag}[^>]*>([\\s\\S]*?)</(?:[^:>]+:)?${tag}>`, 'gi')
  const results: string[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(xml)) !== null) results.push(m[1])
  return results
}

function xmlBlock(xml: string, tag: string): string[] {
  const re = new RegExp(`<(?:[^:>]+:)?${tag}[\\s>][\\s\\S]*?</(?:[^:>]+:)?${tag}>`, 'gi')
  const results: string[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(xml)) !== null) results.push(m[0])
  return results
}

function parseCamt(xml: string): MatchableEntry[] {
  const entries: MatchableEntry[] = []

  // Unterstützt sowohl Ntry (CAMT.053) als auch TxDtls (CAMT.054)
  const ntryBlocks = xmlBlock(xml, 'Ntry')

  for (const ntry of ntryBlocks) {
    const cdtDbt = xmlVal(ntry, 'CdtDbtInd')
    if (cdtDbt !== 'CRDT') continue // Nur Gutschriften (Zahlungseingänge)

    // Stornierte/rückgebuchte Buchungen (z.B. eine zurückgerufene Gutschrift)
    // dürfen nicht als Zahlungseingang gewertet werden.
    const reversal = xmlVal(ntry, 'RvslInd').toLowerCase()
    if (reversal === 'true') continue

    const amtStr = xmlVal(ntry, 'Amt')
    const amt = parseFloat(amtStr.replace(',', '.')) || 0
    if (amt <= 0) continue

    // Fremdwährungen können nicht 1:1 gegen CHF-Rechnungsbeträge gematcht werden.
    const currency = xmlAttr(ntry, 'Amt', 'Ccy') || 'CHF'
    if (currency !== 'CHF') continue

    const date = xmlNestedVal(ntry, 'ValDt', ['Dt', 'DtTm']) || xmlNestedVal(ntry, 'BookgDt', ['Dt', 'DtTm'])

    // Bank-eigene, i.d.R. eindeutige Transaktionsreferenz — für Duplikat-Erkennung.
    const acctSvcrRefEntry = xmlVal(ntry, 'AcctSvcrRef')
    const ntryRef = xmlVal(ntry, 'NtryRef')

    // TxDtls Blöcke innerhalb dieses Eintrags
    const txBlocks = xmlBlock(ntry, 'TxDtls')
    const blocks = txBlocks.length > 0 ? txBlocks : [ntry]

    for (const tx of blocks) {
      // Referenznummer aus Strd (Swiss QR / SCOR) oder Ustrd (freier Text)
      const endToEnd = xmlVal(tx, 'EndToEndId') || ''
      const strd = xmlAll(tx, 'Ref').join(' ') // Strukturierte Ref
      const ustrd = xmlVal(tx, 'Ustrd') || xmlVal(tx, 'AddtlNtryInf') || '' // Freier Text
      const ref = strd || endToEnd || ustrd

      // Auftraggeber
      const dbtrName = xmlVal(tx, 'Nm') || xmlVal(ntry, 'Nm') || ''
      const iban = xmlVal(tx, 'IBAN') || ''

      const bankRef = xmlVal(tx, 'AcctSvcrRef') || acctSvcrRefEntry || ntryRef || endToEnd || ''
      const cleanRef = ref.replace(/\s/g, '').toUpperCase()
      const amountRappen = Math.round(amt * 100)
      const dateStr = date.substring(0, 10)

      entries.push({
        amount_rappen: amountRappen,
        date: dateStr,
        reference: cleanRef,
        reference_raw: ref,
        debtor_name: dbtrName,
        iban,
        remittance_info: ustrd,
        raw_amount: amt,
        bank_ref: bankRef || null,
        dedupe_key: computeDedupeKey({
          bankRef: bankRef || null, date: dateStr, amountRappen, reference: cleanRef, debtorName: dbtrName,
        }),
      })
    }
  }

  return entries
}

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

  // CAMT parsen
  const entries = parseCamt(xmlContent)
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
    .in('status', ['sent', 'overdue'])
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
