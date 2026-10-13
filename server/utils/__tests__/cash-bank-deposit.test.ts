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
  applyTransferToBalances,
  cashToBankReversalLines,
  cashToBankTransferLines,
  collectCompletePages,
  commitConfirmation,
  depositorFromStatementImport,
  duplicateImportKeepsAttribution,
  identifySourceDrawer,
  isEligibleDepositorRole,
  matchCreditToDeposits,
  OPEN_DEPOSIT_PAGE_SIZE,
  openReportFingerprint,
  planAttributionChange,
  planConfirmation,
  planReversal,
  referenceTokenForDeposit,
  repeatedOpenReport,
  rejectClientTenantOverride,
  tenantOwnsResource,
  transferTouchesProfitAndLoss,
  validateReportInput,
  type BankCreditInput,
  type DepositMatchInput,
  type ExistingBankRow,
  type OpenDeposit,
  type StatementEvidence,
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

function evidence(partial: Partial<StatementEvidence> = {}): StatementEvidence {
  return {
    statementLineId: 'line-1',
    statementTenantId: TENANT,
    recomputedDedupeKey: 'bank-1',
    storedDedupeKey: 'bank-1',
    amountRappen: 10_000,
    currency: 'CHF',
    entryDate: '2026-10-02',
    direction: 'credit',
    reference: '',
    remittance: 'SIMYDEPDEP1',
    ...partial,
  }
}

function confirmation(partial: {
  deposit?: OpenDeposit
  evidence?: StatementEvidence | null
  bankRow?: ExistingBankRow | null
  drawerCount?: number
} = {}) {
  return planConfirmation({
    deposit: partial.deposit ?? openDeposit(),
    evidence: partial.evidence === undefined ? evidence() : partial.evidence,
    bankRow: partial.bankRow ?? null,
    drawerCount: partial.drawerCount ?? 1,
  })
}

describe('cash-to-bank deposit reports', () => {
  it('reports a one-person deposit without posting a journal', () => {
    const lines = cashToBankTransferLines(10_000)
    const plan = confirmation({ deposit: openDeposit({ status: 'reported', candidateDedupeKey: null }), evidence: null })
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
    const plan = confirmation({ deposit: openDeposit({ status: 'reported', candidateDedupeKey: null }), evidence: null })
    expect(plan.action).toBe('reject')
  })

  it('posts one Dr 1020 / Cr 1000 transfer on confirmation', () => {
    const plan = confirmation()
    expect(plan.action).toBe('post')
    if (plan.action === 'post') {
      expect(plan.lines).toEqual(cashToBankTransferLines(10_000))
      expect(transferTouchesProfitAndLoss(plan.lines)).toBe(false)
    }
  })

  it('returns already reconciled on a repeated confirmation', () => {
    const plan = confirmation({
      deposit: openDeposit({ status: 'reconciled', journalId: 'journal-1' }),
      evidence: null,
    })
    expect(plan).toEqual({ action: 'already_reconciled', journalId: 'journal-1' })
  })

  it('rejects a second journal when two confirms race after the first post', () => {
    const first = commitConfirmation(openDeposit(), 'posted', 'journal-1', 'import-1')
    const second = confirmation({ deposit: first, evidence: null })
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
    const plan = confirmation({ evidence: evidence({ remittance: 'Bancomat', reference: '' }) })
    expect(plan).toEqual({ action: 'reject', reason: 'insufficient_evidence' })
  })

  it('leaves a partial or aggregate amount unresolved', () => {
    const result = matchCreditToDeposits(credit({ amountRappen: 9_500, remittance: token }), [one])
    expect(result.matchClass).toBe('unresolved_amount')
    const plan = confirmation({ evidence: evidence({ amountRappen: 9_500 }) })
    expect(plan.action).toBe('reject')
  })

  it('rejects a bank line from another tenant', () => {
    const plan = confirmation({ evidence: evidence({ statementTenantId: OTHER }) })
    expect(plan).toEqual({ action: 'reject', reason: 'tenant' })
  })

  it('rejects a deposit that already belongs to another bank line', () => {
    const plan = confirmation({
      bankRow: {
        amountRappen: 10_000,
        currency: 'CHF',
        entryDate: '2026-10-02',
        source: 'cash_statement',
        linkedDepositId: 'dep-other',
        invoiceId: null,
        accountingEntryId: null,
      },
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
    const plan = confirmation({
      deposit: openDeposit({ status: 'reported', candidateDedupeKey: null, journalId: null }),
      evidence: null,
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
    expect(preview[0].currency).toBe('UNKNOWN')
  })

  it('keeps an explicit CHF currency and does not relabel EUR as CHF', () => {
    const withCurrency = [
      'Buchungsdatum;Gutschrift;Währung;Referenz',
      '2026-10-02;100.00;CHF;Bancomat',
      '2026-10-02;40.00;EUR;Ausland',
      '2026-10-02;20.00;;Leer',
    ].join('\n')
    const parsed = creditsFromCsv(withCurrency, { date: 'Buchungsdatum', credit: 'Gutschrift', currency: 'Währung', reference: 'Referenz' })
    expect(parsed.lines.map(line => line.currency)).toEqual(['CHF', 'EUR', ''])
    expect(previewStatementLines(parsed.lines, []).map(line => line.currency)).toEqual(['CHF', 'EUR', 'UNKNOWN'])
    expect(matchCreditToDeposits({ ...parsed.lines[1], dedupeKey: parsed.lines[1].dedupeKey }, []).matchClass).toBe('ineligible')
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
    expect(preview.map(line => line.direction)).toEqual(['debit', 'reversal', 'credit'])
    expect(preview.map(line => line.currency)).toEqual(['CHF', 'CHF', 'CHF'])
    expect(preview.every(line => line.depositor_user_id === null)).toBe(true)
    expect(JSON.stringify(preview)).not.toContain('Max Muster')
    const again = previewStatementLines(creditsFromCamt(xml).lines, [])
    expect(again.map(line => line.dedupe_key)).toEqual(preview.map(line => line.dedupe_key))
  })

  it('does not label a CAMT amount without a currency as CHF', () => {
    const xml = `<?xml version="1.0"?><Document><BkToCstmrStmt><Stmt>
      <Ntry><Amt>10.00</Amt><CdtDbtInd>CRDT</CdtDbtInd><ValDt><Dt>2026-10-02</Dt></ValDt><AcctSvcrRef>NO-CCY</AcctSvcrRef></Ntry>
    </Stmt></BkToCstmrStmt></Document>`
    const lines = creditsFromCamt(xml).lines
    expect(lines[0].currency).toBe('')
    expect(previewStatementLines(lines, [])[0].currency).toBe('UNKNOWN')
  })

  it('rejects an oversized statement before parsing', () => {
    const oversized = 'a'.repeat(STATEMENT_UPLOAD_MAX_BYTES + 1)
    expect(statementByteLength(oversized)).toBeGreaterThan(STATEMENT_UPLOAD_MAX_BYTES)
    expect(() => assertStatementUploadSize(oversized)).toThrow()
  })
})

describe('migration safety', () => {
  const original = readFileSync(resolve(process.cwd(), 'migrations/20261013_cash_bank_deposit_reports.sql'), 'utf8')
  const sql = readFileSync(resolve(process.cwd(), 'migrations/20261013_cash_bank_phase1_remediation.sql'), 'utf8')

  it('posts the transfer and the storno inside locked functions', () => {
    expect(original).toContain('confirm_cash_bank_deposit')
    expect(sql).toContain('FOR UPDATE')
    expect(sql).toContain('reverse_cash_bank_deposit')
    expect(sql).toContain('persist_cash_bank_statement_lines')
    expect(sql).toContain('cash_bank_statement_lines')
    expect(sql).toContain('UPDATE public.cash_balances')
    expect(sql).toContain('UPDATE public.tenants')
    expect(sql).toContain('cash_to_bank')
    expect(sql).not.toMatch(/DELETE\s+FROM\s+public\.cash_bank_transfer/i)
    expect(sql).not.toMatch(/UPDATE\s+public\.cash_transactions/i)
    expect(sql).not.toMatch(/INSERT\s+INTO\s+public\.accounting_entries/i)
    expect(sql).not.toContain('v_dep.candidate_dedupe_key')
    expect(sql).toContain("'1020'")
    expect(sql).toContain("'1000'")
    expect(sql).not.toContain("'3000'")
    expect(sql).not.toContain("'3900'")
    expect(sql).not.toContain("'1090'")
  })
})

describe('authoritative balances and storno', () => {
  it('moves the drawer and the bank by the same amount and keeps cash close at zero', () => {
    const posted = applyTransferToBalances({ drawerBalance: 50_000, bankBalance: 20_000, amountRappen: 10_000, direction: 'to_bank' })
    expect(posted).toEqual({ ok: true, drawerBalance: 40_000, bankBalance: 30_000 })
    if (!posted.ok) return
    const counted = posted.drawerBalance
    expect(counted - posted.drawerBalance).toBe(0)
    const untouchedBook = 50_000
    expect(counted - untouchedBook).toBe(-10_000)
  })

  it('rejects a short drawer and an unknown currency', () => {
    expect(applyTransferToBalances({ drawerBalance: 100, bankBalance: 0, amountRappen: 10_000, direction: 'to_bank' })).toEqual({ ok: false, reason: 'insufficient_drawer' })
    expect(confirmation({ evidence: evidence({ currency: '' }) })).toEqual({ action: 'reject', reason: 'currency' })
    expect(confirmation({ evidence: evidence({ currency: 'EUR' }) })).toEqual({ action: 'reject', reason: 'currency' })
    expect(confirmation({ evidence: null })).toEqual({ action: 'reject', reason: 'missing_statement_line' })
    expect(confirmation({ evidence: evidence({ recomputedDedupeKey: 'forged' }) })).toEqual({ action: 'reject', reason: 'forged_dedupe' })
    expect(confirmation({ evidence: evidence({ entryDate: '2026-12-01' }) })).toEqual({ action: 'reject', reason: 'date' })
  })

  it('rejects an invoice or expense line and a mismatched stored bank row', () => {
    expect(confirmation({
      bankRow: {
        amountRappen: 10_000, currency: 'CHF', entryDate: '2026-10-02', source: 'camt',
        linkedDepositId: null, invoiceId: 'inv-1', accountingEntryId: null,
      },
    })).toEqual({ action: 'reject', reason: 'bank_line_used' })
    expect(confirmation({
      bankRow: {
        amountRappen: 10_000, currency: 'CHF', entryDate: '2026-10-02', source: 'camt',
        linkedDepositId: null, invoiceId: null, accountingEntryId: 'exp-1',
      },
    })).toEqual({ action: 'reject', reason: 'bank_line_used' })
    expect(confirmation({
      bankRow: {
        amountRappen: 9_000, currency: 'CHF', entryDate: '2026-10-02', source: 'cash_statement',
        linkedDepositId: null, invoiceId: null, accountingEntryId: null,
      },
    })).toEqual({ action: 'reject', reason: 'bank_row_mismatch' })
    expect(confirmation({
      bankRow: {
        amountRappen: 10_000, currency: null, entryDate: '2026-10-02', source: 'cash_statement',
        linkedDepositId: null, invoiceId: null, accountingEntryId: null,
      },
    })).toEqual({ action: 'reject', reason: 'bank_row_mismatch' })
    expect(confirmation({
      bankRow: {
        amountRappen: 10_000, currency: 'CHF', entryDate: '2026-10-02', source: 'camt',
        linkedDepositId: null, invoiceId: null, accountingEntryId: null,
      },
    })).toEqual({ action: 'reject', reason: 'ordinary_payment' })
  })

  it('uses one drawer or none', () => {
    const rows = [
      { id: 'office-1', tenantId: TENANT, instructorId: 'admin-1', officeRegisterId: 'reg-1', registerType: 'office' },
      { id: 'office-2', tenantId: TENANT, instructorId: 'admin-1', officeRegisterId: 'reg-2', registerType: 'office' },
      { id: 'staff-1', tenantId: TENANT, instructorId: 'staff-1', officeRegisterId: null, registerType: 'instructor' },
      { id: 'other', tenantId: OTHER, instructorId: 'staff-1', officeRegisterId: null, registerType: 'instructor' },
    ]
    expect(identifySourceDrawer({ tenantId: TENANT, sourceKind: 'business', sourceUserId: null, rows }).ok).toBe(false)
    expect(identifySourceDrawer({ tenantId: TENANT, sourceKind: 'staff', sourceUserId: 'staff-1', rows })).toMatchObject({ ok: true, drawerId: 'staff-1', movement: 'staff' })
    expect(identifySourceDrawer({ tenantId: TENANT, sourceKind: 'staff', sourceUserId: 'missing', rows })).toEqual({ ok: false, reason: 'drawer_missing' })
    expect(confirmation({ drawerCount: 0 })).toEqual({ action: 'reject', reason: 'drawer_missing' })
    expect(confirmation({ drawerCount: 2 })).toEqual({ action: 'reject', reason: 'drawer_ambiguous' })
  })

  it('reverses once and restores both balances', () => {
    const first = planReversal({
      role: 'admin', reason: 'Falsche Zeile', status: 'reconciled', journalId: 'j-1', reversalJournalId: null,
      amountRappen: 10_000, drawerBalance: 40_000, bankBalance: 30_000,
    })
    expect(first.action).toBe('reverse')
    if (first.action !== 'reverse') return
    expect(first.lines).toEqual(cashToBankReversalLines(10_000))
    expect(transferTouchesProfitAndLoss(first.lines)).toBe(false)
    expect(first.drawerBalance).toBe(50_000)
    expect(first.bankBalance).toBe(20_000)
    expect(planReversal({
      role: 'admin', reason: 'Nochmals', status: 'reversed', journalId: 'j-1', reversalJournalId: 'j-2',
      amountRappen: 10_000, drawerBalance: 50_000, bankBalance: 20_000,
    }).action).toBe('already_reversed')
    expect(planReversal({
      role: 'staff', reason: 'Falsche Zeile', status: 'reconciled', journalId: 'j-1', reversalJournalId: null,
      amountRappen: 10_000, drawerBalance: 40_000, bankBalance: 30_000,
    })).toEqual({ action: 'reject', reason: 'forbidden' })
    expect(planReversal({
      role: 'admin', reason: 'no', status: 'reconciled', journalId: 'j-1', reversalJournalId: null,
      amountRappen: 10_000, drawerBalance: 40_000, bankBalance: 30_000,
    })).toEqual({ action: 'reject', reason: 'reason_required' })
  })

  it('treats a repeated open report as the same operation and fails closed on a truncated page', async () => {
    const fingerprint = openReportFingerprint({
      sourceKind: 'staff', sourceUserId: 'staff-1', amountRappen: 10_000, reportedOn: '2026-10-01', depositorUserId: 'staff-1',
    })
    expect(repeatedOpenReport({ existingStatus: 'reported', existingFingerprint: fingerprint, incomingFingerprint: fingerprint })).toBe(true)
    expect(repeatedOpenReport({ existingStatus: 'reconciled', existingFingerprint: fingerprint, incomingFingerprint: fingerprint })).toBe(false)
    const complete = await collectCompletePages(async (from) => (from === 0 ? [{ id: 'a' }] : []))
    expect(complete).toEqual([{ id: 'a' }])
    await expect(collectCompletePages(async () => Array.from({ length: OPEN_DEPOSIT_PAGE_SIZE }, (_, index) => index))).rejects.toThrow('incomplete_candidates')
  })
})

describe('existing import size cap', () => {
  const routes = [
    'server/api/invoices/csv-import.post.ts',
    'server/api/invoices/csv-import-detect.post.ts',
    'server/api/invoices/camt-import.post.ts',
    'server/api/admin/accounting/import-camt.post.ts',
  ]

  it('parses a CSV above 1 MiB and leaves the older import routes uncapped', () => {
    const padding = 'x'.repeat(STATEMENT_UPLOAD_MAX_BYTES)
    const csv = `Buchungsdatum;Gutschrift;Währung;Referenz\n2026-10-02;100.00;CHF;${padding}\n`
    expect(statementByteLength(csv)).toBeGreaterThan(STATEMENT_UPLOAD_MAX_BYTES)
    const parsed = creditsFromCsv(csv, { date: 'Buchungsdatum', credit: 'Gutschrift', currency: 'Währung', reference: 'Referenz' })
    expect(parsed.lines).toHaveLength(1)
    expect(parsed.lines[0].currency).toBe('CHF')
    for (const route of routes) {
      const source = readFileSync(resolve(process.cwd(), route), 'utf8')
      expect(source).not.toContain('assertStatementUploadSize')
    }
    const preview = readFileSync(resolve(process.cwd(), 'server/api/admin/cash-bank-deposits.post.ts'), 'utf8')
    expect(preview).toContain('assertStatementUploadSize')
  })
})
