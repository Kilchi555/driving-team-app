/**
 * Disposable embedded Postgres (PGlite) for the company-link insert contract.
 *
 * send-draft uses the Supabase service-role client. This file runs the same
 * companyIdForInvoiceInsert helper against SQL executed as a BYPASSRLS
 * service_role, then inserts and reads invoices.company_id back.
 * It does not open production or staging, and it does not claim PostgREST parity.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { companyIdForInvoiceInsert } from '~/server/utils/invoice-company-link'

const TENANT_A = '64259d68-195a-4c68-8875-f1b44d962830'
const TENANT_B = '11111111-1111-4111-8111-111111111111'
const COMPANY_A = '8d195a31-0fa6-423f-8ef9-e2e893e17e2d'
const COMPANY_B = '525bf160-906c-4886-9284-b6e68eb6195c'
const UNKNOWN = '33333333-3333-4333-8333-333333333333'

let db: PGlite

function serviceClient(): SupabaseClient {
  const state: { filters: Array<{ col: string; val: unknown }> } = { filters: [] }
  const chain = {
    select: () => chain,
    eq: (col: string, val: unknown) => {
      state.filters.push({ col, val })
      return chain
    },
    maybeSingle: async () => {
      const id = state.filters.find((filter) => filter.col === 'id')?.val
      const tenantId = state.filters.find((filter) => filter.col === 'tenant_id')?.val
      await db.exec('SET ROLE service_role')
      try {
        const result = await db.query<{ id: string; tenant_id: string }>(
          'SELECT id, tenant_id FROM public.companies WHERE id = $1 AND tenant_id = $2',
          [id, tenantId],
        )
        return { data: result.rows[0] ?? null, error: null }
      } catch (error) {
        return { data: null, error: { message: error instanceof Error ? error.message : 'select failed' } }
      } finally {
        await db.exec('RESET ROLE')
      }
    },
  }
  return {
    from(table: string) {
      if (table !== 'companies') throw new Error(`unexpected table ${table}`)
      state.filters = []
      return chain
    },
  } as unknown as SupabaseClient
}

async function invoiceCount(): Promise<number> {
  const result = await db.query<{ count: string }>('SELECT count(*)::text AS count FROM public.invoices')
  return Number(result.rows[0]?.count || 0)
}

async function insertInvoice(companyId: string | null, invoiceNumber: string) {
  await db.exec('SET ROLE service_role')
  try {
    await db.query(
      `INSERT INTO public.invoices (
         tenant_id, user_id, company_id, invoice_number, invoice_date, due_date,
         billing_type, subtotal_rappen, vat_rate, vat_amount_rappen, discount_amount_rappen,
         total_amount_rappen, status, payment_status, paid_amount_rappen, document_kind
       ) VALUES (
         $1, NULL, $2, $3, CURRENT_DATE, CURRENT_DATE + 30,
         'company', 10000, 8.1, 0, 0,
         10000, 'draft', 'pending', 0, 'invoice'
       )`,
      [TENANT_A, companyId, invoiceNumber],
    )
  } finally {
    await db.exec('RESET ROLE')
  }
}

beforeAll(async () => {
  db = new PGlite()
  await db.exec(`
    CREATE ROLE service_role BYPASSRLS;
    CREATE ROLE authenticated NOINHERIT;

    CREATE TABLE public.tenants (
      id uuid PRIMARY KEY
    );

    CREATE TABLE public.companies (
      id uuid PRIMARY KEY,
      tenant_id uuid NOT NULL REFERENCES public.tenants(id)
    );

    CREATE TABLE public.invoices (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id uuid NOT NULL REFERENCES public.tenants(id),
      user_id uuid,
      company_id uuid,
      invoice_number text NOT NULL,
      invoice_date date NOT NULL,
      due_date date NOT NULL,
      billing_type text DEFAULT 'individual',
      subtotal_rappen integer NOT NULL,
      vat_rate numeric NOT NULL DEFAULT 0,
      vat_amount_rappen integer NOT NULL,
      discount_amount_rappen integer NOT NULL DEFAULT 0,
      total_amount_rappen integer NOT NULL,
      status text DEFAULT 'draft',
      payment_status text DEFAULT 'pending',
      paid_amount_rappen integer NOT NULL DEFAULT 0,
      paid_at timestamptz,
      document_kind text NOT NULL DEFAULT 'invoice'
    );

    -- Repo text: database_migration_invoices.sql. No later migration replaces this function.
    CREATE FUNCTION public.calculate_invoice_vat()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    BEGIN
      NEW.vat_amount_rappen := ROUND((NEW.subtotal_rappen * NEW.vat_rate / 100)::NUMERIC);
      NEW.total_amount_rappen := NEW.subtotal_rappen + NEW.vat_amount_rappen - NEW.discount_amount_rappen;
      RETURN NEW;
    END;
    $$;

    CREATE TRIGGER trigger_calculate_invoice_vat
      BEFORE INSERT OR UPDATE ON public.invoices
      FOR EACH ROW
      EXECUTE FUNCTION public.calculate_invoice_vat();

    -- Repo text: sql_migrations/20260819_invoice_quotes.sql. BEFORE UPDATE only.
    CREATE FUNCTION public.update_invoice_status()
    RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO pg_catalog, public
    AS $$
    BEGIN
      IF COALESCE(NEW.document_kind, 'invoice') = 'quote' THEN
        RETURN NEW;
      END IF;
      IF NEW.due_date < CURRENT_DATE AND NEW.status = 'sent' AND NEW.payment_status != 'paid' THEN
        NEW.status := 'overdue';
        NEW.payment_status := 'overdue';
      END IF;
      IF NEW.paid_amount_rappen >= NEW.total_amount_rappen AND NEW.payment_status != 'paid' THEN
        NEW.payment_status := 'paid';
        NEW.status := 'paid';
        NEW.paid_at := COALESCE(NEW.paid_at, NOW());
      END IF;
      RETURN NEW;
    END;
    $$;

    CREATE TRIGGER trigger_update_invoice_status
      BEFORE UPDATE ON public.invoices
      FOR EACH ROW
      EXECUTE FUNCTION public.update_invoice_status();

    -- migrations/20260826_rls_wave3_critical.sql: RLS on, no policies, service_role only.
    ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON TABLE public.companies FROM PUBLIC, authenticated;
    GRANT ALL ON TABLE public.companies TO service_role;
    GRANT SELECT, INSERT, UPDATE ON TABLE public.invoices TO service_role;

    INSERT INTO public.tenants (id) VALUES ('${TENANT_A}'), ('${TENANT_B}');
    INSERT INTO public.companies (id, tenant_id) VALUES
      ('${COMPANY_A}', '${TENANT_A}'),
      ('${COMPANY_B}', '${TENANT_B}');
  `)
})

afterAll(async () => {
  await db.close()
})

describe('Postgres company link for a service-role insert', () => {
  it('stores a same-tenant company id and leaves it in place when the VAT trigger rewrites totals', async () => {
    const linked = await companyIdForInvoiceInsert(serviceClient(), TENANT_A, {
      billing_type: 'company',
      company_id: COMPANY_A,
    })
    expect(linked).toBe(COMPANY_A)
    await insertInvoice(linked, 'RE-DB-1')

    const stored = await db.query<{
      company_id: string
      vat_amount_rappen: number
      total_amount_rappen: number
      payment_status: string
    }>(
      `SELECT company_id, vat_amount_rappen, total_amount_rappen, payment_status
       FROM public.invoices WHERE invoice_number = 'RE-DB-1'`,
    )
    expect(stored.rows[0]).toMatchObject({
      company_id: COMPANY_A,
      vat_amount_rappen: 810,
      total_amount_rappen: 10810,
      payment_status: 'pending',
    })
  })

  it('does not insert when the company belongs to another tenant', async () => {
    const before = await invoiceCount()
    await expect(companyIdForInvoiceInsert(serviceClient(), TENANT_A, {
      billing_type: 'company',
      company_id: COMPANY_B,
    })).rejects.toMatchObject({ statusCode: 404, message: 'Firma nicht gefunden' })
    expect(await invoiceCount()).toBe(before)
  })

  it('does not insert when the company id is unknown', async () => {
    const before = await invoiceCount()
    await expect(companyIdForInvoiceInsert(serviceClient(), TENANT_A, {
      billing_type: 'company',
      company_id: UNKNOWN,
    })).rejects.toMatchObject({ statusCode: 404, message: 'Firma nicht gefunden' })
    expect(await invoiceCount()).toBe(before)
  })

  it('fails closed when the lookup role cannot read companies', async () => {
    const before = await invoiceCount()
    const denied = {
      from() {
        return {
          select: () => denied.from(),
          eq: () => denied.from(),
          maybeSingle: async () => {
            await db.exec('SET ROLE authenticated')
            try {
              await db.query('SELECT id, tenant_id FROM public.companies')
              return { data: null, error: null }
            } catch (error) {
              return { data: null, error: { message: error instanceof Error ? error.message : 'select failed' } }
            } finally {
              await db.exec('RESET ROLE')
            }
          },
        }
      },
    } as unknown as SupabaseClient

    await expect(companyIdForInvoiceInsert(denied, TENANT_A, {
      billing_type: 'company',
      company_id: COMPANY_A,
    })).rejects.toMatchObject({ statusCode: 503, message: 'Firma konnte nicht geprüft werden' })
    expect(await invoiceCount()).toBe(before)
  })

  it('does not let the status trigger reclassify a new insert, and does not clear company_id on a later update', async () => {
    await db.query(
      `INSERT INTO public.invoices (
         tenant_id, company_id, invoice_number, invoice_date, due_date,
         billing_type, subtotal_rappen, vat_rate, vat_amount_rappen, discount_amount_rappen,
         total_amount_rappen, status, payment_status, paid_amount_rappen, document_kind
       ) VALUES (
         $1, $2, 'RE-DB-DUE', CURRENT_DATE - 40, CURRENT_DATE - 10,
         'company', 10000, 0, 0, 0,
         10000, 'sent', 'pending', 0, 'invoice'
       )`,
      [TENANT_A, COMPANY_A],
    )
    const inserted = await db.query<{ payment_status: string; company_id: string }>(
      `SELECT payment_status, company_id FROM public.invoices WHERE invoice_number = 'RE-DB-DUE'`,
    )
    expect(inserted.rows[0]).toMatchObject({ payment_status: 'pending', company_id: COMPANY_A })

    await db.query(`UPDATE public.invoices SET billing_type = 'company' WHERE invoice_number = 'RE-DB-DUE'`)
    const updated = await db.query<{ payment_status: string; status: string; company_id: string }>(
      `SELECT payment_status, status, company_id FROM public.invoices WHERE invoice_number = 'RE-DB-DUE'`,
    )
    expect(updated.rows[0]).toMatchObject({
      payment_status: 'overdue',
      status: 'overdue',
      company_id: COMPANY_A,
    })
  })

  it('accepts a foreign company id on a direct insert because this schema has no tenant-matching foreign key', async () => {
    await insertInvoice(COMPANY_B, 'RE-DB-FOREIGN-DIRECT')
    const stored = await db.query<{ company_id: string; tenant_id: string }>(
      `SELECT company_id, tenant_id FROM public.invoices WHERE invoice_number = 'RE-DB-FOREIGN-DIRECT'`,
    )
    expect(stored.rows[0]).toEqual({ company_id: COMPANY_B, tenant_id: TENANT_A })
    await db.query(`DELETE FROM public.invoices WHERE invoice_number = 'RE-DB-FOREIGN-DIRECT'`)
  })
})
