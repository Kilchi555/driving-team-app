import { computeDedupeKey, type MatchableEntry } from '~/server/utils/bank-reconciliation'

export type CamtDirection = 'CRDT' | 'DBIT'

export type CamtParsedEntry = MatchableEntry & {
  direction: CamtDirection
}

function xmlVal(xml: string, tag: string): string {
  const m = xml.match(new RegExp(`<(?:[^:>]+:)?${tag}[^>]*>([^<]*)<`, 'i'))
  return m ? m[1].trim() : ''
}

function xmlNestedVal(xml: string, outerTag: string, innerTags: string[]): string {
  const outer = xmlBlock(xml, outerTag)[0]
  if (!outer) return ''
  for (const inner of innerTags) {
    const v = xmlVal(outer, inner)
    if (v) return v
  }
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

function counterparty(tx: string, direction: CamtDirection): { name: string; iban: string } {
  const parties = xmlBlock(tx, 'RltdPties')[0] || tx
  const partyTag = direction === 'DBIT' ? 'Cdtr' : 'Dbtr'
  const acctTag = direction === 'DBIT' ? 'CdtrAcct' : 'DbtrAcct'
  const party = xmlBlock(parties, partyTag)[0] || ''
  const acct = xmlBlock(parties, acctTag)[0] || ''
  return {
    name: xmlVal(party, 'Nm') || xmlVal(parties, 'Nm') || '',
    iban: xmlVal(acct, 'IBAN') || xmlVal(parties, 'IBAN') || '',
  }
}

export function parseCamtXml(
  xml: string,
  options: { directions?: CamtDirection[] } = {},
): CamtParsedEntry[] {
  const allowed = new Set(options.directions ?? ['CRDT', 'DBIT'])
  const entries: CamtParsedEntry[] = []
  const ntryBlocks = xmlBlock(xml, 'Ntry')

  for (const ntry of ntryBlocks) {
    const cdtDbt = xmlVal(ntry, 'CdtDbtInd') as CamtDirection
    if (cdtDbt !== 'CRDT' && cdtDbt !== 'DBIT') continue
    if (!allowed.has(cdtDbt)) continue

    const reversal = xmlVal(ntry, 'RvslInd').toLowerCase()
    if (reversal === 'true') continue

    const amtStr = xmlVal(ntry, 'Amt')
    const amt = parseFloat(amtStr.replace(',', '.')) || 0
    if (amt <= 0) continue

    const currency = xmlAttr(ntry, 'Amt', 'Ccy') || 'CHF'
    if (currency !== 'CHF') continue

    const date = xmlNestedVal(ntry, 'ValDt', ['Dt', 'DtTm']) || xmlNestedVal(ntry, 'BookgDt', ['Dt', 'DtTm'])
    const acctSvcrRefEntry = xmlVal(ntry, 'AcctSvcrRef')
    const ntryRef = xmlVal(ntry, 'NtryRef')
    const txBlocks = xmlBlock(ntry, 'TxDtls')
    const blocks = txBlocks.length > 0 ? txBlocks : [ntry]

    for (const tx of blocks) {
      const endToEnd = xmlVal(tx, 'EndToEndId') || ''
      const strd = xmlAll(tx, 'Ref').join(' ')
      const ustrd = xmlVal(tx, 'Ustrd') || xmlVal(ntry, 'AddtlNtryInf') || ''
      const ref = strd || endToEnd || ustrd
      const party = counterparty(tx, cdtDbt)
      const bankRef = xmlVal(tx, 'AcctSvcrRef') || acctSvcrRefEntry || ntryRef || endToEnd || ''
      const cleanRef = ref.replace(/\s/g, '').toUpperCase()
      const amountRappen = Math.round(amt * 100)
      const dateStr = date.substring(0, 10)

      entries.push({
        direction: cdtDbt,
        amount_rappen: amountRappen,
        date: dateStr,
        reference: cleanRef,
        reference_raw: ref,
        debtor_name: party.name,
        iban: party.iban,
        remittance_info: ustrd,
        raw_amount: amt,
        bank_ref: bankRef || null,
        dedupe_key: computeDedupeKey({
          bankRef: bankRef || null,
          date: dateStr,
          amountRappen,
          reference: cleanRef,
          debtorName: party.name,
        }),
      })
    }
  }

  return entries
}
