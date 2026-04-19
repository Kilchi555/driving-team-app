// server/api/invoices/camt-import.post.ts
// Parst eine CAMT.053 / CAMT.054 XML-Datei und matcht Einträge mit offenen Rechnungen

import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

// Einfacher XML-Wert-Extraktor ohne externe Dependencies
function xmlVal(xml: string, tag: string): string {
  const m = xml.match(new RegExp(`<(?:[^:>]+:)?${tag}[^>]*>([^<]*)<`, 'i'))
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

function parseCamt(xml: string): CamtEntry[] {
  const entries: CamtEntry[] = []

  // Unterstützt sowohl Ntry (CAMT.053) als auch TxDtls (CAMT.054)
  const ntryBlocks = xmlBlock(xml, 'Ntry')

  for (const ntry of ntryBlocks) {
    const cdtDbt = xmlVal(ntry, 'CdtDbtInd')
    if (cdtDbt !== 'CRDT') continue // Nur Gutschriften (Zahlungseingänge)

    const amtStr = xmlVal(ntry, 'Amt')
    const amt = parseFloat(amtStr.replace(',', '.')) || 0
    if (amt <= 0) continue

    const valDt = xmlVal(ntry, 'ValDt') || xmlVal(ntry, 'BookgDt') || ''
    const date = valDt ? (xmlVal(valDt, 'Dt') || valDt.replace(/<[^>]+>/g, '').trim()) : ''

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

      entries.push({
        amount_rappen: Math.round(amt * 100),
        date: date.substring(0, 10),
        reference: ref.replace(/\s/g, '').toUpperCase(),
        reference_raw: ref,
        debtor_name: dbtrName,
        iban,
        remittance_info: ustrd,
        raw_amount: amt,
      })
    }
  }

  return entries
}

export interface CamtEntry {
  amount_rappen: number
  date: string
  reference: string
  reference_raw: string
  debtor_name: string
  iban: string
  remittance_info: string
  raw_amount: number
}

export interface MatchResult {
  entry: CamtEntry
  match_type: 'exact_ref' | 'invoice_number' | 'amount_name' | 'none'
  confidence: number // 0–100
  invoice_id?: string
  invoice_number?: string
  invoice_total?: number
  customer_name?: string
  invoice_status?: string
  invoice_payment_status?: string
  already_paid?: boolean
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

  const invoices = openInvoices || []

  // Matching-Logik
  const results: MatchResult[] = entries.map(entry => {
    let bestMatch: MatchResult = {
      entry,
      match_type: 'none',
      confidence: 0,
    }

    for (const inv of invoices) {
      const invNum = (inv.invoice_number || '').replace(/\s/g, '').toUpperCase()
      const custName = (inv.billing_contact_person || inv.billing_company_name || '').toLowerCase()

      // 1. Exakte Referenznummer (QR-SCOR oder Rechnungsnummer in Ref)
      const refClean = entry.reference.replace(/[^A-Z0-9]/g, '')
      const invNumClean = invNum.replace(/[^A-Z0-9]/g, '')
      if (refClean && invNumClean && (refClean === invNumClean || refClean.includes(invNumClean) || invNumClean.includes(refClean))) {
        const amtMatch = Math.abs(inv.total_amount_rappen - entry.amount_rappen) <= 1
        const confidence = amtMatch ? 99 : 75
        if (confidence > bestMatch.confidence) {
          bestMatch = {
            entry,
            match_type: 'exact_ref',
            confidence,
            invoice_id: inv.id,
            invoice_number: inv.invoice_number,
            invoice_total: inv.total_amount_rappen,
            customer_name: inv.billing_contact_person || inv.billing_company_name || '',
            invoice_status: inv.status,
            invoice_payment_status: inv.payment_status,
          }
        }
      }

      // 2. Rechnungsnummer im freien Text (Zahlungszweck)
      const remit = entry.remittance_info.replace(/\s/g, '').toUpperCase()
      if (invNumClean && remit.includes(invNumClean)) {
        const amtMatch = Math.abs(inv.total_amount_rappen - entry.amount_rappen) <= 1
        const confidence = amtMatch ? 90 : 65
        if (confidence > bestMatch.confidence) {
          bestMatch = {
            entry,
            match_type: 'invoice_number',
            confidence,
            invoice_id: inv.id,
            invoice_number: inv.invoice_number,
            invoice_total: inv.total_amount_rappen,
            customer_name: inv.billing_contact_person || inv.billing_company_name || '',
            invoice_status: inv.status,
            invoice_payment_status: inv.payment_status,
          }
        }
      }

      // 3. Betrag + Kundenname (Fuzzy)
      const amtExact = Math.abs(inv.total_amount_rappen - entry.amount_rappen) <= 1
      if (amtExact && custName && entry.debtor_name) {
        const debtorLower = entry.debtor_name.toLowerCase()
        const nameParts = custName.split(/\s+/)
        const nameMatch = nameParts.some(part => part.length > 2 && debtorLower.includes(part))
        if (nameMatch) {
          const confidence = 70
          if (confidence > bestMatch.confidence) {
            bestMatch = {
              entry,
              match_type: 'amount_name',
              confidence,
              invoice_id: inv.id,
              invoice_number: inv.invoice_number,
              invoice_total: inv.total_amount_rappen,
              customer_name: inv.billing_contact_person || inv.billing_company_name || '',
              invoice_status: inv.status,
              invoice_payment_status: inv.payment_status,
            }
          }
        }
      }

      // 4. Nur Betrag (niedriges Konfidenz)
      if (amtExact && bestMatch.confidence < 40) {
        bestMatch = {
          entry,
          match_type: 'amount_name',
          confidence: 35,
          invoice_id: inv.id,
          invoice_number: inv.invoice_number,
          invoice_total: inv.total_amount_rappen,
          customer_name: inv.billing_contact_person || inv.billing_company_name || '',
          invoice_status: inv.status,
          invoice_payment_status: inv.payment_status,
        }
      }
    }

    return bestMatch
  })

  // Duplikate: wenn zwei Entries auf dieselbe Rechnung zeigen, confidence des schwächeren auf 0 setzen
  const usedInvoices = new Set<string>()
  const sorted = [...results].sort((a, b) => b.confidence - a.confidence)
  for (const r of sorted) {
    if (r.invoice_id) {
      if (usedInvoices.has(r.invoice_id)) {
        r.confidence = Math.min(r.confidence, 20)
        r.match_type = 'none'
        delete r.invoice_id
      } else {
        usedInvoices.add(r.invoice_id)
      }
    }
  }

  return {
    entries_count: entries.length,
    matched_count: results.filter(r => r.confidence >= 65).length,
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
