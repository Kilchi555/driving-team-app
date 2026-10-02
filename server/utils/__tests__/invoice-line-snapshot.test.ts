import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  GENERIC_INVOICE_LINE_LABEL,
  formatCustomerInvoiceLine,
  formatStaffInvoiceLineTitle,
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

describe('staff and customer lines', () => {
  it('renders event type with the staff first name, then the customer', () => {
    expect(formatStaffInvoiceLineTitle({ productName: 'Fahrstunde', staffFirstName: 'Peter' })).toBe('Fahrstunde mit Peter')
    expect(formatStaffInvoiceLineTitle({ productName: 'Prüfung', staffFirstName: 'Peter' })).toBe('Prüfung mit Peter')
    expect(formatStaffInvoiceLineTitle({ productName: 'Theorie', staffFirstName: 'Anna' })).toBe('Theorie mit Anna')
    expect(formatCustomerInvoiceLine({ customerFirstName: 'Max', customerLastName: 'Muster' })).toBe('Kunde: Max Muster')
    expect(formatCustomerInvoiceLine({ customerFirstName: 'Anna', customerLastName: 'Beispiel' })).toBe('Kunde: Anna Beispiel')
  })

  it('uses the same two lines for private and company service lines', () => {
    const presented = presentStoredInvoiceLine({
      productName: 'Fahrstunde',
      eventTypeCode: 'lesson',
      staffFirstName: 'Peter',
      customerFirstName: 'Max',
      customerLastName: 'Muster',
    })
    expect(presented).toEqual({
      product_name: 'Fahrstunde mit Peter',
      breakdown_label: 'Fahrstunde',
      customer_line: 'Kunde: Max Muster',
    })
  })

  it('keeps two customers distinct from their own snapshots', () => {
    const lines = [
      { first: 'Max', last: 'Muster' },
      { first: 'Anna', last: 'Beispiel' },
    ].map((person) => presentStoredInvoiceLine({
      productName: 'Fahrstunde',
      eventTypeCode: 'lesson',
      staffFirstName: 'Peter',
      customerFirstName: person.first,
      customerLastName: person.last,
    }).customer_line)
    expect(lines).toEqual(['Kunde: Max Muster', 'Kunde: Anna Beispiel'])
  })

  it('keeps the cancellation suffix after the staff name', () => {
    expect(formatStaffInvoiceLineTitle({
      productName: 'Fahrstunde (abgesagt – 50% verrechnet)',
      staffFirstName: 'Peter',
    })).toBe('Fahrstunde mit Peter (abgesagt – 50% verrechnet)')
  })

  it('does not invent staff or a customer line for course lines', () => {
    expect(presentStoredInvoiceLine({
      productName: 'Erste Hilfe',
      eventTypeCode: null,
      staffFirstName: 'Peter',
      customerFirstName: 'Max',
      customerLastName: 'Muster',
    })).toEqual({
      product_name: 'Erste Hilfe',
      breakdown_label: 'Erste Hilfe',
      customer_line: null,
    })
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
      eventTypeCode: stored.event_type_code,
      staffFirstName: 'Peter',
      customerFirstName: 'Anna',
      customerLastName: 'Beispiel',
    })
    expect(liveAppointment.event_type_code).toBe('lesson')
    expect(presented.product_name).toBe('Theorie mit Peter')
    expect(presented.customer_line).toBe('Kunde: Anna Beispiel')
    expect(presented.breakdown_label).toBe('Theorie')
    expect(invoiceLineBreakdownLabel(stored.product_name)).toBe('Theorie')
    expect(presented.breakdown_label).not.toBe(liveAppointment.name)
  })

  it('keeps a product sale name without a student suffix', () => {
    expect(presentStoredInvoiceLine({
      productName: 'Lehrmittel',
      productId: 'prod-1',
      staffFirstName: 'Peter',
      customerFirstName: 'Max',
      customerLastName: 'Muster',
      eventTypeCode: 'lesson',
    })).toEqual({ product_name: 'Lehrmittel', breakdown_label: 'Lehrmittel', customer_line: null })
  })

  it('historical rows without staff or customer snapshots stay on the stored name', () => {
    const presented = presentStoredInvoiceLine({
      productName: 'Fahrstunde',
      eventTypeCode: 'lesson',
      staffFirstName: null,
      customerFirstName: null,
      customerLastName: null,
    })
    expect(presented.product_name).toBe('Fahrstunde')
    expect(presented.customer_line).toBeNull()
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
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS staff_id uuid')
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS staff_first_name text')
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS customer_first_name text')
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS customer_last_name text')
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
