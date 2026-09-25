import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  GENERIC_INVOICE_LINE_LABEL,
  formatInvoiceLineTitle,
  invoiceLineBreakdownLabel,
  loadTenantEventTypeNames,
  presentStoredInvoiceLine,
  resolveInvoiceLineLabel,
} from '../invoice-line-snapshot'

describe('resolveInvoiceLineLabel', () => {
  it('lesson, exam and theory use the tenant event type name', () => {
    expect(resolveInvoiceLineLabel({ eventTypeName: 'Fahrstunde' })).toBe('Fahrstunde')
    expect(resolveInvoiceLineLabel({ eventTypeName: 'Prüfung' })).toBe('Prüfung')
    expect(resolveInvoiceLineLabel({ eventTypeName: 'Theorie' })).toBe('Theorie')
  })

  it('does not force Theorieunterricht over the tenant name', () => {
    expect(resolveInvoiceLineLabel({
      eventTypeName: 'Theorie',
      existingTitle: 'Theorieunterricht',
    })).toBe('Theorie')
  })

  it('unknown and empty event types fall back to Leistung', () => {
    expect(resolveInvoiceLineLabel({ eventTypeName: null, existingTitle: 'Fahrstunde' })).toBe(GENERIC_INVOICE_LINE_LABEL)
    expect(resolveInvoiceLineLabel({ eventTypeName: '', existingTitle: '' })).toBe('Leistung')
    expect(resolveInvoiceLineLabel({ eventTypeName: null, existingTitle: null })).toBe('Leistung')
  })

  it('keeps a real appointment title when the tenant has no event type name', () => {
    expect(resolveInvoiceLineLabel({
      eventTypeName: null,
      existingTitle: 'Max - Treffpunkt',
    })).toBe('Max - Treffpunkt')
  })
})

describe('company and private presentation', () => {
  it('appends the student only on company service lines', () => {
    expect(formatInvoiceLineTitle({
      productName: 'Fahrstunde',
      billingType: 'company',
      studentName: 'Max Muster',
      eventTypeCode: 'lesson',
    })).toBe('Fahrstunde – Max Muster')
    expect(formatInvoiceLineTitle({
      productName: 'Prüfung',
      billingType: 'company',
      studentName: 'Max Muster',
      eventTypeCode: 'exam',
    })).toBe('Prüfung – Max Muster')
    expect(formatInvoiceLineTitle({
      productName: 'Theorie',
      billingType: 'company',
      studentName: 'Anna Beispiel',
      eventTypeCode: 'theory',
    })).toBe('Theorie – Anna Beispiel')
  })

  it('keeps two students distinct from the stored snapshot', () => {
    const lines = [
      { productName: 'Fahrstunde', user: 'Max Muster', code: 'lesson' },
      { productName: 'Fahrstunde', user: 'Anna Beispiel', code: 'lesson' },
    ].map((line) => formatInvoiceLineTitle({
      productName: line.productName,
      billingType: 'company',
      studentName: line.user,
      eventTypeCode: line.code,
    }))
    expect(lines).toEqual(['Fahrstunde – Max Muster', 'Fahrstunde – Anna Beispiel'])
  })

  it('does not append the student on a private invoice', () => {
    expect(formatInvoiceLineTitle({
      productName: 'Fahrstunde',
      billingType: 'individual',
      studentName: 'Max Muster',
      eventTypeCode: 'lesson',
    })).toBe('Fahrstunde')
  })

  it('does not invent an event type or student suffix for course lines', () => {
    expect(formatInvoiceLineTitle({
      productName: 'Erste Hilfe',
      billingType: 'company',
      studentName: 'Max Muster',
      eventTypeCode: null,
    })).toBe('Erste Hilfe')
  })
})

describe('stored snapshot presentation', () => {
  it('uses the stored product name and ignores a later event type', () => {
    const stored = {
      product_name: 'Theorie',
      event_type_code: 'theory',
      user_id: 'student-anna',
    }
    const liveAppointment = { event_type_code: 'lesson', user_id: 'someone-else', name: 'Fahrstunde' }
    const presented = presentStoredInvoiceLine({
      productName: stored.product_name,
      billingType: 'company',
      studentName: 'Anna Beispiel',
      eventTypeCode: stored.event_type_code,
    })
    expect(liveAppointment.event_type_code).toBe('lesson')
    expect(presented.product_name).toBe('Theorie – Anna Beispiel')
    expect(presented.breakdown_label).toBe('Theorie')
    expect(invoiceLineBreakdownLabel(stored.product_name)).toBe('Theorie')
    expect(presented.breakdown_label).not.toBe(liveAppointment.name)
  })

  it('keeps a product sale name without a student suffix', () => {
    expect(presentStoredInvoiceLine({
      productName: 'Lehrmittel',
      productId: 'prod-1',
      billingType: 'company',
      studentName: 'Max Muster',
      eventTypeCode: 'lesson',
    })).toEqual({ product_name: 'Lehrmittel', breakdown_label: 'Lehrmittel' })
  })

  it('historical rows without a snapshot stay on the stored name', () => {
    expect(presentStoredInvoiceLine({
      productName: 'Fahrstunde mit Peter',
      billingType: 'company',
      studentName: 'Max Muster',
      eventTypeCode: null,
    }).product_name).toBe('Fahrstunde mit Peter')
  })
})

describe('loadTenantEventTypeNames', () => {
  it('loads exact tenant codes and ignores another tenant', async () => {
    const rows: Array<Record<string, string>> = [
      { tenant_id: 'tenant-a', code: 'lesson', name: 'Fahrstunde' },
      { tenant_id: 'tenant-a', code: 'theory', name: 'Theorie' },
      { tenant_id: 'tenant-b', code: 'lesson', name: 'Other' },
    ]
    const supabase = {
      from() {
        let filtered = [...rows]
        const chain = {
          select: () => chain,
          eq(col: string, value: string) {
            filtered = filtered.filter((row) => row[col] === value)
            return chain
          },
          in(col: string, values: string[]) {
            filtered = filtered.filter((row) => values.includes(row[col]))
            return Promise.resolve({ data: filtered })
          },
        }
        return chain
      },
    }
    const names = await loadTenantEventTypeNames(supabase, 'tenant-a', ['lesson', 'theory', 'unknown', null])
    expect(names).toEqual({ lesson: 'Fahrstunde', theory: 'Theorie' })
  })
})

describe('migration and pdf label source', () => {
  it('adds nullable snapshot columns and does not rewrite existing rows', () => {
    const sql = readFileSync(resolve(process.cwd(), 'migrations/20260925_invoice_item_line_snapshot.sql'), 'utf8')
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS event_type_code text')
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS user_id uuid')
    expect(sql).toContain('ON DELETE SET NULL')
    expect(sql.toLowerCase()).not.toContain('update invoice_items')
    expect(sql.toLowerCase()).not.toContain('drop column')
  })

  it('download and resend do not relabel lines from the live event type', () => {
    const download = readFileSync(resolve(process.cwd(), 'server/api/invoices/download.post.ts'), 'utf8')
    const resend = readFileSync(resolve(process.cwd(), 'server/api/invoices/resend.post.ts'), 'utf8')
    for (const src of [download, resend]) {
      expect(src).toContain('presentStoredInvoiceLine')
      expect(src).not.toContain('eventTypeLabelMap')
      expect(src).not.toContain('buildInvoiceServiceLineLabel')
      expect(src).not.toContain('getTenantTerminology')
    }
  })
})
