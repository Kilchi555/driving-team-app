import { defineEventHandler, readBody, createError, setResponseHeader } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

interface Payment {
  end_to_end_id: string
  amount_chf: number
  currency: string
  iban: string
  creditor_name: string
  creditor_address?: string
  creditor_postal_code?: string
  creditor_city?: string
  creditor_country?: string
  reference_type?: string   // QRR | SCOR | NON
  reference?: string
  additional_info?: string
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function buildPain001(
  debtorName: string,
  debtorIban: string,
  executionDate: string,
  payments: Payment[],
): string {
  const msgId = `SIMY-${Date.now()}`
  const createdAt = new Date().toISOString().replace(/\.\d{3}Z$/, '')
  const controlSum = payments.reduce((s, p) => s + p.amount_chf, 0).toFixed(2)
  const nbOfTxs = payments.length

  const txBlocks = payments.map(p => {
    const refBlock = p.reference_type && p.reference && p.reference_type !== 'NON'
      ? `<RmtInf>
          <Strd>
            <CdtrRefInf>
              <Tp><CdOrPrtry><Cd>${escapeXml(p.reference_type)}</Cd></CdOrPrtry></Tp>
              <Ref>${escapeXml(p.reference)}</Ref>
            </CdtrRefInf>
          </Strd>
        </RmtInf>`
      : p.additional_info
        ? `<RmtInf><Ustrd>${escapeXml(p.additional_info)}</Ustrd></RmtInf>`
        : ''

    return `    <CdtTrfTxInf>
      <PmtId><EndToEndId>${escapeXml(p.end_to_end_id)}</EndToEndId></PmtId>
      <Amt><InstdAmt Ccy="${escapeXml(p.currency ?? 'CHF')}">${p.amount_chf.toFixed(2)}</InstdAmt></Amt>
      <Cdtr>
        <Nm>${escapeXml(p.creditor_name)}</Nm>
        ${p.creditor_address ? `<PstlAdr>
          ${p.creditor_address ? `<StrtNm>${escapeXml(p.creditor_address)}</StrtNm>` : ''}
          ${p.creditor_postal_code ? `<PstCd>${escapeXml(p.creditor_postal_code)}</PstCd>` : ''}
          ${p.creditor_city ? `<TwnNm>${escapeXml(p.creditor_city)}</TwnNm>` : ''}
          <Ctry>${escapeXml(p.creditor_country ?? 'CH')}</Ctry>
        </PstlAdr>` : ''}
      </Cdtr>
      <CdtrAcct><Id><IBAN>${escapeXml(p.iban.replace(/\s/g, ''))}</IBAN></Id></CdtrAcct>
      ${refBlock}
    </CdtTrfTxInf>`
  }).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.03"
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
          xsi:schemaLocation="urn:iso:std:iso:20022:tech:xsd:pain.001.001.03 pain.001.001.03.xsd">
  <CstmrCdtTrfInitn>
    <GrpHdr>
      <MsgId>${escapeXml(msgId)}</MsgId>
      <CreDtTm>${createdAt}</CreDtTm>
      <NbOfTxs>${nbOfTxs}</NbOfTxs>
      <CtrlSum>${controlSum}</CtrlSum>
      <InitgPty><Nm>${escapeXml(debtorName)}</Nm></InitgPty>
    </GrpHdr>
    <PmtInf>
      <PmtInfId>${escapeXml(msgId)}-PI</PmtInfId>
      <PmtMtd>TRF</PmtMtd>
      <NbOfTxs>${nbOfTxs}</NbOfTxs>
      <CtrlSum>${controlSum}</CtrlSum>
      <PmtTpInf>
        <SvcLvl><Cd>NURG</Cd></SvcLvl>
        <LclInstrm><Cd>IBAN</Cd></LclInstrm>
      </PmtTpInf>
      <ReqdExctnDt>${escapeXml(executionDate)}</ReqdExctnDt>
      <Dbtr><Nm>${escapeXml(debtorName)}</Nm></Dbtr>
      <DbtrAcct><Id><IBAN>${escapeXml(debtorIban.replace(/\s/g, ''))}</IBAN></Id></DbtrAcct>
      <DbtrAgt><FinInstnId><Othr><Id>NOTPROVIDED</Id></Othr></FinInstnId></DbtrAgt>
${txBlocks}
    </PmtInf>
  </CstmrCdtTrfInitn>
</Document>`
}

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const supabase = getSupabaseAdmin()
  const body = await readBody(event)

  const {
    debtor_iban,
    execution_date,
    payments,
  } = body as {
    debtor_iban: string
    execution_date: string
    payments: Payment[]
  }

  if (!debtor_iban) throw createError({ statusCode: 400, statusMessage: 'debtor_iban ist erforderlich' })
  if (!execution_date) throw createError({ statusCode: 400, statusMessage: 'execution_date ist erforderlich' })
  if (!payments?.length) throw createError({ statusCode: 400, statusMessage: 'Mindestens eine Zahlung erforderlich' })

  // Mandantenname für Debtor
  const { data: tenant } = await supabase
    .from('tenants')
    .select('name')
    .eq('id', profile.tenant_id)
    .single()

  const debtorName = tenant?.name ?? 'Unbekannt'

  const xml = buildPain001(debtorName, debtor_iban, execution_date, payments)

  setResponseHeader(event, 'Content-Type', 'application/xml')
  setResponseHeader(event, 'Content-Disposition', `attachment; filename="zahlung_${execution_date}.xml"`)

  return xml
})
