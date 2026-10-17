/**
 * Disposable in-process Postgres. These tests execute the settlement functions
 * and are the transaction proof. The HTTP suite's rpc() is only a mock.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'

const TENANT_A = '11111111-1111-4111-8111-111111111111'
const TENANT_B = '22222222-2222-4222-8222-222222222222'
const ACTOR = '33333333-3333-4333-8333-333333333333'
const INVOICE = '44444444-4444-4444-8444-444444444444'
const PAYMENT = '66666666-6666-4666-8666-666666666666'
const OPEN_PAY = '66666666-6666-4666-8666-666666666667'

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
      total_amount_rappen integer,
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
      dunning_paused boolean
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
      currency text
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
    CREATE TABLE public.staff_pos_calls (payment_id uuid);
  `)
  const migration = readFileSync(resolve(process.cwd(), 'migrations/20261016_payment_settlement_atomicity.sql'), 'utf8')
  await db.exec(migration)
  await db.exec(`
    CREATE FUNCTION public.staff_pos_sale(
      p_actor_user_id uuid,
      p_customer_id uuid,
      p_items jsonb,
      p_idempotency_key text,
      p_method text,
      p_action text,
      p_payment_id uuid,
      p_claim_token text
    ) RETURNS jsonb
    LANGUAGE plpgsql
    AS $fn$
    BEGIN
      IF coalesce(current_setting('test.staff_pos_fail', true), '') = 'on' THEN
        RAISE EXCEPTION 'staff_pos_failed';
      END IF;
      INSERT INTO public.staff_pos_calls(payment_id) VALUES (p_payment_id);
      RETURN jsonb_build_object('ok', true);
    END;
    $fn$;

    CREATE FUNCTION public.fail_invoice_update() RETURNS trigger
    LANGUAGE plpgsql AS $fn$
    BEGIN
      IF coalesce(current_setting('test.fail_invoice', true), '') = 'on' THEN
        RAISE EXCEPTION 'invoice_update_failed';
      END IF;
      RETURN NEW;
    END;
    $fn$;
    CREATE TRIGGER fail_invoice_update
      BEFORE UPDATE ON public.invoices
      FOR EACH ROW EXECUTE FUNCTION public.fail_invoice_update();

    CREATE FUNCTION public.fail_journal_insert() RETURNS trigger
    LANGUAGE plpgsql AS $fn$
    BEGIN
      IF coalesce(current_setting('test.fail_journal', true), '') = 'on' THEN
        RAISE EXCEPTION 'journal_insert_failed';
      END IF;
      RETURN NEW;
    END;
    $fn$;
    CREATE TRIGGER fail_journal_insert
      BEFORE INSERT ON public.invoice_payments
      FOR EACH ROW EXECUTE FUNCTION public.fail_journal_insert();
  `)
}, 30000)

afterAll(async () => {
  await db.close()
})

async function reset() {
  await db.exec(`
    DELETE FROM public.staff_pos_calls;
    DELETE FROM public.bank_import_records;
    DELETE FROM public.invoice_payments;
    DELETE FROM public.invoice_items;
    DELETE FROM public.payments;
    DELETE FROM public.invoices;
    DELETE FROM public.users;
    INSERT INTO public.users (id, tenant_id, role, is_active)
    VALUES ('${ACTOR}', '${TENANT_A}', 'admin', true);
    SELECT set_config('test.fail_invoice', 'off', false);
    SELECT set_config('test.fail_journal', 'off', false);
    SELECT set_config('test.staff_pos_fail', 'off', false);
  `)
}

describe('payment settlement atomicity (disposable Postgres)', () => {
  it('does not grant execution to anon or authenticated', async () => {
    const cash = await db.query<{ anon: boolean; authenticated: boolean; service_role: boolean }>(`
      SELECT has_function_privilege('anon', 'public.complete_tenant_cash_payment(uuid,uuid,timestamptz)', 'EXECUTE') AS anon,
             has_function_privilege('authenticated', 'public.complete_tenant_cash_payment(uuid,uuid,timestamptz)', 'EXECUTE') AS authenticated,
             has_function_privilege('service_role', 'public.complete_tenant_cash_payment(uuid,uuid,timestamptz)', 'EXECUTE') AS service_role
    `)
    expect(cash.rows[0]).toEqual({ anon: false, authenticated: false, service_role: true })
  })

  it('treats an empty sibling set as all paid and a pending sibling as partial', async () => {
    await reset()
    const empty = await db.query<{ all_paid: boolean }>(`
      SELECT COALESCE(bool_and(payment_status = 'completed'), true) AS all_paid
      FROM public.payments
      WHERE false
    `)
    expect(empty.rows[0].all_paid).toBe(true)

    await db.exec(`
      INSERT INTO public.invoices (id, tenant_id, total_amount_rappen, paid_amount_rappen, payment_status, status)
      VALUES ('${INVOICE}', '${TENANT_A}', 10000, 0, 'pending', 'sent');
      INSERT INTO public.payments (id, tenant_id, invoice_id, payment_status, payment_method, amount_paid_rappen)
      VALUES
        ('${PAYMENT}', '${TENANT_A}', '${INVOICE}', 'pending', 'invoice', 0),
        ('${OPEN_PAY}', '${TENANT_A}', '${INVOICE}', 'pending', 'invoice', 0);
    `)
    await db.query(`SELECT public.complete_tenant_cash_payment($1, $2, now())`, [ACTOR, PAYMENT])
    const partial = await db.query<{ payment_status: string; paid_amount_rappen: number }>(
      `SELECT payment_status, paid_amount_rappen FROM public.invoices WHERE id = $1`,
      [INVOICE],
    )
    expect(partial.rows[0]).toEqual({ payment_status: 'partial', paid_amount_rappen: 0 })

    await db.query(`UPDATE public.payments SET payment_status = 'completed' WHERE id = $1`, [OPEN_PAY])
    await db.query(`SELECT public.complete_tenant_cash_payment($1, $2, now())`, [ACTOR, PAYMENT])
    const paid = await db.query<{ payment_status: string }>(
      `SELECT payment_status FROM public.invoices WHERE id = $1`,
      [INVOICE],
    )
    expect(paid.rows[0].payment_status).toBe('paid')
  })

  it('rolls back the payment when the invoice update fails', async () => {
    await reset()
    await db.exec(`
      INSERT INTO public.invoices (id, tenant_id, total_amount_rappen, paid_amount_rappen, payment_status, status)
      VALUES ('${INVOICE}', '${TENANT_A}', 10000, 0, 'pending', 'sent');
      INSERT INTO public.payments (id, tenant_id, invoice_id, payment_status, payment_method, amount_paid_rappen)
      VALUES ('${PAYMENT}', '${TENANT_A}', '${INVOICE}', 'pending', 'invoice', 0);
      SELECT set_config('test.fail_invoice', 'on', false);
    `)
    await expect(db.query(`SELECT public.complete_tenant_cash_payment($1, $2, now())`, [ACTOR, PAYMENT])).rejects.toThrow(/invoice_update_failed/)
    const payment = await db.query<{ payment_status: string }>(`SELECT payment_status FROM public.payments WHERE id = $1`, [PAYMENT])
    const invoice = await db.query<{ payment_status: string }>(`SELECT payment_status FROM public.invoices WHERE id = $1`, [INVOICE])
    expect(payment.rows[0].payment_status).toBe('pending')
    expect(invoice.rows[0].payment_status).toBe('pending')
  })

  it('does not rewrite an already completed cash payment', async () => {
    await reset()
    await db.exec(`
      INSERT INTO public.invoices (id, tenant_id, total_amount_rappen, paid_amount_rappen, payment_status, status, paid_at)
      VALUES ('${INVOICE}', '${TENANT_A}', 10000, 0, 'paid', 'paid', '2026-10-01T00:00:00Z');
      INSERT INTO public.payments (id, tenant_id, invoice_id, payment_status, payment_method, amount_paid_rappen, paid_at)
      VALUES ('${PAYMENT}', '${TENANT_A}', '${INVOICE}', 'completed', 'cash', 5000, '2026-10-01T00:00:00Z');
    `)
    const result = await db.query<{ complete_tenant_cash_payment: { replayed: boolean } }>(
      `SELECT public.complete_tenant_cash_payment($1, $2, '2026-10-16T00:00:00Z')`,
      [ACTOR, PAYMENT],
    )
    expect(result.rows[0].complete_tenant_cash_payment.replayed).toBe(true)
    const payment = await db.query<{ paid_at: string; amount_paid_rappen: number }>(
      `SELECT paid_at, amount_paid_rappen FROM public.payments WHERE id = $1`,
      [PAYMENT],
    )
    expect(payment.rows[0].amount_paid_rappen).toBe(5000)
    expect(new Date(payment.rows[0].paid_at).toISOString()).toBe('2026-10-01T00:00:00.000Z')
  })

  it('refuses a payment owned by another tenant', async () => {
    await reset()
    await db.exec(`
      INSERT INTO public.payments (id, tenant_id, payment_status, amount_paid_rappen)
      VALUES ('${PAYMENT}', '${TENANT_B}', 'pending', 0);
    `)
    await expect(db.query(`SELECT public.complete_tenant_cash_payment($1, $2, now())`, [ACTOR, PAYMENT])).rejects.toThrow(/payment_not_found/)
    const payment = await db.query<{ payment_status: string }>(`SELECT payment_status FROM public.payments WHERE id = $1`, [PAYMENT])
    expect(payment.rows[0].payment_status).toBe('pending')
  })

  it('books a zero request as the invoice total and keeps an overpayment journal unclamped', async () => {
    await reset()
    await db.exec(`
      INSERT INTO public.invoices (id, tenant_id, user_id, total_amount_rappen, paid_amount_rappen, payment_status, status, dunning_level, dunning_paused)
      VALUES ('${INVOICE}', '${TENANT_A}', '${ACTOR}', 10000, 0, 'pending', 'sent', 2, true);
    `)
    await db.query(
      `SELECT public.settle_marked_invoice_payment($1, $2, 0, now(), null, null, null, null, null, null, null, null)`,
      [ACTOR, INVOICE],
    )
    const full = await db.query<{ paid_amount_rappen: number; payment_status: string; journal: number }>(`
      SELECT i.paid_amount_rappen, i.payment_status, p.amount_rappen AS journal
      FROM public.invoices i
      JOIN public.invoice_payments p ON p.invoice_id = i.id
      WHERE i.id = $1
    `, [INVOICE])
    expect(full.rows[0]).toEqual({ paid_amount_rappen: 10000, payment_status: 'paid', journal: 10000 })

    await reset()
    await db.exec(`
      INSERT INTO public.invoices (id, tenant_id, total_amount_rappen, paid_amount_rappen, payment_status, status)
      VALUES ('${INVOICE}', '${TENANT_A}', 10000, 0, 'pending', 'sent');
    `)
    await db.query(
      `SELECT public.settle_marked_invoice_payment($1, $2, 15000, now(), 'Bar', 'cash', null, null, null, null, null, null)`,
      [ACTOR, INVOICE],
    )
    const over = await db.query<{ paid_amount_rappen: number; journal: number }>(`
      SELECT i.paid_amount_rappen, p.amount_rappen AS journal
      FROM public.invoices i
      JOIN public.invoice_payments p ON p.invoice_id = i.id
      WHERE i.id = $1
    `, [INVOICE])
    expect(over.rows[0]).toEqual({ paid_amount_rappen: 10000, journal: 15000 })
  })

  it('rolls back the header when the journal insert fails', async () => {
    await reset()
    await db.exec(`
      INSERT INTO public.invoices (id, tenant_id, total_amount_rappen, paid_amount_rappen, payment_status, status)
      VALUES ('${INVOICE}', '${TENANT_A}', 10000, 2000, 'partial', 'sent');
      INSERT INTO public.payments (id, tenant_id, invoice_id, payment_status, amount_paid_rappen)
      VALUES ('${PAYMENT}', '${TENANT_A}', '${INVOICE}', 'pending', 0);
      SELECT set_config('test.fail_journal', 'on', false);
    `)
    await expect(db.query(
      `SELECT public.settle_marked_invoice_payment($1, $2, 3000, now(), null, 'cash', null, null, null, null, null, null)`,
      [ACTOR, INVOICE],
    )).rejects.toThrow(/journal_insert_failed/)
    const invoice = await db.query<{ paid_amount_rappen: number; payment_status: string }>(
      `SELECT paid_amount_rappen, payment_status FROM public.invoices WHERE id = $1`,
      [INVOICE],
    )
    const journals = await db.query<{ count: string }>(`SELECT count(*)::text AS count FROM public.invoice_payments`)
    const payment = await db.query<{ payment_status: string }>(`SELECT payment_status FROM public.payments WHERE id = $1`, [PAYMENT])
    expect(invoice.rows[0]).toEqual({ paid_amount_rappen: 2000, payment_status: 'partial' })
    expect(journals.rows[0].count).toBe('0')
    expect(payment.rows[0].payment_status).toBe('pending')
  })

  it('does not insert a second journal for a repeated manual call on a fully paid invoice', async () => {
    await reset()
    await db.exec(`
      INSERT INTO public.invoices (id, tenant_id, total_amount_rappen, paid_amount_rappen, payment_status, status)
      VALUES ('${INVOICE}', '${TENANT_A}', 10000, 0, 'pending', 'sent');
    `)
    await db.query(
      `SELECT public.settle_marked_invoice_payment($1, $2, 10000, now(), null, 'cash', null, null, null, null, null, null)`,
      [ACTOR, INVOICE],
    )
    const second = await db.query<{ settle_marked_invoice_payment: { replayed: boolean } }>(
      `SELECT public.settle_marked_invoice_payment($1, $2, 10000, now(), null, 'cash', null, null, null, null, null, null)`,
      [ACTOR, INVOICE],
    )
    expect(second.rows[0].settle_marked_invoice_payment.replayed).toBe(true)
    const journals = await db.query<{ count: string }>(`SELECT count(*)::text AS count FROM public.invoice_payments`)
    expect(journals.rows[0].count).toBe('1')
  })

  it('rolls back the invoice when staff POS credit fails', async () => {
    await reset()
    await db.exec(`
      INSERT INTO public.invoices (id, tenant_id, user_id, total_amount_rappen, paid_amount_rappen, payment_status, status)
      VALUES ('${INVOICE}', '${TENANT_A}', '${ACTOR}', 10000, 0, 'pending', 'sent');
      INSERT INTO public.payments (id, tenant_id, user_id, invoice_id, payment_status, amount_paid_rappen, metadata)
      VALUES ('${PAYMENT}', '${TENANT_A}', '${ACTOR}', '${INVOICE}', 'pending', 0, '{"source":"staff_product_sale"}'::jsonb);
      SELECT set_config('test.staff_pos_fail', 'on', false);
    `)
    await expect(db.query(
      `SELECT public.settle_marked_invoice_payment($1, $2, 10000, now(), null, 'cash', null, null, null, null, null, null)`,
      [ACTOR, INVOICE],
    )).rejects.toThrow(/staff_pos_failed/)
    const invoice = await db.query<{ payment_status: string; paid_amount_rappen: number }>(
      `SELECT payment_status, paid_amount_rappen FROM public.invoices WHERE id = $1`,
      [INVOICE],
    )
    const journals = await db.query<{ count: string }>(`SELECT count(*)::text AS count FROM public.invoice_payments`)
    expect(invoice.rows[0]).toEqual({ payment_status: 'pending', paid_amount_rappen: 0 })
    expect(journals.rows[0].count).toBe('0')
  })

  it('does not apply a second cash amount to a completed batch payment and rolls back when the invoice is outside the tenant', async () => {
    await reset()
    await db.exec(`
      INSERT INTO public.invoices (id, tenant_id, total_amount_rappen, paid_amount_rappen, payment_status, status)
      VALUES ('${INVOICE}', '${TENANT_A}', 5000, 0, 'pending', 'sent');
      INSERT INTO public.payments (id, tenant_id, invoice_id, payment_status, payment_method, amount_paid_rappen)
      VALUES ('${PAYMENT}', '${TENANT_A}', '${INVOICE}', 'pending', 'invoice', 0);
    `)
    const updates = JSON.stringify([{
      payment_id: PAYMENT,
      payment_method: 'cash',
      payment_status: 'completed',
      amount_paid_rappen: 5000,
    }])
    await db.query(`SELECT public.apply_cash_settlement_batch($1, $2::jsonb, now())`, [ACTOR, updates])
    const again = JSON.stringify([{
      payment_id: PAYMENT,
      payment_method: 'cash',
      payment_status: 'completed',
      amount_paid_rappen: 9999,
    }])
    await db.query(`SELECT public.apply_cash_settlement_batch($1, $2::jsonb, now())`, [ACTOR, again])
    const payment = await db.query<{ amount_paid_rappen: number; payment_status: string }>(
      `SELECT amount_paid_rappen, payment_status FROM public.payments WHERE id = $1`,
      [PAYMENT],
    )
    expect(payment.rows[0]).toEqual({ amount_paid_rappen: 5000, payment_status: 'completed' })

    await db.exec(`
      UPDATE public.payments SET payment_status = 'pending', amount_paid_rappen = 0, invoice_id = '${INVOICE}' WHERE id = '${PAYMENT}';
      UPDATE public.invoices SET tenant_id = '${TENANT_B}' WHERE id = '${INVOICE}';
    `)
    await expect(db.query(`SELECT public.apply_cash_settlement_batch($1, $2::jsonb, now())`, [ACTOR, updates])).rejects.toThrow(/invoice_not_in_tenant/)
    const rolled = await db.query<{ payment_status: string; amount_paid_rappen: number }>(
      `SELECT payment_status, amount_paid_rappen FROM public.payments WHERE id = $1`,
      [PAYMENT],
    )
    expect(rolled.rows[0]).toEqual({ payment_status: 'pending', amount_paid_rappen: 0 })
  })

  it('allocates CHF 80 of a CHF 100 receipt and keeps the journal at the receipt', async () => {
    await reset()
    await db.exec(`
      INSERT INTO public.invoices (id, tenant_id, total_amount_rappen, paid_amount_rappen, payment_status, status)
      VALUES ('${INVOICE}', '${TENANT_A}', 8000, 0, 'pending', 'sent');
    `)
    await db.query(
      `SELECT public.settle_marked_invoice_payment($1, $2, 10000, now(), 'CAMT', 'bank', 'bank-100', 'ref-100', '2026-10-16', 'QRR', 'Ada', 'camt')`,
      [ACTOR, INVOICE],
    )
    const row = await db.query<{ paid_amount_rappen: number; journal: number; bank: number }>(`
      SELECT i.paid_amount_rappen, p.amount_rappen AS journal, b.amount_rappen AS bank
      FROM public.invoices i
      JOIN public.invoice_payments p ON p.invoice_id = i.id
      JOIN public.bank_import_records b ON b.invoice_id = i.id
      WHERE i.id = $1
    `, [INVOICE])
    expect(row.rows[0]).toEqual({ paid_amount_rappen: 8000, journal: 10000, bank: 10000 })
  })

  it('rejects a repeated bank key and still books two same-amount payments with distinct keys', async () => {
    await reset()
    await db.exec(`
      INSERT INTO public.invoices (id, tenant_id, total_amount_rappen, paid_amount_rappen, payment_status, status)
      VALUES ('${INVOICE}', '${TENANT_A}', 10000, 0, 'pending', 'sent');
    `)
    const settle = (amount: number, key: string | null) => db.query(
      `SELECT public.settle_marked_invoice_payment($1, $2, $3, now(), null, 'bank', $4, null, '2026-10-16', null, null, 'camt')`,
      [ACTOR, INVOICE, amount, key],
    )
    await settle(4000, 'payment-a')
    await expect(settle(4000, 'payment-a')).rejects.toThrow(/duplicate_bank_import/)
    const afterRetry = await db.query<{ journals: string; banks: string; paid: number }>(`
      SELECT count(p.*)::text AS journals, count(b.*)::text AS banks, i.paid_amount_rappen AS paid
      FROM public.invoices i
      LEFT JOIN public.invoice_payments p ON p.invoice_id = i.id
      LEFT JOIN public.bank_import_records b ON b.invoice_id = i.id
      WHERE i.id = $1
      GROUP BY i.paid_amount_rappen
    `, [INVOICE])
    expect(afterRetry.rows[0]).toEqual({ journals: '1', banks: '1', paid: 4000 })

    await settle(4000, 'payment-b')
    const distinct = await db.query<{ journals: string; paid: number }>(`
      SELECT count(*)::text AS journals, max(i.paid_amount_rappen) AS paid
      FROM public.invoice_payments p
      JOIN public.invoices i ON i.id = p.invoice_id
    `)
    expect(distinct.rows[0]).toEqual({ journals: '2', paid: 8000 })

    await reset()
    await db.exec(`
      INSERT INTO public.invoices (id, tenant_id, total_amount_rappen, paid_amount_rappen, payment_status, status)
      VALUES ('${INVOICE}', '${TENANT_A}', 10000, 0, 'pending', 'sent');
    `)
    await db.query(
      `SELECT public.settle_marked_invoice_payment($1, $2, 4000, now(), null, 'cash', null, null, null, null, null, null)`,
      [ACTOR, INVOICE],
    )
    await db.query(
      `SELECT public.settle_marked_invoice_payment($1, $2, 4000, now(), null, 'cash', null, null, null, null, null, null)`,
      [ACTOR, INVOICE],
    )
    const manual = await db.query<{ journals: string; paid: number }>(`
      SELECT count(*)::text AS journals, max(paid_amount_rappen) AS paid
      FROM public.invoice_payments p
      JOIN public.invoices i ON i.id = p.invoice_id
    `)
    expect(manual.rows[0]).toEqual({ journals: '2', paid: 8000 })
  })
})
