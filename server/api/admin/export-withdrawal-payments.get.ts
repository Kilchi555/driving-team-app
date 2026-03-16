// server/api/admin/export-withdrawal-payments.get.ts
// Generates an ISO 20022 Pain.001.001.03 XML file for all pending withdrawal requests
// This file can be uploaded directly to any Swiss e-banking portal

import { defineEventHandler, getHeader, createError, setHeader } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'
import { decryptIBAN } from '~/server/utils/iban-utils'

const DEBTOR_NAME = 'Driving Team Zürich GmbH'
const DEBTOR_IBAN = process.env.DRIVING_TEAM_IBAN || 'CH0000000000000000000' // Set in env

export default defineEventHandler(async (event) => {
  const supabase = getSupabaseAdmin()

  try {
    // ── Auth + Admin check ────────────────────────────────
    const authHeader = getHeader(event, 'authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
    }
    const token = authHeader.substring(7)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) throw createError({ statusCode: 401, statusMessage: 'Invalid authentication' })

    const { data: adminUser } = await supabase
      .from('users')
      .select('id, role, tenant_id')
      .eq('auth_user_id', user.id)
      .single()

    if (!adminUser || !['admin', 'staff'].includes(adminUser.role)) {
      throw createError({ statusCode: 403, statusMessage: 'Nur Admins können Zahlungsfiles exportieren' })
    }

    // ── Load all pending withdrawals for this tenant ──────
    const { data: pendingCredits, error: fetchError } = await supabase
      .from('student_credits')
      .select(`
        id,
        user_id,
        pending_withdrawal_rappen,
        users!inner (
          id,
          first_name,
          last_name,
          email,
          tenant_id
        ),
        student_withdrawal_preferences!inner (
          iban_encrypted,
          iban_last4,
          account_holder,
          street,
          street_nr,
          zip,
          city
        )
      `)
      .gt('pending_withdrawal_rappen', 0)
      .eq('users.tenant_id', adminUser.tenant_id)

    if (fetchError) throw fetchError
    if (!pendingCredits || pendingCredits.length === 0) {
      throw createError({ statusCode: 404, statusMessage: 'Keine ausstehenden Auszahlungsanträge' })
    }

    // ── Build transactions ────────────────────────────────
    const transactions: Array<{
      iban: string
      accountHolder: string
      amountChf: string
      userId: string
      reference: string
      street?: string
      streetNr?: string
      zip?: string
      city?: string
    }> = []

    for (const credit of pendingCredits) {
      const prefs = (credit as any).student_withdrawal_preferences
      if (!prefs?.iban_encrypted) continue

      let iban: string
      try {
        iban = decryptIBAN(prefs.iban_encrypted)
      } catch (e) {
        logger.warn('⚠️ Could not decrypt IBAN for user:', (credit as any).users?.id)
        continue
      }

      const amountChf = ((credit.pending_withdrawal_rappen || 0) / 100).toFixed(2)
      transactions.push({
        iban,
        accountHolder: prefs.account_holder,
        amountChf,
        userId: credit.user_id,
        reference: `DTGTHB-${credit.user_id.slice(0, 8).toUpperCase()}`,
        street: prefs?.street || undefined,
        streetNr: prefs?.street_nr || undefined,
        zip: prefs?.zip || undefined,
        city: prefs?.city || undefined
      })
    }

    if (transactions.length === 0) {
      throw createError({ statusCode: 400, statusMessage: 'Keine gültigen IBAN-Daten gefunden' })
    }

    const totalChf = transactions
      .reduce((sum, t) => sum + parseFloat(t.amountChf), 0)
      .toFixed(2)

    const now = new Date()
    const msgId = `DTGTHB-${now.toISOString().slice(0, 10).replace(/-/g, '')}-${now.getTime().toString().slice(-6)}`
    const creDtTm = now.toISOString().slice(0, 19)
    const reqExctnDt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

    // ── Generate Pain.001.001.03 XML ──────────────────────
    const txsXml = transactions.map((tx, idx) => `
      <CdtTrfTxInf>
        <PmtId>
          <EndToEndId>${tx.reference}</EndToEndId>
        </PmtId>
        <Amt>
          <InstdAmt Ccy="CHF">${tx.amountChf}</InstdAmt>
        </Amt>
        <CdtrAgt>
          <FinInstnId>
            <Othr><Id>NOTPROVIDED</Id></Othr>
          </FinInstnId>
        </CdtrAgt>
        <Cdtr>
          <Nm>${escapeXml(tx.accountHolder)}</Nm>
          ${tx.street ? `<PstlAdr>
            <StrtNm>${escapeXml(tx.street)}</StrtNm>
            ${tx.streetNr ? `<BldgNb>${escapeXml(tx.streetNr)}</BldgNb>` : ''}
            ${tx.zip ? `<PstCd>${escapeXml(tx.zip)}</PstCd>` : ''}
            ${tx.city ? `<TwnNm>${escapeXml(tx.city)}</TwnNm>` : ''}
            <Ctry>CH</Ctry>
          </PstlAdr>` : ''}
        </Cdtr>
        <CdtrAcct>
          <Id><IBAN>${tx.iban}</IBAN></Id>
        </CdtrAcct>
        <RmtInf>
          <Ustrd>Guthaben-Auszahlung Driving Team</Ustrd>
        </RmtInf>
      </CdtTrfTxInf>`).join('\n')

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.03"
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
          xsi:schemaLocation="urn:iso:std:iso:20022:tech:xsd:pain.001.001.03 pain.001.001.03.xsd">
  <CstmrCdtTrfInitn>
    <GrpHdr>
      <MsgId>${msgId}</MsgId>
      <CreDtTm>${creDtTm}</CreDtTm>
      <NbOfTxs>${transactions.length}</NbOfTxs>
      <CtrlSum>${totalChf}</CtrlSum>
      <InitgPty>
        <Nm>${escapeXml(DEBTOR_NAME)}</Nm>
      </InitgPty>
    </GrpHdr>
    <PmtInf>
      <PmtInfId>${msgId}-001</PmtInfId>
      <PmtMtd>TRF</PmtMtd>
      <NbOfTxs>${transactions.length}</NbOfTxs>
      <CtrlSum>${totalChf}</CtrlSum>
      <PmtTpInf>
        <SvcLvl><Cd>SEPA</Cd></SvcLvl>
      </PmtTpInf>
      <ReqdExctnDt>${reqExctnDt}</ReqdExctnDt>
      <Dbtr>
        <Nm>${escapeXml(DEBTOR_NAME)}</Nm>
      </Dbtr>
      <DbtrAcct>
        <Id><IBAN>${DEBTOR_IBAN}</IBAN></Id>
      </DbtrAcct>
      <DbtrAgt>
        <FinInstnId>
          <Othr><Id>NOTPROVIDED</Id></Othr>
        </FinInstnId>
      </DbtrAgt>
      ${txsXml}
    </PmtInf>
  </CstmrCdtTrfInitn>
</Document>`

    const filename = `auszahlungen-${now.toISOString().slice(0, 10)}.xml`
    setHeader(event, 'Content-Type', 'application/xml')
    setHeader(event, 'Content-Disposition', `attachment; filename="${filename}"`)

    logger.debug('✅ Pain.001 generated:', { txCount: transactions.length, totalChf, filename })

    return xml

  } catch (error: any) {
    if (error.statusCode) throw error
    logger.error('❌ export-withdrawal-payments error:', error)
    throw createError({ statusCode: 500, statusMessage: 'Fehler beim Erstellen des Zahlungsfiles' })
  }
})

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
