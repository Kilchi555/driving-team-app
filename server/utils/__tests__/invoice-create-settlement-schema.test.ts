import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(__dirname, '../../..')

function read(rel: string) {
  return readFileSync(resolve(root, rel), 'utf8')
}

describe('invoice create+settle migration contract', () => {
  const sql = read('migrations/20261011_invoice_create_with_settlement.sql')

  it('adds invoice_item_id with unique partial index', () => {
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS invoice_item_id uuid')
    expect(sql).toContain('invoice_payments_invoice_item_uidx')
    expect(sql).toContain('REFERENCES public.invoice_items(id)')
  })

  it('defines tenant-scoped idempotency table', () => {
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.invoice_create_idempotency')
    expect(sql).toContain('PRIMARY KEY (tenant_id, idempotency_key)')
    expect(sql).toContain('GRANT ALL ON public.invoice_create_idempotency TO service_role')
  })

  it('defines atomic RPC with authz and offline methods', () => {
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.create_invoice_with_settlement')
    expect(sql).toContain("v_actor.role NOT IN ('admin', 'staff', 'tenant_admin')")
    expect(sql).toContain("v_actor.role NOT IN ('admin', 'tenant_admin')")
    expect(sql).toContain("v_method NOT IN ('cash', 'twint', 'bank_transfer', 'card_terminal')")
    expect(sql).toContain('pg_advisory_xact_lock')
    expect(sql).toContain('INSERT INTO public.audit_logs')
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.create_invoice_with_settlement')
    expect(sql).toContain('TO service_role')
  })

  it('completes linked payments without stamping invoice method first', () => {
    expect(sql).toContain("payment_method = v_method")
    expect(sql).toContain("payment_status = 'completed'")
    // unpaid claim path still uses invoice method
    expect(sql).toContain("payment_method = 'invoice'")
    expect(sql).toContain("payment_status = 'invoiced'")
  })

  it('does not insert cash_transactions from invoice_payments', () => {
    expect(sql).not.toMatch(/INSERT INTO public\.cash_transactions/i)
  })
})

describe('create API wiring', () => {
  const src = read('server/api/invoices/create.post.ts')

  it('gates create roles and uses RPC for settlements', () => {
    expect(src).toContain('canCreateInvoice')
    expect(src).toContain('validateLineSettlements')
    expect(src).toContain('callCreateInvoiceWithSettlement')
    expect(src).toContain('idempotency_key')
  })
})

describe('download/resend QR outstanding wiring', () => {
  it('download uses outstanding QR helper', () => {
    const src = read('server/api/invoices/download.post.ts')
    expect(src).toContain('invoiceCreateQrAmountRappen')
    expect(src).toContain('paidAmountRappen')
    expect(src).toContain('outstandingRappen')
    expect(src).toContain('qrAmountRappen <= 0')
  })

  it('resend uses outstanding QR helper', () => {
    const src = read('server/api/invoices/resend.post.ts')
    expect(src).toContain('invoiceCreateQrAmountRappen')
    expect(src).toContain('paidAmountRappen')
    expect(src).toContain('outstandingRappen')
  })
})

describe('cash ledger trigger contract (existing)', () => {
  it('fires on payments insert/update and dedupes by appointment', () => {
    const foundation = read('migrations/20261004_cash_ledger_foundation.sql')
    expect(foundation).toContain('create_cash_transaction_from_payment')
    expect(foundation).toContain('IF NEW.appointment_id IS NULL THEN')
    expect(foundation).toContain("NEW.payment_method = 'cash'")
    expect(foundation).toContain("NEW.payment_status = 'completed'")
    expect(foundation).toContain('AND status != \'disputed\'')

    const original = read('database_migration_cash_control.sql')
    expect(original).toContain('AFTER INSERT OR UPDATE ON payments')
  })
})
