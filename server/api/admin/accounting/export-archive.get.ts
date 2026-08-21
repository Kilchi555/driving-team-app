import { defineEventHandler, createError, setResponseHeader } from 'h3'
import { requireAccountingAccess } from '~/server/utils/accountant-access'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { ACCOUNTING_PDF_DISCLAIMER } from '~/server/utils/accounting'
import { buildAccountingYearPdf } from '~/server/utils/accounting-year-pdf'
import { createStoreZip } from '~/server/utils/zip-store'
import { invoiceOutstandingRappen, computeNetAssets } from '~/server/utils/accounting'

function csvEscape(value: unknown): string {
  const s = value == null ? '' : String(value)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function csvRow(cols: unknown[]): string {
  return cols.map(csvEscape).join(',')
}

export default defineEventHandler(async (event) => {
  const profile = await requireAccountingAccess(event)
  const supabase = getSupabaseAdmin()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('name, bank_balance_rappen')
    .eq('id', profile.tenant_id)
    .single()

  const entries: Array<Record<string, unknown>> = []
  let from = 0
  while (true) {
    const { data, error } = await supabase
      .from('accounting_entries')
      .select('id, type, amount_rappen, entry_date, description, vat_rate, vat_amount_rappen, is_paid, paid_date, receipt_url, receipt_filename, linked_payment_id, storno_of_id, notes, category:accounting_categories(name)')
      .eq('tenant_id', profile.tenant_id)
      .is('deleted_at', null)
      .order('entry_date')
      .range(from, from + 999)
    if (error) throw createError({ statusCode: 500, statusMessage: error.message })
    const chunk = data ?? []
    entries.push(...chunk)
    if (chunk.length < 1000) break
    from += 1000
  }

  const years = [...new Set(entries.map(e => String(e.entry_date ?? '').slice(0, 4)).filter(y => /^\d{4}$/.test(y)))]
    .map(Number)
    .sort()
  if (!years.includes(new Date().getFullYear())) years.push(new Date().getFullYear())

  const buchungenCsv = [
    csvRow(['datum', 'typ', 'betrag_chf', 'beschreibung', 'kategorie', 'mwst_satz', 'bezahlt', 'beleg', 'zahlung_id', 'storno']),
    ...entries.map(e => csvRow([
      e.entry_date,
      e.type,
      ((e.amount_rappen as number) / 100).toFixed(2),
      e.description,
      (e.category as { name?: string } | null)?.name ?? '',
      e.vat_rate ?? '',
      e.is_paid ? 'ja' : 'nein',
      e.receipt_filename ?? '',
      e.linked_payment_id ?? '',
      e.storno_of_id ? 'ja' : 'nein',
    ])),
  ].join('\n')

  const [{ data: cashRows }, { data: invoices }, { data: payables }] = await Promise.all([
    supabase.from('cash_balances').select('current_balance_rappen').eq('tenant_id', profile.tenant_id),
    supabase.from('invoices').select('total_amount_rappen, paid_amount_rappen, payment_status, status, document_kind').eq('tenant_id', profile.tenant_id),
    supabase.from('accounting_entries').select('amount_rappen').eq('tenant_id', profile.tenant_id).eq('type', 'expense').eq('approval_status', 'approved').eq('is_paid', false).is('deleted_at', null).is('storno_of_id', null),
  ])
  const cashRappen = (cashRows ?? []).reduce((s, r) => s + (r.current_balance_rappen ?? 0), 0)
  const receivables = (invoices ?? []).reduce((s, inv) => s + invoiceOutstandingRappen(inv), 0)
  const kreditoren = (payables ?? []).reduce((s, e) => s + (e.amount_rappen ?? 0), 0)
  const bankRappen = tenant?.bank_balance_rappen ?? 0
  const vermoegenCsv = [
    csvRow(['position', 'betrag_chf']),
    csvRow(['Kasse', (cashRappen / 100).toFixed(2)]),
    csvRow(['Bank', (bankRappen / 100).toFixed(2)]),
    csvRow(['Debitoren', (receivables / 100).toFixed(2)]),
    csvRow(['Kreditoren', (kreditoren / 100).toFixed(2)]),
    csvRow(['Reinvermögen', (computeNetAssets({ cashRappen, bankRappen, receivablesRappen: receivables, payablesRappen: kreditoren }) / 100).toFixed(2)]),
  ].join('\n')

  const readme = [
    `Buchhaltungsarchiv ${tenant?.name ?? ''}`.trim(),
    `Erstellt am ${new Date().toLocaleDateString('de-CH')}`,
    '',
    ACCOUNTING_PDF_DISCLAIMER,
    '',
    'Inhalt:',
    '- buchungen.csv — alle Journalbuchungen',
    '- vermoegen.csv — Vermögenslage am Exporttag',
    '- jahresabschluss_YYYY.pdf — Jahresberichte',
    '- belege/ — Originalbelege soweit verfügbar',
    '',
    'Aufbewahrung: 10 Jahre (OR Art. 958f). Dieses Archiv auf eigenen Systemen sichern.',
  ].join('\n')

  const files: Array<{ name: string; data: Buffer }> = [
    { name: 'README.txt', data: Buffer.from(readme, 'utf8') },
    { name: 'buchungen.csv', data: Buffer.from(buchungenCsv, 'utf8') },
    { name: 'vermoegen.csv', data: Buffer.from(vermoegenCsv, 'utf8') },
  ]

  for (const year of years) {
    try {
      const pdf = await buildAccountingYearPdf({
        supabase,
        tenantId: profile.tenant_id,
        tenantName: tenant?.name ?? '',
        year,
      })
      files.push({ name: `jahresabschluss_${year}.pdf`, data: pdf })
    } catch {
      // year without payments/RPC still gets skipped rather than failing the archive
    }
  }

  let receiptCount = 0
  for (const e of entries) {
    if (receiptCount >= 40) break
    const url = typeof e.receipt_url === 'string' ? e.receipt_url : ''
    if (!url) continue
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(4000), redirect: 'error' })
      if (!res.ok) continue
      const buf = Buffer.from(await res.arrayBuffer())
      if (buf.length > 4 * 1024 * 1024) continue
      const rawName = String(e.receipt_filename || `beleg-${e.id}`)
      const safe = rawName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80)
      files.push({ name: `belege/${String(e.entry_date)}_${safe}`, data: buf })
      receiptCount += 1
    } catch {
      // skip expired or unreachable signed URLs
    }
  }

  const zip = createStoreZip(files)

  await supabase
    .from('tenants')
    .update({ accounting_export_completed_at: new Date().toISOString() })
    .eq('id', profile.tenant_id)

  const stamp = new Date().toISOString().slice(0, 10)
  setResponseHeader(event, 'Content-Type', 'application/zip')
  setResponseHeader(event, 'Content-Disposition', `attachment; filename="simy-buchhaltung-${stamp}.zip"`)
  setResponseHeader(event, 'Content-Length', zip.length.toString())
  return zip
})
