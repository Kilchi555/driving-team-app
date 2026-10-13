import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { matchEntriesToInvoices, type MatchableEntry, type OpenInvoiceForMatching } from '../bank-reconciliation'
import { parseCsv } from '../csv-parse'
import { STATEMENT_UPLOAD_MAX_BYTES, assertStatementUploadSize, statementByteLength } from '../csv-upload-limit'
import { creditsFromCamt, creditsFromCsv, previewStatementLines } from '../cash-bank-statement'
import {
  BANK_ACCOUNT_NUMBER,
  CASH_ACCOUNT_NUMBER,
  canAssignDepositor,
  canCorrectAttribution,
  cashToBankTransferLines,
  commitConfirmation,
  depositorFromStatementImport,
  duplicateImportKeepsAttribution,
  isEligibleDepositorRole,
  matchCreditToDeposits,
  planAttributionChange,
  planConfirmation,
  referenceTokenForDeposit,
  rejectClientTenantOverride,
  tenantOwnsResource,
  transferTouchesProfitAndLoss,
  validateReportInput,
  type BankCreditInput,
  type DepositMatchInput,
  type OpenDeposit,
} from '../cash-bank-deposit'

const TENANT = 'tenant-a'
const OTHER = 'tenant-b'

function deposit(partial: Partial<DepositMatchInput> & Pick<DepositMatchInput, 'id' | 'amountRappen'>): DepositMatchInput {
  return {
    tenantId: TENANT,
    reportedOn: '2026-10-01',
    referenceToken: `SIMYDEP${partial.id.slice(0, 8).toUpperCase()}`,
    status: 'reported',
    ...partial,
  }
}

function credit(partial: Partial<BankCreditInput> & Pick<BankCreditInput, 'amountRappen'>): BankCreditInput {
  return {
    dedupeKey: 'bank-1',
    date: '2026-10-02',
    currency: 'CHF',
    direction: 'credit',
    reference: '',
    remittance: '',
    ...partial,
  }
}

function openDeposit(partial: Partial<OpenDeposit> = {}): OpenDeposit {
  return {
    id: 'dep-1',
    tenantId: TENANT,
    status: 'matched',
    amountRappen: 10_000,
    currency: 'CHF',
    sourceKind: 'business',
    sourceUserId: 'owner-1',
    depositorUserId: 'owner-1',
    attributionStatus: 'reported',
    referenceToken: 'SIMYDEPDEP1',
    reportedOn: '2026-10-01',
    reportedBy: 'owner-1',
    candidateDedupeKey: 'bank-1',
    bankImportRecordId: null,
    journalId: null,
    ...partial,
  }
}

describe('cash-to-bank deposit reports', () => {
  it('reports a one-person deposit without posting a journal', () => {
    const lines = cashToBankTransferLines(10_000)
    const plan = planConfirmation({
      deposit: openDeposit({ status: 'reported', candidateDedupeKey: null }),
      bankTenantId: TENANT,
      bankDedupeKey: 'bank-1',
      bankAmountRappen: 10_000,
      bankCurrency: 'CHF',
      bankDirection: 'credit',
      bankAlreadyLinkedDepositId: null,
      matchClass: 'exact',
    })
    expect(plan.action).toBe('reject')
    expect(lines).toHaveLength(2)
    expect(transferTouchesProfitAndLoss(lines)).toBe(false)
  })

  it('does not describe the transfer as income or expense', () => {
    const lines = cashToBankTransferLines(15_000)
    expect(lines.map(l => l.account_number)).toEqual([BANK_ACCOUNT_NUMBER, CASH_ACCOUNT_NUMBER])
    expect(lines.find(l => l.account_number === '1020')?.debit_rappen).toBe(15_000)
    expect(lines.find(l => l.account_number === '1000')?.credit_rappen).toBe(15_000)
    expect(transferTouchesProfitAndLoss(lines)).toBe(false)
  })
})

describe('matching', () => {
  const token = referenceTokenForDeposit('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee')
  const one = deposit({ id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', amountRappen: 10_000, referenceToken: token })

  it('identifies an exact reference and amount as confirmable', () => {
    const result = matchCreditToDeposits(credit({ amountRappen: 10_000, remittance: `Einzahlung ${token}` }), [one])
    expect(result.matchClass).toBe('exact')
    expect(result.depositIds).toEqual([one.id])
  })

  it('keeps a unique amount and date as a suggestion', () => {
    const result = matchCreditToDeposits(credit({ amountRappen: 10_000, remittance: 'Bancomat' }), [one])
    expect(result.matchClass).toBe('suggestion')
  })

  it('does not post a suggestion before confirmation', () => {
    const plan = planConfirmation({
      deposit: openDeposit({ status: 'reported', candidateDedupeKey: null }),
      bankTenantId: TENANT,
      bankDedupeKey: 'bank-1',
      bankAmountRappen: 10_000,
      bankCurrency: 'CHF',
      bankDirection: 'credit',
      bankAlreadyLinkedDepositId: null,
      matchClass: 'suggestion',
    })
    expect(plan.action).toBe('reject')
  })

  it('posts one Dr 1020 / Cr 1000 transfer on confirmation', () => {
    const plan = planConfirmation({
      deposit: openDeposit(),
      bankTenantId: TENANT,
      bankDedupeKey: 'bank-1',
      bankAmountRappen: 10_000,
      bankCurrency: 'CHF',
      bankDirection: 'credit',
      bankAlreadyLinkedDepositId: null,
      matchClass: 'suggestion',
    })
    expect(plan.action).toBe('post')
    if (plan.action === 'post') {
      expect(plan.lines).toEqual(cashToBankTransferLines(10_000))
      expect(transferTouchesProfitAndLoss(plan.lines)).toBe(false)
    }
  })

  it('returns already reconciled on a repeated confirmation', () => {
    const plan = planConfirmation({
      deposit: openDeposit({ status: 'reconciled', journalId: 'journal-1' }),
      bankTenantId: TENANT,
      bankDedupeKey: 'bank-1',
      bankAmountRappen: 10_000,
      bankCurrency: 'CHF',
      bankDirection: 'credit',
      bankAlreadyLinkedDepositId: 'dep-1',
      matchClass: 'exact',
    })
    expect(plan).toEqual({ action: 'already_reconciled', journalId: 'journal-1' })
  })

  it('rejects a second journal when two confirms race after the first post', () => {
    const first = commitConfirmation(openDeposit(), 'posted', 'journal-1', 'import-1')
    const second = planConfirmation({
      deposit: first,
      bankTenantId: TENANT,
      bankDedupeKey: 'bank-1',
      bankAmountRappen: 10_000,
      bankCurrency: 'CHF',
      bankDirection: 'credit',
      bankAlreadyLinkedDepositId: 'dep-1',
      matchClass: 'exact',
    })
    expect(first.journalId).toBe('journal-1')
    expect(second.action).toBe('already_reconciled')
  })

  it('keeps attribution when the same statement key is seen again', () => {
    const stored = { depositorUserId: 'staff-1', journalId: 'journal-1' }
    expect(duplicateImportKeepsAttribution(stored)).toEqual(stored)
    expect(depositorFromStatementImport()).toBeNull()
  })

  it('does not match a debit, reversal, or non-CHF line', () => {
    expect(matchCreditToDeposits(credit({ amountRappen: 10_000, direction: 'debit' }), [one]).matchClass).toBe('ineligible')
    expect(matchCreditToDeposits(credit({ amountRappen: 10_000, direction: 'reversal' }), [one]).matchClass).toBe('ineligible')
    expect(matchCreditToDeposits(credit({ amountRappen: 10_000, currency: 'EUR' }), [one]).matchClass).toBe('ineligible')
  })

  it('leaves two same-amount deposits ambiguous', () => {
    const other = deposit({ id: 'bbbbbbbb-bbbb-cccc-dddd-eeeeeeeeeeee', amountRappen: 10_000, reportedOn: '2026-10-03' })
    const result = matchCreditToDeposits(credit({ amountRappen: 10_000 }), [one, other])
    expect(result.matchClass).toBe('ambiguous')
    expect(result.depositIds).toHaveLength(2)
    const plan = planConfirmation({
      deposit: openDeposit(),
      bankTenantId: TENANT,
      bankDedupeKey: 'bank-1',
      bankAmountRappen: 10_000,
      bankCurrency: 'CHF',
      bankDirection: 'credit',
      bankAlreadyLinkedDepositId: null,
      matchClass: 'ambiguous',
    })
    expect(plan).toEqual({ action: 'reject', reason: 'not_confirmable' })
  })

  it('leaves a partial or aggregate amount unresolved', () => {
    const result = matchCreditToDeposits(credit({ amountRappen: 9_500, remittance: token }), [one])
    expect(result.matchClass).toBe('unresolved_amount')
    const plan = planConfirmation({
      deposit: openDeposit({ amountRappen: 10_000 }),
      bankTenantId: TENANT,
      bankDedupeKey: 'bank-1',
      bankAmountRappen: 9_500,
      bankCurrency: 'CHF',
      bankDirection: 'credit',
      bankAlreadyLinkedDepositId: null,
      matchClass: 'unresolved_amount',
    })
    expect(plan.action).toBe('reject')
  })

  it('rejects a bank line from another tenant', () => {
    const plan = planConfirmation({
      deposit: openDeposit(),
      bankTenantId: OTHER,
      bankDedupeKey: 'bank-1',
      bankAmountRappen: 10_000,
      bankCurrency: 'CHF',
      bankDirection: 'credit',
      bankAlreadyLinkedDepositId: null,
      matchClass: 'exact',
    })
    expect(plan).toEqual({ action: 'reject', reason: 'tenant' })
  })

  it('rejects a deposit that already belongs to another bank line', () => {
    const plan = planConfirmation({
      deposit: openDeposit(),
      bankTenantId: TENANT,
      bankDedupeKey: 'bank-1',
      bankAmountRappen: 10_000,
      bankCurrency: 'CHF',
      bankDirection: 'credit',
      bankAlreadyLinkedDepositId: 'dep-other',
      matchClass: 'exact',
    })
    expect(plan).toEqual({ action: 'reject', reason: 'bank_line_used' })
  })

  it('rolls the deposit back when the journal fails', () => {
    const before = openDeposit()
    const after = commitConfirmation(before, 'failed', null, null)
    expect(after).toEqual(before)
    expect(after.status).toBe('matched')
    expect(after.journalId).toBeNull()
  })
})

describe('employee attribution', () => {
  it('allows a tenant admin and a staff member, and rejects a client', () => {
    expect(isEligibleDepositorRole('admin')).toBe(true)
    expect(isEligibleDepositorRole('tenant_admin')).toBe(true)
    expect(isEligibleDepositorRole('staff')).toBe(true)
    expect(isEligibleDepositorRole('client')).toBe(false)
  })

  it('lets an unassigned credit stay reviewable', () => {
    const result = matchCreditToDeposits(credit({ amountRappen: 10_000 }), [])
    expect(result.matchClass).toBe('none')
    expect(depositorFromStatementImport()).toBeNull()
  })

  it('does not treat the uploader, instructor, or customer as the depositor', () => {
    expect(depositorFromStatementImport()).toBeNull()
    const assigned = planAttributionChange({
      actorRole: 'admin',
      actorId: 'admin-1',
      depositReportedBy: 'admin-1',
      status: 'reported',
      currentDepositorId: null,
      nextDepositorId: 'staff-9',
    })
    expect(assigned.ok).toBe(true)
    if (assigned.ok) expect(assigned.event.nextUserId).toBe('staff-9')
  })

  it('updates attribution before reconciliation and records the actor', () => {
    const plan = planAttributionChange({
      actorRole: 'admin',
      actorId: 'admin-1',
      depositReportedBy: 'staff-1',
      status: 'matched',
      currentDepositorId: 'staff-1',
      nextDepositorId: 'admin-2',
    })
    expect(plan.ok).toBe(true)
    if (plan.ok) {
      expect(plan.attributionStatus).toBe('reported')
      expect(plan.event.kind).toBe('assign')
      expect(plan.event.actorId).toBe('admin-1')
      expect(plan.event.previousUserId).toBe('staff-1')
    }
  })

  it('requires an explicit correction after reconciliation and does not post again', () => {
    expect(canCorrectAttribution('staff', 'reconciled')).toBe(false)
    const missingReason = planAttributionChange({
      actorRole: 'admin',
      actorId: 'admin-1',
      depositReportedBy: 'staff-1',
      status: 'reconciled',
      currentDepositorId: 'staff-1',
      nextDepositorId: 'admin-2',
      reason: 'no',
    })
    expect(missingReason).toEqual({ ok: false, reason: 'reason_required' })
    const corrected = planAttributionChange({
      actorRole: 'admin',
      actorId: 'admin-1',
      depositReportedBy: 'staff-1',
      status: 'reconciled',
      currentDepositorId: 'staff-1',
      nextDepositorId: 'admin-2',
      reason: 'Falsche Person gewählt',
    })
    expect(corrected.ok).toBe(true)
    if (corrected.ok) expect(corrected.event.kind).toBe('correction')
    const lines = cashToBankTransferLines(10_000)
    expect(lines).toHaveLength(2)
  })

  it('stops a staff member from assigning someone else', () => {
    expect(canAssignDepositor({
      actorRole: 'staff',
      actorId: 'staff-1',
      depositReportedBy: 'staff-1',
      nextDepositorId: 'staff-2',
      status: 'reported',
    })).toBe(false)
  })
})

describe('statement limits and existing invoice matching', () => {
  it('rejects an oversized statement before parsing', () => {
    const oversized = 'a'.repeat(STATEMENT_UPLOAD_MAX_BYTES + 1)
    expect(statementByteLength(oversized)).toBeGreaterThan(STATEMENT_UPLOAD_MAX_BYTES)
  })

  it('does not create a journal from a malformed CSV', () => {
    const parsed = parseCsv('this is not a bank file\n<<<>>>')
    const credits = parsed.rows.filter(row => row.some(cell => cell.includes('SIMYDEP')))
    expect(credits).toHaveLength(0)
    expect(cashToBankTransferLines(0)[0]?.debit_rappen).toBe(0)
  })

  it('keeps invoice reference matching unchanged', () => {
    const invoices: OpenInvoiceForMatching[] = [{
      id: 'inv-1',
      invoice_number: 'RE-2026-0029',
      total_amount_rappen: 19_000,
      payment_status: 'unpaid',
      status: 'sent',
      billing_contact_person: 'Laugnor Isljami',
      billing_company_name: null,
    }]
    const entry: MatchableEntry = {
      amount_rappen: 19_000,
      date: '2026-07-21',
      reference: '',
      reference_raw: '',
      debtor_name: 'Laugnor Isljami',
      iban: '',
      remittance_info: 'Rechnung RE-2026-0029',
      raw_amount: 190,
      bank_ref: null,
      dedupe_key: 't',
    }
    const [result] = matchEntriesToInvoices([entry], invoices, '')
    expect(result.invoice_number).toBe('RE-2026-0029')
    expect(result.match_type).toBe('invoice_number')
  })
})

describe('reporting and tenant checks', () => {
  const base = {
    actorRole: 'admin',
    actorId: 'admin-1',
    actorTenantId: TENANT,
    sourceKind: 'business',
    sourceUserId: null,
    sourceUserTenantId: null,
    sourceUserRole: null,
    depositorUserId: 'admin-1',
    depositorTenantId: TENANT,
    depositorRole: 'admin',
    amountRappen: 10_000,
    reportedOn: '2026-10-01',
  }

  it('lets a one-person tenant report a deposit without a journal', () => {
    expect(validateReportInput(base).ok).toBe(true)
    const plan = planConfirmation({
      deposit: openDeposit({ status: 'reported', candidateDedupeKey: null, journalId: null }),
      bankTenantId: TENANT,
      bankDedupeKey: 'bank-1',
      bankAmountRappen: 10_000,
      bankCurrency: 'CHF',
      bankDirection: 'credit',
      bankAlreadyLinkedDepositId: null,
      matchClass: 'exact',
    })
    expect(plan.action).toBe('reject')
  })

  it('rejects a source user or deposit from another tenant, including a null tenant', () => {
    expect(tenantOwnsResource(null, TENANT)).toBe(false)
    expect(tenantOwnsResource(OTHER, TENANT)).toBe(false)
    expect(validateReportInput({ ...base, sourceKind: 'staff', sourceUserId: 'staff-x', sourceUserTenantId: OTHER, sourceUserRole: 'staff' }).ok).toBe(false)
    expect(validateReportInput({ ...base, depositorUserId: 'staff-x', depositorTenantId: null, depositorRole: 'staff' }).ok).toBe(false)
    expect(() => rejectClientTenantOverride(TENANT, OTHER)).toThrow('tenant')
  })

  it('allows a tenant admin as the depositor and does not require the staff role', () => {
    expect(validateReportInput({ ...base, depositorRole: 'tenant_admin' }).ok).toBe(true)
    expect(isEligibleDepositorRole('super_admin')).toBe(true)
  })
})

describe('statement preview', () => {
  const csv = [
    'Buchungsdatum;Gutschrift;Lastschrift;Referenz;Auftraggeber',
    '2026-10-02;100.00;;Bancomat;Max Muster',
    '2026-10-02;;40.00;Kartenzahlung;Pneu AG',
  ].join('\n')

  it('keeps a manual employee choice out of the parsed credit and ignores a debit', () => {
    const parsed = creditsFromCsv(csv, { date: 'Buchungsdatum', credit: 'Gutschrift', debit: 'Lastschrift', reference: 'Referenz', debtor_name: 'Auftraggeber' })
    const preview = previewStatementLines(parsed.lines, [])
    expect(preview).toHaveLength(2)
    expect(preview[0].direction).toBe('credit')
    expect(preview[0].depositor_user_id).toBeNull()
    expect(preview[1].match_class).toBe('ineligible')
    expect(preview[0].review_text).not.toContain('Max Muster')
    expect(preview[0].remittance).not.toContain('Max Muster')
    expect(preview[1].review_text).not.toContain('Pneu AG')
    expect(preview[0].dedupe_key.toLowerCase()).toContain('max muster')
  })

  it('does not treat a CAMT debtor or a debit as the depositor', () => {
    const xml = `<?xml version="1.0"?><Document><BkToCstmrStmt><Stmt>
      <Ntry><Amt Ccy="CHF">50.00</Amt><CdtDbtInd>DBIT</CdtDbtInd><RvslInd>false</RvslInd><ValDt><Dt>2026-10-02</Dt></ValDt><AcctSvcrRef>CARD-1</AcctSvcrRef>
        <NtryDtls><TxDtls><RltdPties><Cdtr><Nm>Pneu AG</Nm></Cdtr></RltdPties><RmtInf><Ustrd>Karte</Ustrd></RmtInf></TxDtls></NtryDtls></Ntry>
      <Ntry><Amt Ccy="CHF">100.00</Amt><CdtDbtInd>CRDT</CdtDbtInd><RvslInd>true</RvslInd><ValDt><Dt>2026-10-02</Dt></ValDt><AcctSvcrRef>REV-1</AcctSvcrRef></Ntry>
      <Ntry><Amt Ccy="CHF">100.00</Amt><CdtDbtInd>CRDT</CdtDbtInd><ValDt><Dt>2026-10-02</Dt></ValDt><AcctSvcrRef>CASH-1</AcctSvcrRef>
        <NtryDtls><TxDtls><RltdPties><Dbtr><Nm>Max Muster</Nm></Dbtr></RltdPties><RmtInf><Ustrd>Bancomat</Ustrd></RmtInf></TxDtls></NtryDtls></Ntry>
    </Stmt></BkToCstmrStmt></Document>`
    const preview = previewStatementLines(creditsFromCamt(xml).lines, [])
    expect(preview.map(line => line.direction)).toEqual(['debit', 'credit'])
    expect(preview.every(line => line.depositor_user_id === null)).toBe(true)
    expect(JSON.stringify(preview)).not.toContain('Max Muster')
    const again = previewStatementLines(creditsFromCamt(xml).lines, [])
    expect(again.map(line => line.dedupe_key)).toEqual(preview.map(line => line.dedupe_key))
  })

  it('rejects an oversized statement before parsing', () => {
    const oversized = 'a'.repeat(STATEMENT_UPLOAD_MAX_BYTES + 1)
    expect(statementByteLength(oversized)).toBeGreaterThan(STATEMENT_UPLOAD_MAX_BYTES)
    expect(() => assertStatementUploadSize(oversized)).toThrow()
  })
})

describe('migration safety', () => {
  const sql = readFileSync(resolve(process.cwd(), 'migrations/20261013_cash_bank_deposit_reports.sql'), 'utf8')

  it('posts inside one function and does not touch legacy snapshots', () => {
    expect(sql).toContain('FOR UPDATE')
    expect(sql).toContain('confirm_cash_bank_deposit')
    expect(sql).toContain('report_cash_bank_deposit')
    expect(sql).toContain('apply_cash_deposit_attribution')
    expect(sql).toContain('reconciled_locked')
    expect(sql).not.toMatch(/NEW\.depositor_user_id IS DISTINCT FROM OLD\.depositor_user_id/)
    expect(sql).not.toMatch(/DELETE\s+FROM\s+public\.cash_bank_transfer/i)
    expect(sql).not.toMatch(/UPDATE\s+public\.cash_balances/i)
    expect(sql).not.toMatch(/UPDATE\s+public\.tenants/i)
    expect(sql).not.toMatch(/UPDATE\s+public\.cash_transactions/i)
    expect(sql).not.toMatch(/UPDATE\s+public\.cash_movements/i)
    expect(sql).toContain("'1020'")
    expect(sql).toContain("'1000'")
    expect(sql).not.toContain("'3000'")
    expect(sql).not.toContain("'3900'")
  })
})
