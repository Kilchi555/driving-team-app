/**
 * Disposable in-process Postgres for the integrity migration.
 * These tests execute SQL. They are not a production migration and they
 * do not use production data. The invoice-credit unit test's rpc() is a mock.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'

const TENANT_A = '11111111-1111-4111-8111-111111111111'
const TENANT_B = '22222222-2222-4222-8222-222222222222'
const ACTOR = '33333333-3333-4333-8333-333333333333'
const STUDENT = '33333333-3333-4333-8333-333333333334'
const OTHER = '33333333-3333-4333-8333-333333333335'
const INVOICE = '44444444-4444-4444-8444-444444444444'

let db: PGlite

beforeAll(async () => {
  db = new PGlite()
  await db.exec(`
    CREATE ROLE anon NOLOGIN;
    CREATE ROLE authenticated NOLOGIN;
    CREATE ROLE service_role NOLOGIN;

    CREATE TABLE public.users (
      id uuid PRIMARY KEY,
      tenant_id uuid,
      role text,
      is_active boolean
    );
    CREATE TABLE public.payments (
      id uuid PRIMARY KEY,
      tenant_id uuid,
      user_id uuid,
      invoice_id uuid,
      appointment_id uuid,
      payment_status text,
      payment_method text,
      paid_at timestamptz,
      updated_at timestamptz,
      amount_paid_rappen integer,
      metadata jsonb
    );
    CREATE TABLE public.invoices (
      id uuid PRIMARY KEY,
      tenant_id uuid,
      user_id uuid,
      total_amount_rappen integer,
      paid_amount_rappen integer,
      payment_status text,
      status text,
      paid_at timestamptz,
      updated_at timestamptz,
      internal_notes text,
      dunning_level integer,
      dunning_paused boolean,
      credit_applied_rappen integer,
      credit_applied_at timestamptz
    );
    CREATE TABLE public.invoice_items (
      invoice_id uuid,
      tenant_id uuid,
      appointment_id uuid
    );
    CREATE TABLE public.invoice_payments (
      id uuid PRIMARY KEY DEFAULT (substr(md5(random()::text || clock_timestamp()::text), 1, 8) || '-1111-4111-8111-' || substr(md5(random()::text), 1, 12))::uuid,
      invoice_id uuid,
      tenant_id uuid,
      amount_rappen integer NOT NULL CHECK (amount_rappen > 0),
      payment_date timestamptz,
      payment_method text,
      notes text,
      status text,
      currency text,
      created_at timestamptz DEFAULT now()
    );
    CREATE TABLE public.bank_import_records (
      id uuid PRIMARY KEY DEFAULT (substr(md5(random()::text || clock_timestamp()::text), 1, 8) || '-1111-4111-8111-' || substr(md5(random()::text), 1, 12))::uuid,
      tenant_id uuid,
      dedupe_key text,
      bank_ref text,
      entry_date date,
      amount_rappen integer,
      reference text,
      debtor_name text,
      invoice_id uuid,
      imported_by uuid,
      source text,
      UNIQUE (tenant_id, dedupe_key)
    );
    CREATE TABLE public.student_credits (
      id uuid PRIMARY KEY DEFAULT (substr(md5(random()::text || clock_timestamp()::text), 1, 8) || '-1111-4111-8111-' || substr(md5(random()::text), 1, 12))::uuid,
      user_id uuid,
      tenant_id uuid,
      balance_rappen integer NOT NULL DEFAULT 0,
      pending_withdrawal_rappen integer NOT NULL DEFAULT 0,
      updated_at timestamptz,
      UNIQUE (user_id, tenant_id)
    );
    CREATE TABLE public.credit_transactions (
      id uuid PRIMARY KEY DEFAULT (substr(md5(random()::text || clock_timestamp()::text), 1, 8) || '-1111-4111-8111-' || substr(md5(random()::text), 1, 12))::uuid,
      user_id uuid,
      tenant_id uuid,
      transaction_type text,
      amount_rappen integer,
      balance_before_rappen integer,
      balance_after_rappen integer,
      payment_method text,
      reference_id uuid,
      reference_type text,
      notes text,
      description text,
      created_by uuid,
      status text
    );
  `)
  await db.exec(`
    CREATE OR REPLACE FUNCTION public.increment_balance(p_user_id uuid, p_tenant_id uuid, p_amount integer)
    RETURNS TABLE(balance_rappen integer, pending_withdrawal_rappen integer)
    LANGUAGE plpgsql AS $fn$
    DECLARE v_row public.student_credits%ROWTYPE;
    BEGIN
      IF coalesce(current_setting('test.fail_balance', true), '') = 'on' THEN
        RAISE EXCEPTION 'balance_failed';
      END IF;
      UPDATE public.student_credits sc
      SET balance_rappen = sc.balance_rappen + p_amount
      WHERE sc.user_id = p_user_id AND sc.tenant_id = p_tenant_id
      RETURNING * INTO v_row;
      IF NOT FOUND THEN
        INSERT INTO public.student_credits (user_id, tenant_id, balance_rappen)
        VALUES (p_user_id, p_tenant_id, p_amount)
        RETURNING * INTO v_row;
      END IF;
      balance_rappen := v_row.balance_rappen;
      pending_withdrawal_rappen := v_row.pending_withdrawal_rappen;
      RETURN NEXT;
    END;
    $fn$;
    CREATE OR REPLACE FUNCTION public.fail_ledger() RETURNS trigger
    LANGUAGE plpgsql AS $fn$
    BEGIN
      IF coalesce(current_setting('test.fail_ledger', true), '') = 'on' THEN
        RAISE EXCEPTION 'ledger_failed';
      END IF;
      RETURN NEW;
    END;
    $fn$;
    CREATE TRIGGER fail_ledger BEFORE INSERT ON public.credit_transactions
      FOR EACH ROW EXECUTE FUNCTION public.fail_ledger();
  `)
  const root = process.cwd()
  await db.exec(readFileSync(resolve(root, 'migrations/20261016_payment_settlement_atomicity.sql'), 'utf8'))
  await db.exec(readFileSync(resolve(root, 'migrations/20261017_settlement_integrity_hardening.sql'), 'utf8'))
  await db.exec(`
    CREATE FUNCTION public.staff_pos_sale(uuid, uuid, jsonb, text, text, text, uuid, text)
    RETURNS jsonb LANGUAGE plpgsql AS $fn$ BEGIN RETURN '{"ok":true}'::jsonb; END $fn$;
  `)
}, 30000)

afterAll(async () => {
  await db.close()
})

async function reset() {
  await db.exec(`
    DELETE FROM public.credit_transactions;
    DELETE FROM public.student_credits;
    DELETE FROM public.bank_import_records;
    DELETE FROM public.invoice_payments;
    DELETE FROM public.invoice_items;
    DELETE FROM public.payments;
    DELETE FROM public.invoices;
    DELETE FROM public.users;
    INSERT INTO public.users (id, tenant_id, role, is_active) VALUES
      ('${ACTOR}', '${TENANT_A}', 'admin', true),
      ('${STUDENT}', '${TENANT_A}', 'client', true),
      ('${OTHER}', '${TENANT_B}', 'client', true);
    SELECT set_config('test.fail_balance', 'off', false);
    SELECT set_config('test.fail_ledger', 'off', false);
  `)
}

const settle = (amount: number | null, key: string | null) => db.query<{
  result: { ok: boolean; replayed: boolean; paid_amount_rappen: number; is_partial: boolean }
}>(
  `SELECT public.settle_marked_invoice_payment_idempotent(
     $1, $2, $3, now(), null, 'manual', null, null, null, null, null, null, $4
   ) AS result`,
  [ACTOR, INVOICE, amount, key],
)

describe('settlement integrity hardening', () => {
  it('does not grant execute to anon or authenticated', async () => {
    const signature = 'public.settle_marked_invoice_payment_idempotent(uuid,uuid,integer,timestamptz,text,text,text,text,date,text,text,text,text)'
    const wallet = 'public.apply_invoice_product_credit(uuid,uuid,uuid,uuid,integer,text)'
    const cash = 'public.apply_identified_cash_overpayment(uuid,uuid,text,integer)'
    for (const fn of [signature, wallet, cash]) {
      const anon = await db.query<{ ok: boolean }>(`SELECT has_function_privilege('anon', '${fn}', 'EXECUTE') AS ok`)
      const auth = await db.query<{ ok: boolean }>(`SELECT has_function_privilege('authenticated', '${fn}', 'EXECUTE') AS ok`)
      const service = await db.query<{ ok: boolean }>(`SELECT has_function_privilege('service_role', '${fn}', 'EXECUTE') AS ok`)
      expect(anon.rows[0].ok).toBe(false)
      expect(auth.rows[0].ok).toBe(false)
      expect(service.rows[0].ok).toBe(true)
    }
  })

  it('books a partial, a full payment, and keeps an overpayment off the wallet', async () => {
    await reset()
    await db.exec(`
      INSERT INTO public.invoices (id, tenant_id, user_id, total_amount_rappen, paid_amount_rappen, payment_status, status)
      VALUES ('${INVOICE}', '${TENANT_A}', '${STUDENT}', 10000, 0, 'pending', 'sent');
    `)
    await settle(4000, null)
    await settle(6000, null)
    const paid = await db.query<{ paid: number; journals: string; credits: string }>(`
      SELECT i.paid_amount_rappen AS paid,
             (SELECT count(*)::text FROM public.invoice_payments) AS journals,
             (SELECT count(*)::text FROM public.student_credits) AS credits
      FROM public.invoices i WHERE i.id = $1
    `, [INVOICE])
    expect(paid.rows[0]).toEqual({ paid: 10000, journals: '2', credits: '0' })

    await reset()
    await db.exec(`
      INSERT INTO public.invoices (id, tenant_id, user_id, total_amount_rappen, paid_amount_rappen, payment_status, status)
      VALUES ('${INVOICE}', '${TENANT_A}', '${STUDENT}', 8000, 0, 'pending', 'sent');
    `)
    await settle(10000, 'overpay-100')
    const over = await db.query<{ paid: number; journal: number; credits: string }>(`
      SELECT i.paid_amount_rappen AS paid, p.amount_rappen AS journal,
             (SELECT count(*)::text FROM public.student_credits) AS credits
      FROM public.invoices i
      JOIN public.invoice_payments p ON p.invoice_id = i.id
    `)
    expect(over.rows[0]).toEqual({ paid: 8000, journal: 10000, credits: '0' })
  })

  it('replays one manual action and still books a second action of the same amount', async () => {
    await reset()
    await db.exec(`
      INSERT INTO public.invoices (id, tenant_id, total_amount_rappen, paid_amount_rappen, payment_status, status)
      VALUES ('${INVOICE}', '${TENANT_A}', 10000, 0, 'pending', 'sent');
    `)
    await settle(4000, 'action-same')
    const replay = await settle(4000, 'action-same')
    expect(replay.rows[0].result.replayed).toBe(true)
    await settle(4000, 'action-other')
    const rows = await db.query<{ journals: string; paid: number }>(`
      SELECT count(*)::text AS journals, max(i.paid_amount_rappen) AS paid
      FROM public.invoice_payments p
      JOIN public.invoices i ON i.id = p.invoice_id
    `)
    expect(rows.rows[0]).toEqual({ journals: '2', paid: 8000 })

    await expect(settle(5000, 'action-same')).rejects.toThrow(/idempotency_amount_mismatch/)
    const still = await db.query<{ journals: string }>(`SELECT count(*)::text AS journals FROM public.invoice_payments`)
    expect(still.rows[0].journals).toBe('2')
  })

  it('rolls the invoice product credit back when the ledger or the balance fails', async () => {
    await reset()
    await db.exec(`
      INSERT INTO public.invoices (id, tenant_id, user_id, total_amount_rappen, paid_amount_rappen, payment_status, status, credit_applied_rappen)
      VALUES ('${INVOICE}', '${TENANT_A}', '${STUDENT}', 2500, 2500, 'paid', 'paid', 0);
      SELECT set_config('test.fail_ledger', 'on', false);
    `)
    await expect(db.query(
      `SELECT public.apply_invoice_product_credit($1, $2, $3, $4, 2500, 'note')`,
      [ACTOR, TENANT_A, STUDENT, INVOICE],
    )).rejects.toThrow(/ledger_failed/)
    await db.exec(`SELECT set_config('test.fail_ledger', 'off', false); SELECT set_config('test.fail_balance', 'on', false);`)
    await expect(db.query(
      `SELECT public.apply_invoice_product_credit($1, $2, $3, $4, 2500, 'note')`,
      [ACTOR, TENANT_A, STUDENT, INVOICE],
    )).rejects.toThrow(/balance_failed/)
    const empty = await db.query<{ journals: string; credits: string; stamped: number }>(`
      SELECT (SELECT count(*)::text FROM public.credit_transactions) AS journals,
             (SELECT count(*)::text FROM public.student_credits) AS credits,
             COALESCE(credit_applied_rappen, 0) AS stamped
      FROM public.invoices WHERE id = $1
    `, [INVOICE])
    expect(empty.rows[0]).toEqual({ journals: '0', credits: '0', stamped: 0 })

    await db.exec(`SELECT set_config('test.fail_balance', 'off', false);`)
    const applied = await db.query<{ result: { applied: boolean; balance_rappen: number } }>(
      `SELECT public.apply_invoice_product_credit($1, $2, $3, $4, 2500, 'note') AS result`,
      [ACTOR, TENANT_A, STUDENT, INVOICE],
    )
    expect(applied.rows[0].result.applied).toBe(true)
    expect(applied.rows[0].result.balance_rappen).toBe(2500)
    const replay = await db.query<{ result: { already_applied: boolean } }>(
      `SELECT public.apply_invoice_product_credit($1, $2, $3, $4, 2500, 'note') AS result`,
      [ACTOR, TENANT_A, STUDENT, INVOICE],
    )
    expect(replay.rows[0].result.already_applied).toBe(true)
    const once = await db.query<{ balance: number; journals: string }>(`
      SELECT balance_rappen AS balance,
             (SELECT count(*)::text FROM public.credit_transactions) AS journals
      FROM public.student_credits
    `)
    expect(once.rows[0]).toEqual({ balance: 2500, journals: '1' })
  })

  it('replays one cash surplus and books a second action once', async () => {
    await reset()
    const first = await db.query<{ result: { applied: boolean; balance_rappen: number } }>(
      `SELECT public.apply_identified_cash_overpayment($1, $2, 'cash-action-1', 2000) AS result`,
      [ACTOR, STUDENT],
    )
    expect(first.rows[0].result).toMatchObject({ applied: true, balance_rappen: 2000 })
    const retry = await db.query<{ result: { already_applied: boolean; amount_rappen: number } }>(
      `SELECT public.apply_identified_cash_overpayment($1, $2, 'cash-action-1', 9000) AS result`,
      [ACTOR, STUDENT],
    )
    expect(retry.rows[0].result).toMatchObject({ already_applied: true, amount_rappen: 2000 })
    await db.query(
      `SELECT public.apply_identified_cash_overpayment($1, $2, 'cash-action-2', 1500)`,
      [ACTOR, STUDENT],
    )
    const balance = await db.query<{ balance: number; journals: string }>(`
      SELECT balance_rappen AS balance,
             (SELECT count(*)::text FROM public.credit_transactions) AS journals
      FROM public.student_credits
    `)
    expect(balance.rows[0]).toEqual({ balance: 3500, journals: '2' })

    await expect(db.query(
      `SELECT public.apply_identified_cash_overpayment($1, $2, 'cash-action-3', 500)`,
      [ACTOR, OTHER],
    )).rejects.toThrow(/user_not_in_tenant/)
    const unchanged = await db.query<{ balance: number }>(`SELECT balance_rappen AS balance FROM public.student_credits`)
    expect(unchanged.rows[0].balance).toBe(3500)
  })

  it('rolls a cash surplus back when the balance write fails', async () => {
    await reset()
    await db.exec(`SELECT set_config('test.fail_balance', 'on', false);`)
    await expect(db.query(
      `SELECT public.apply_identified_cash_overpayment($1, $2, 'cash-fail', 2000)`,
      [ACTOR, STUDENT],
    )).rejects.toThrow(/balance_failed/)
    const empty = await db.query<{ journals: string; credits: string }>(`
      SELECT (SELECT count(*)::text FROM public.credit_transactions) AS journals,
             (SELECT count(*)::text FROM public.student_credits) AS credits
    `)
    expect(empty.rows[0]).toEqual({ journals: '0', credits: '0' })
  })
})
