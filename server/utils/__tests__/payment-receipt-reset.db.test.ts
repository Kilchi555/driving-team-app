import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { inflateSync } from 'node:zlib'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { Client } from 'pg'
import { computeSimpleBookIncome, recognizedExpenseRappen } from '../accounting'
import { accountingYearStatement, buildAccountingYearPdf } from '../accounting-year-pdf'
import { computeVatQuarter } from '../accounting-vat'
import { netInvoicePaymentsRappen } from '../../../utils/invoice-payment-net'

const databaseUrl = process.env.RECEIPT_RESET_TEST_DATABASE_URL
if (!databaseUrl) {
  throw new Error(
    'RECEIPT_RESET_TEST_DATABASE_URL is required. Receipt-reset SQL tests run on disposable Postgres with the real constraints and triggers. There is no simulated substitute.',
  )
}

const TENANT = '10000000-0000-4000-8000-000000000001'
const OTHER_TENANT = '10000000-0000-4000-8000-000000000002'
const ACTOR = '10000000-0000-4000-8000-000000000010'
const STAFF = '10000000-0000-4000-8000-000000000011'
const OTHER_ACTOR = '10000000-0000-4000-8000-000000000012'
const PAYMENT = '10000000-0000-4000-8000-000000000031'
const SIB_124 = '10000000-0000-4000-8000-000000000032'
const SIB_155 = '10000000-0000-4000-8000-000000000033'
const OTHER_PAYMENT = '10000000-0000-4000-8000-000000000034'
const INVOICE = '10000000-0000-4000-8000-000000000040'
const OTHER_INVOICE = '10000000-0000-4000-8000-000000000041'
const APPT = '10000000-0000-4000-8000-000000000051'
const APPT_124 = '10000000-0000-4000-8000-000000000052'
const APPT_155 = '10000000-0000-4000-8000-000000000053'
const SETTLEMENT = '10000000-0000-4000-8000-000000000060'
const INCOME = '10000000-0000-4000-8000-000000000070'
const RENT = '10000000-0000-4000-8000-000000000071'
const ACCOUNT_DEBIT = '10000000-0000-4000-8000-000000000081'
const ACCOUNT_CREDIT = '10000000-0000-4000-8000-000000000082'

const REASON = 'Synthetic receipt was marked paid by mistake'
const KEY = 'synthetic-reset-1'

let client: Client

function sqlFile(name: string): string {
  return readFileSync(resolve(process.cwd(), name), 'utf8')
}

async function seed(): Promise<void> {
  await client.query('BEGIN')
  await client.query(`
    INSERT INTO users (id, tenant_id, role, first_name, last_name) VALUES
      ($1, $2, 'admin', 'Synthetic', 'Admin'),
      ($3, $2, 'staff', 'Synthetic', 'Staff'),
      ($4, $5, 'tenant_admin', 'Other', 'Admin')
  `, [ACTOR, TENANT, STAFF, OTHER_ACTOR, OTHER_TENANT])
  await client.query(`
    INSERT INTO appointments (id, tenant_id, status) VALUES
      ($1, $4, 'paid'),
      ($2, $4, 'paid'),
      ($3, $4, 'paid')
  `, [APPT, APPT_124, APPT_155, TENANT])
  await client.query(`
    INSERT INTO invoices (
      id, tenant_id, invoice_number, invoice_date, due_date, status, payment_status,
      subtotal_rappen, vat_amount_rappen, total_amount_rappen, paid_amount_rappen, paid_at, document_kind
    ) VALUES (
      $1, $2, 'SYN-2026-0001', CURRENT_DATE - 40, CURRENT_DATE - 1,
      'paid', 'paid', 46500, 0, 46500, 46500, CURRENT_TIMESTAMP, 'invoice'
    )
  `, [INVOICE, TENANT])
  await client.query(`
    INSERT INTO invoice_items (id, invoice_id, tenant_id, appointment_id, total_price_rappen) VALUES
      ('10000000-0000-4000-8000-000000000091', $1, $2, $3, 18600),
      ('10000000-0000-4000-8000-000000000092', $1, $2, $4, 12400),
      ('10000000-0000-4000-8000-000000000093', $1, $2, $5, 15500)
  `, [INVOICE, TENANT, APPT, APPT_124, APPT_155])
  await client.query(`
    INSERT INTO payments (
      id, tenant_id, appointment_id, invoice_id, payment_method, payment_status,
      total_amount_rappen, paid_at, refunded_amount_rappen, description, created_at
    ) VALUES
      ($1, $4, $5, $6, 'invoice', 'pending', 18600, NULL, 0, 'Synthetic 186', CURRENT_TIMESTAMP),
      ($2, $4, $7, $6, 'invoice', 'pending', 12400, NULL, 0, 'Synthetic 124', CURRENT_TIMESTAMP),
      ($3, $4, $8, $6, 'invoice', 'pending', 15500, NULL, 0, 'Synthetic 155', CURRENT_TIMESTAMP)
  `, [PAYMENT, SIB_124, SIB_155, TENANT, APPT, INVOICE, APPT_124, APPT_155])
  await client.query(`
    INSERT INTO invoice_payments (id, invoice_id, tenant_id, payment_method, amount_rappen, status)
    VALUES ($1, $2, $3, 'manual', 46500, 'completed')
  `, [SETTLEMENT, INVOICE, TENANT])
  await client.query(`
    INSERT INTO accounting_entries (
      id, type, amount_rappen, entry_date, description, linked_payment_id, tenant_id, approval_status
    ) VALUES
      ($1, 'income', 18600, CURRENT_DATE, 'Synthetic lesson', $2, $3, 'approved'),
      ($4, 'expense', 5000, CURRENT_DATE, 'Synthetic rent', NULL, $3, 'approved')
  `, [INCOME, PAYMENT, TENANT, RENT])
  await client.query(`
    INSERT INTO accounting_journal_lines (tenant_id, entry_id, account_id, debit_rappen, credit_rappen) VALUES
      ($1, $2, $3, 18600, 0),
      ($1, $2, $4, 0, 18600)
  `, [TENANT, INCOME, ACCOUNT_DEBIT, ACCOUNT_CREDIT])
  await client.query(`
    UPDATE payments
    SET payment_status = 'completed', paid_at = CURRENT_TIMESTAMP
    WHERE tenant_id = $1
  `, [TENANT])
  await client.query(`
    INSERT INTO invoices (
      id, tenant_id, invoice_number, invoice_date, due_date, status, payment_status,
      subtotal_rappen, vat_amount_rappen, total_amount_rappen, paid_amount_rappen, document_kind
    ) VALUES (
      $1, $2, 'SYN-OTHER-1', CURRENT_DATE - 10, CURRENT_DATE, 'paid', 'paid', 9999, 0, 9999, 9999, 'invoice'
    )
  `, [OTHER_INVOICE, OTHER_TENANT])
  await client.query(`
    INSERT INTO payments (
      id, tenant_id, invoice_id, payment_method, payment_status, total_amount_rappen,
      paid_at, refunded_amount_rappen, created_at
    ) VALUES ($1, $2, $3, 'invoice', 'completed', 9999, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP)
  `, [OTHER_PAYMENT, OTHER_TENANT, OTHER_INVOICE])
  await client.query('COMMIT')
}

async function resetDatabase(): Promise<void> {
  await client.query('ROLLBACK')
  await client.query(`
    TRUNCATE
      accounting_journal_lines,
      accounting_entries,
      invoice_payments,
      payments,
      invoice_items,
      invoices,
      appointments,
      cash_transactions,
      bank_import_records,
      payment_receipt_resets,
      users
    RESTART IDENTITY CASCADE
  `)
  await client.query('DROP TRIGGER IF EXISTS receipt_reset_delay_storno ON accounting_entries')
  await client.query('DROP TRIGGER IF EXISTS receipt_reset_fail_audit ON payment_receipt_resets')
}

function resetCall(key: string, expected = 27900) {
  return {
    text: `SELECT public.admin_reset_mistaken_receipt(
      $1::uuid, $2::uuid, $3::uuid, $4::text, $5::text, true, $6::uuid, $7::integer,
      NULL::text, CURRENT_DATE, 'remain_on_invoice', 'leave_unchanged'
    ) AS result`,
    values: [TENANT, ACTOR, PAYMENT, REASON, key, SETTLEMENT, expected],
  }
}

async function applyReset(key = KEY): Promise<Record<string, unknown>> {
  const query = resetCall(key)
  const result = await client.query(query.text, query.values)
  return result.rows[0].result as Record<string, unknown>
}

describe('admin_reset_mistaken_receipt on disposable Postgres', () => {
  beforeAll(async () => {
    client = new Client({ connectionString: databaseUrl })
    await client.connect()
    await client.query('DROP SCHEMA IF EXISTS public CASCADE')
    await client.query('CREATE SCHEMA public')
    await client.query(sqlFile('server/utils/__tests__/fixtures/receipt-reset-schema.sql'))
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role NOLOGIN; END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
      END $$;
    `)
    await client.query(sqlFile('migrations/20261016_admin_reset_mistaken_receipt.sql'))
  }, 30000)

  afterAll(async () => {
    await client.end()
  })

  beforeEach(async () => {
    await resetDatabase()
    await seed()
  })

  it('commits one reversal that the check constraint accepts', async () => {
    await applyReset()
    const reversals = await client.query(
      `SELECT status, amount_rappen FROM invoice_payments WHERE status = 'reversal' AND tenant_id = $1`,
      [TENANT],
    )
    expect(reversals.rowCount).toBe(1)
    expect(reversals.rows[0]).toMatchObject({ status: 'reversal', amount_rappen: 18600 })
    const rejected = client.query(
      `INSERT INTO invoice_payments (invoice_id, tenant_id, payment_method, amount_rappen, status)
       VALUES ($1, $2, 'manual', 100, 'not-a-status')`,
      [INVOICE, TENANT],
    )
    await expect(rejected).rejects.toThrow(/check_payment_status/)
  })

  it('reverses only the 18600 payment on a shared 46500 invoice', async () => {
    const before = await client.query(
      `SELECT COALESCE(sum(total_rappen), 0)::int AS total
       FROM get_payments_monthly_summary($1, EXTRACT(YEAR FROM CURRENT_DATE)::int)`,
      [TENANT],
    )
    expect(before.rows[0].total).toBe(46500)

    await applyReset()

    const invoice = await client.query(
      `SELECT paid_amount_rappen, payment_status, status, paid_at FROM invoices WHERE id = $1`,
      [INVOICE],
    )
    expect(invoice.rows[0]).toMatchObject({
      paid_amount_rappen: 27900,
      payment_status: 'partial',
      status: 'overdue',
      paid_at: null,
    })
    const payments = await client.query(
      `SELECT id, payment_status, paid_at FROM payments WHERE tenant_id = $1 ORDER BY total_amount_rappen`,
      [TENANT],
    )
    const byId = new Map(payments.rows.map(row => [row.id, row]))
    expect(byId.get(PAYMENT)).toMatchObject({ payment_status: 'invoice', paid_at: null })
    expect(byId.get(SIB_124)).toMatchObject({ payment_status: 'completed' })
    expect(byId.get(SIB_155)).toMatchObject({ payment_status: 'completed' })
    expect(byId.get(SIB_124).paid_at).toBeTruthy()
    const appointments = await client.query(`SELECT id, status FROM appointments WHERE tenant_id = $1`, [TENANT])
    expect(appointments.rows.every(row => row.status === 'paid')).toBe(true)
    const history = await client.query(
      `SELECT amount_rappen, status FROM invoice_payments WHERE invoice_id = $1`,
      [INVOICE],
    )
    expect(netInvoicePaymentsRappen(history.rows)).toBe(27900)
    const original = history.rows.find(row => row.status === 'completed')
    expect(original).toMatchObject({ amount_rappen: 46500, status: 'completed' })
  })

  it('keeps partial when the invoice is not past due', async () => {
    await client.query(
      `UPDATE invoices SET due_date = CURRENT_DATE + 10, invoice_date = CURRENT_DATE WHERE id = $1`,
      [INVOICE],
    )
    await applyReset()
    const invoice = await client.query(`SELECT status, payment_status, paid_at FROM invoices WHERE id = $1`, [INVOICE])
    expect(invoice.rows[0]).toMatchObject({ status: 'sent', payment_status: 'partial', paid_at: null })
  })

  it('returns the stored result for the same key and does not repeat the correction for a new key', async () => {
    const first = await applyReset('same-key')
    const replay = await applyReset('same-key')
    const secondKey = await applyReset('other-key')
    expect(first.result).toBe('applied')
    expect(first.replayed).toBe(false)
    expect(replay.replayed).toBe(true)
    expect(replay.result).toBe('applied')
    expect(secondKey.result).toBe('already_applied')
    const counts = await client.query(`
      SELECT
        (SELECT count(*) FROM invoice_payments WHERE status = 'reversal' AND tenant_id = $1) AS reversals,
        (SELECT count(*) FROM accounting_entries WHERE storno_of_id IS NOT NULL AND tenant_id = $1 AND deleted_at IS NULL) AS stornos
    `, [TENANT])
    expect(counts.rows[0]).toMatchObject({ reversals: '1', stornos: '1' })
  })

  it('rejects an inconsistent existing reversal without a unique-constraint error', async () => {
    await client.query(`
      INSERT INTO invoice_payments (invoice_id, tenant_id, payment_method, payment_reference, amount_rappen, status)
      VALUES ($1, $2, 'reversal', $3, 18600, 'reversal')
    `, [INVOICE, TENANT, PAYMENT])
    const query = resetCall('conflict-key')
    await expect(client.query(query.text, query.values)).rejects.toThrow(/reversal_conflict/)
    const payment = await client.query(`SELECT payment_status FROM payments WHERE id = $1`, [PAYMENT])
    expect(payment.rows[0].payment_status).toBe('completed')
    const stornos = await client.query(`SELECT count(*)::int AS n FROM accounting_entries WHERE storno_of_id IS NOT NULL`)
    expect(stornos.rows[0].n).toBe(0)
  })

  it('serializes two corrections and a manual storno into one reversal and one storno', async () => {
    await client.query(`
      CREATE OR REPLACE FUNCTION public.receipt_reset_delay_storno() RETURNS trigger
      LANGUAGE plpgsql AS $fn$
      BEGIN
        IF NEW.external_reference = 'payment-receipt-reset' THEN
          PERFORM pg_sleep(0.4);
        END IF;
        RETURN NEW;
      END
      $fn$
    `)
    await client.query(`
      CREATE TRIGGER receipt_reset_delay_storno
      BEFORE INSERT ON accounting_entries
      FOR EACH ROW EXECUTE FUNCTION public.receipt_reset_delay_storno()
    `)
    const left = new Client({ connectionString: databaseUrl })
    const right = new Client({ connectionString: databaseUrl })
    const manual = new Client({ connectionString: databaseUrl })
    await left.connect()
    await right.connect()
    await manual.connect()
    const first = resetCall('parallel-a')
    const second = resetCall('parallel-b')
    const results = await Promise.allSettled([
      left.query(first.text, first.values),
      right.query(second.text, second.values),
      manual.query(`
        INSERT INTO accounting_entries (
          type, amount_rappen, entry_date, description, storno_of_id, tenant_id, approval_status
        ) VALUES ('expense', 18600, CURRENT_DATE, 'Manual storno', $1, $2, 'approved')
      `, [INCOME, TENANT]),
    ])
    await left.end()
    await right.end()
    await manual.end()
    const failures = results.filter(result => result.status === 'rejected') as PromiseRejectedResult[]
    for (const failure of failures) {
      expect(String(failure.reason)).toMatch(/duplicate key|23505|unique/i)
    }
    const counts = await client.query(`
      SELECT
        (SELECT count(*) FROM invoice_payments WHERE status = 'reversal' AND tenant_id = $1) AS reversals,
        (SELECT count(*) FROM accounting_entries WHERE storno_of_id = $2 AND deleted_at IS NULL) AS stornos,
        (SELECT payment_status FROM payments WHERE id = $3) AS payment_status
    `, [TENANT, INCOME, PAYMENT])
    expect(counts.rows[0].reversals).toBe('1')
    expect(counts.rows[0].stornos).toBe('1')
    expect(counts.rows[0].payment_status).toBe('invoice')
    const marker = await client.query(
      `SELECT external_reference FROM accounting_entries WHERE storno_of_id = $1`,
      [INCOME],
    )
    expect(marker.rows[0].external_reference).toBe('payment-receipt-reset')
    await expect(client.query(`
      INSERT INTO accounting_entries (
        type, amount_rappen, entry_date, description, storno_of_id, tenant_id, approval_status
      ) VALUES ('expense', 18600, CURRENT_DATE, 'Second storno', $1, $2, 'approved')
    `, [INCOME, TENANT])).rejects.toThrow(/accounting_entries_one_live_storno|duplicate key/)
  })

  it('removes the amount from payment income once and leaves the marked storno out of expenses, VAT, and the journal net', async () => {
    await applyReset()
    const summary = await client.query(
      `SELECT COALESCE(sum(total_rappen), 0)::int AS total
       FROM get_payments_monthly_summary($1, EXTRACT(YEAR FROM CURRENT_DATE)::int)`,
      [TENANT],
    )
    expect(summary.rows[0].total).toBe(27900)
    const entries = await client.query(`
      SELECT id, type, amount_rappen, linked_payment_id, storno_of_id, external_reference,
             document_kind, entry_date::text
      FROM accounting_entries
      WHERE tenant_id = $1 AND deleted_at IS NULL
    `, [TENANT])
    const income = computeSimpleBookIncome({
      paymentsIncomeRappen: summary.rows[0].total,
      entries: entries.rows,
    })
    const expenses = recognizedExpenseRappen(entries.rows)
    expect(income.paymentsIncomeRappen).toBe(27900)
    expect(income.manualIncomeRappen).toBe(0)
    expect(income.totalIncomeRappen).toBe(27900)
    expect(expenses).toBe(5000)
    expect(income.totalIncomeRappen - expenses).toBe(22900)
    const linkedIncome = entries.rows.filter(row => row.linked_payment_id === PAYMENT && !row.storno_of_id)
    expect(linkedIncome).toHaveLength(1)

    const invoice = await client.query(
      `SELECT invoice_date::text, status, vat_amount_rappen, subtotal_rappen, total_amount_rappen
       FROM invoices WHERE id = $1`,
      [INVOICE],
    )
    const invoiceDate = String(invoice.rows[0].invoice_date)
    const invoiceYear = Number(invoiceDate.slice(0, 4))
    const invoiceMonth = Number(invoiceDate.slice(5, 7))
    const quarter = Math.ceil(invoiceMonth / 3)
    const reversed = new Set(entries.rows.filter(row => row.storno_of_id).map(row => row.storno_of_id as string))
    const vat = computeVatQuarter(invoiceYear, quarter, {
      defaultVatRate: 0,
      invoices: invoice.rows,
      incomeEntries: entries.rows.filter(row => row.type === 'income').map(row => ({
        entry_date: row.entry_date,
        amount_rappen: row.amount_rappen,
        storno_of_id: row.storno_of_id,
        is_reversed: reversed.has(row.id),
        linked_payment_id: row.linked_payment_id,
        payment_has_invoice: Boolean(row.linked_payment_id),
      })),
      expenseEntries: entries.rows.filter(row => row.type === 'expense').map(row => ({
        entry_date: row.entry_date,
        amount_rappen: row.amount_rappen,
        storno_of_id: row.storno_of_id,
        is_reversed: reversed.has(row.id),
        external_reference: row.external_reference,
      })),
    }, false)
    expect(vat.exempt_turnover_rappen).toBe(46500)
    expect(vat.output_vat_rappen).toBe(0)
    expect(vat.input_vat_rappen).toBe(0)

    const lines = await client.query(`
      SELECT account_id, sum(debit_rappen)::int AS debit, sum(credit_rappen)::int AS credit
      FROM accounting_journal_lines
      WHERE tenant_id = $1
      GROUP BY account_id
    `, [TENANT])
    const byAccount = new Map(lines.rows.map(row => [row.account_id, row]))
    expect(byAccount.get(ACCOUNT_DEBIT)).toEqual({ account_id: ACCOUNT_DEBIT, debit: 18600, credit: 18600 })
    expect(byAccount.get(ACCOUNT_CREDIT)).toEqual({ account_id: ACCOUNT_CREDIT, debit: 18600, credit: 18600 })

    const year = accountingYearStatement({
      paymentsIncomeRappen: summary.rows[0].total,
      entries: entries.rows,
    })
    expect(year).toEqual({ incomeRappen: 27900, expenseRappen: 5000, resultRappen: 22900 })
    const pdf = await buildAccountingYearPdf({
      supabase: {
        rpc: async () => ({ data: [{ total_rappen: summary.rows[0].total }], error: null }),
        from: () => ({
          select: () => ({
            eq: () => ({
              eq: () => ({
                is: () => ({
                  gte: () => ({
                    lte: () => ({
                      order: () => ({
                        range: async () => ({
                          data: entries.rows.map(row => ({ ...row, receipt_url: null, category: { name: 'Synthetic' } })),
                          error: null,
                        }),
                      }),
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
      } as never,
      tenantId: TENANT,
      tenantName: 'Synthetic Driving School',
      year: invoiceYear,
    })
    const inflated = inflateSync(pdf.subarray(pdf.indexOf('stream\n') + 7, pdf.indexOf('endstream'))).toString('latin1')
    const pdfText = inflated.replace(/<([0-9A-Fa-f]+)>/g, (_match, hex: string) => Buffer.from(hex, 'hex').toString('latin1'))
    expect(pdfText).toContain('CHF 279.00')
    expect(pdfText).toContain('CHF 50.00')
    expect(pdfText).toContain('CHF 229.00')
    expect(pdfText).not.toContain('CHF 236.00')
  })

  it('rejects stored cash, Wallee, refund, and bank-import facts', async () => {
    const cases: Array<{ sql: string; values: unknown[]; error: RegExp }> = [
      {
        sql: `INSERT INTO cash_transactions (appointment_id, tenant_id, amount_rappen) VALUES ($1, NULL, 18600)`,
        values: [APPT],
        error: /actual_receipt_channel/,
      },
      {
        sql: `UPDATE payments SET wallee_transaction_id = 'tx-synthetic' WHERE id = $1`,
        values: [PAYMENT],
        error: /actual_receipt_channel/,
      },
      {
        sql: `UPDATE payments SET refunded_amount_rappen = 100 WHERE id = $1`,
        values: [PAYMENT],
        error: /actual_receipt_channel/,
      },
      {
        sql: `INSERT INTO bank_import_records (tenant_id, invoice_id, dedupe_key, amount_rappen) VALUES ($1, $2, 'synthetic-bank', 46500)`,
        values: [TENANT, INVOICE],
        error: /bank_settlement_present/,
      },
    ]
    for (const entry of cases) {
      await client.query('BEGIN')
      await client.query(entry.sql, entry.values)
      const query = resetCall(`blocked-${entry.error.source}`)
      await expect(client.query(query.text, query.values)).rejects.toThrow(entry.error)
      await client.query('ROLLBACK')
    }
    const payment = await client.query(`SELECT payment_status, wallee_transaction_id, refunded_amount_rappen FROM payments WHERE id = $1`, [PAYMENT])
    expect(payment.rows[0]).toMatchObject({
      payment_status: 'completed',
      wallee_transaction_id: null,
      refunded_amount_rappen: 0,
    })
    const reversals = await client.query(`SELECT count(*)::int AS n FROM invoice_payments WHERE status = 'reversal'`)
    expect(reversals.rows[0].n).toBe(0)
  })

  it('does not let another tenant or a staff actor change the payment', async () => {
    const staff = client.query(
      `SELECT public.admin_reset_mistaken_receipt(
        $1, $2, $3, $4, 'staff-key', true, $5, 27900, NULL, CURRENT_DATE, 'remain_on_invoice', 'leave_unchanged'
      )`,
      [TENANT, STAFF, PAYMENT, REASON, SETTLEMENT],
    )
    await expect(staff).rejects.toThrow(/forbidden/)
    const foreignPayment = client.query(
      `SELECT public.admin_reset_mistaken_receipt(
        $1, $2, $3, $4, 'foreign-payment', true, $5, 27900, NULL, CURRENT_DATE, 'remain_on_invoice', 'leave_unchanged'
      )`,
      [TENANT, ACTOR, OTHER_PAYMENT, REASON, SETTLEMENT],
    )
    await expect(foreignPayment).rejects.toThrow(/payment_not_found/)
    const foreignActor = client.query(
      `SELECT public.admin_reset_mistaken_receipt(
        $1, $2, $3, $4, 'foreign-actor', true, $5, 27900, NULL, CURRENT_DATE, 'remain_on_invoice', 'leave_unchanged'
      )`,
      [TENANT, OTHER_ACTOR, PAYMENT, REASON, SETTLEMENT],
    )
    await expect(foreignActor).rejects.toThrow(/forbidden/)
    const privilege = await client.query(`
      SELECT has_function_privilege(
        'authenticated',
        'public.admin_reset_mistaken_receipt(uuid,uuid,uuid,text,text,boolean,uuid,integer,text,date,text,text)',
        'EXECUTE'
      ) AS allowed
    `)
    expect(privilege.rows[0].allowed).toBe(false)
    const untouched = await client.query(`SELECT payment_status FROM payments WHERE id = $1 OR id = $2 ORDER BY id`, [PAYMENT, OTHER_PAYMENT])
    expect(untouched.rows.every(row => row.payment_status === 'completed')).toBe(true)
  })

  it('rolls back every write when a later audit insert fails', async () => {
    await client.query('BEGIN')
    await client.query(`
      CREATE OR REPLACE FUNCTION public.receipt_reset_fail_audit() RETURNS trigger
      LANGUAGE plpgsql AS $fn$
      BEGIN
        IF NEW.reason LIKE '%FORCE_ATOMIC_FAIL%' THEN
          RAISE EXCEPTION 'forced_audit_failure';
        END IF;
        RETURN NEW;
      END
      $fn$
    `)
    await client.query(`
      CREATE TRIGGER receipt_reset_fail_audit
      BEFORE INSERT ON payment_receipt_resets
      FOR EACH ROW EXECUTE FUNCTION public.receipt_reset_fail_audit()
    `)
    const failing = client.query(
      `SELECT public.admin_reset_mistaken_receipt(
        $1, $2, $3, 'FORCE_ATOMIC_FAIL synthetic', 'atomic-key', true, $4, 27900,
        NULL, CURRENT_DATE, 'remain_on_invoice', 'leave_unchanged'
      )`,
      [TENANT, ACTOR, PAYMENT, SETTLEMENT],
    )
    await expect(failing).rejects.toThrow(/forced_audit_failure/)
    await client.query('ROLLBACK')
    const payment = await client.query(`SELECT payment_status, paid_at FROM payments WHERE id = $1`, [PAYMENT])
    expect(payment.rows[0].payment_status).toBe('completed')
    expect(payment.rows[0].paid_at).toBeTruthy()
    const invoice = await client.query(`SELECT paid_amount_rappen, status, payment_status, paid_at FROM invoices WHERE id = $1`, [INVOICE])
    expect(invoice.rows[0]).toMatchObject({
      paid_amount_rappen: 46500,
      status: 'paid',
      payment_status: 'paid',
    })
    expect(invoice.rows[0].paid_at).toBeTruthy()
    const leftovers = await client.query(`
      SELECT
        (SELECT count(*) FROM invoice_payments WHERE status = 'reversal') AS reversals,
        (SELECT count(*) FROM accounting_entries WHERE storno_of_id IS NOT NULL) AS stornos,
        (SELECT count(*) FROM payment_receipt_resets) AS audits
    `)
    expect(leftovers.rows[0]).toMatchObject({ reversals: '0', stornos: '0', audits: '0' })
  })

  it('records the actor, reason, reversal, storno, and paid-amount transition', async () => {
    const result = await applyReset()
    const audit = await client.query(`SELECT * FROM payment_receipt_resets WHERE idempotency_key = $1`, [KEY])
    expect(audit.rowCount).toBe(1)
    expect(audit.rows[0]).toMatchObject({
      tenant_id: TENANT,
      payment_id: PAYMENT,
      actor_user_id: ACTOR,
      reason: REASON,
      previous_status: 'completed',
      new_status: 'invoice',
      invoice_id: INVOICE,
      settlement_id: SETTLEMENT,
      reversal_id: result.reversal_id,
      accounting_entry_id: INCOME,
      storno_entry_id: result.storno_entry_id,
      paid_amount_before: 46500,
      paid_amount_after: 27900,
      confirm_siblings: true,
      invoice_line_disposition: 'remain_on_invoice',
      appointment_disposition: 'leave_unchanged',
      result: 'applied',
    })
    expect(audit.rows[0].created_at).toBeTruthy()
    expect(result.paid_amount_before_rappen).toBe(46500)
    expect(result.paid_amount_after_rappen).toBe(27900)
  })
})
