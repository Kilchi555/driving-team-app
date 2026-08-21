import { describe, expect, it } from 'vitest'
import { parseCamtXml } from '../camt-parse'

const SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:camt.053.001.08">
  <BkToCstmrStmt><Stmt>
    <Ntry>
      <Amt Ccy="CHF">108.10</Amt>
      <CdtDbtInd>DBIT</CdtDbtInd>
      <ValDt><Dt>2026-03-01</Dt></ValDt>
      <AcctSvcrRef>BANK-DBIT-1</AcctSvcrRef>
      <NtryDtls><TxDtls>
        <RltdPties>
          <Cdtr><Nm>Pneu AG</Nm></Cdtr>
          <CdtrAcct><Id><IBAN>CH9300762011623852957</IBAN></Id></CdtrAcct>
        </RltdPties>
        <RmtInf>
          <Strd><CdtrRefInf><Ref>RF18539007547034</Ref></CdtrRefInf></Strd>
          <Ustrd>Winterreifen</Ustrd>
        </RmtInf>
      </TxDtls></NtryDtls>
    </Ntry>
    <Ntry>
      <Amt Ccy="CHF">190.00</Amt>
      <CdtDbtInd>CRDT</CdtDbtInd>
      <ValDt><Dt>2026-03-02</Dt></ValDt>
      <AcctSvcrRef>BANK-CRDT-1</AcctSvcrRef>
      <NtryDtls><TxDtls>
        <RltdPties><Dbtr><Nm>Max Muster</Nm></Dbtr></RltdPties>
        <RmtInf><Ustrd>RE-2026-0029</Ustrd></RmtInf>
      </TxDtls></NtryDtls>
    </Ntry>
    <Ntry>
      <Amt Ccy="EUR">20.00</Amt>
      <CdtDbtInd>DBIT</CdtDbtInd>
      <ValDt><Dt>2026-03-03</Dt></ValDt>
    </Ntry>
  </Stmt></BkToCstmrStmt>
</Document>`

describe('parseCamtXml', () => {
  it('reads debit payee and credit debtor separately', () => {
    const all = parseCamtXml(SAMPLE)
    expect(all).toHaveLength(2)
    expect(all[0]).toMatchObject({
      direction: 'DBIT',
      amount_rappen: 10810,
      date: '2026-03-01',
      debtor_name: 'Pneu AG',
      iban: 'CH9300762011623852957',
    })
    expect(all[1]).toMatchObject({
      direction: 'CRDT',
      amount_rappen: 19000,
      debtor_name: 'Max Muster',
    })
  })

  it('can return only outgoing payments', () => {
    const debits = parseCamtXml(SAMPLE, { directions: ['DBIT'] })
    expect(debits).toHaveLength(1)
    expect(debits[0].direction).toBe('DBIT')
  })
})
