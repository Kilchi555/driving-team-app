import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  GENERIC_INVOICE_LINE_LABEL,
  buildServiceLineSnapshot,
  formatCustomerInvoiceLine,
  formatStaffInvoiceLineTitle,
  hasServiceLineSnapshot,
  invoiceLineBreakdownLabel,
  loadTenantEventTypeNames,
  presentStoredInvoiceLine,
  resolveInvoiceLineLabel,
} from '../invoice-line-snapshot'

describe('resolveInvoiceLineLabel', () => {
  it('uses the tenant event type name', () => {
    expect(resolveInvoiceLineLabel({ eventTypeName: 'Fahrstunde' })).toBe('Fahrstunde')
    expect(resolveInvoiceLineLabel({ eventTypeName: 'Theorie' })).toBe('Theorie')
  })

  it('falls back to Leistung for generic titles', () => {
    expect(resolveInvoiceLineLabel({ eventTypeName: null, existingTitle: 'Fahrstunde' })).toBe(GENERIC_INVOICE_LINE_LABEL)
    expect(resolveInvoiceLineLabel({ eventTypeName: '', existingTitle: '' })).toBe('Leistung')
  })

  it('keeps a real appointment title when no event type name exists', () => {
    expect(resolveInvoiceLineLabel({
      eventTypeName: null,
      existingTitle: 'Max - Treffpunkt',
    })).toBe('Max - Treffpunkt')
  })
})

describe('presentStoredInvoiceLine', () => {
  it('renders staff on line 1 and customer on line 2 from snapshot columns', () => {
    expect(presentStoredInvoiceLine({
      productName: 'Fahrstunde',
      eventTypeCode: 'lesson',
      staffFirstName: 'Pascal',
      customerFirstName: 'Max',
      customerLastName: 'Muster',
    })).toEqual({
      product_name: 'Fahrstunde mit Pascal',
      breakdown_label: 'Fahrstunde',
      customer_line: 'Kunde: Max Muster',
    })
  })

  it('does not re-read a renamed live user — stored names win', () => {
    const stored = {
      product_name: 'Fahrstunde',
      event_type_code: 'lesson',
      staff_first_name: 'Pascal',
      customer_first_name: 'Max',
      customer_last_name: 'Muster',
    }
    const liveRenamed = { first_name: 'Max', last_name: 'Müller' }
    const presented = presentStoredInvoiceLine({
      productName: stored.product_name,
      eventTypeCode: stored.event_type_code,
      staffFirstName: stored.staff_first_name,
      customerFirstName: stored.customer_first_name,
      customerLastName: stored.customer_last_name,
    })
    expect(liveRenamed.last_name).toBe('Müller')
    expect(presented.customer_line).toBe('Kunde: Max Muster')
    expect(presented.product_name).toBe('Fahrstunde mit Pascal')
  })

  it('keeps two students distinct from frozen snapshots', () => {
    const lines = [
      { productName: 'Fahrstunde', first: 'Max', last: 'Muster', staff: 'Ada' },
      { productName: 'Fahrstunde', first: 'Anna', last: 'Beispiel', staff: 'Ada' },
    ].map((line) => presentStoredInvoiceLine({
      productName: line.productName,
      eventTypeCode: 'lesson',
      staffFirstName: line.staff,
      customerFirstName: line.first,
      customerLastName: line.last,
    }))
    expect(lines.map((l) => l.customer_line)).toEqual([
      'Kunde: Max Muster',
      'Kunde: Anna Beispiel',
    ])
  })

  it('historical rows without snapshot keep the stored name and omit customer_line', () => {
    expect(presentStoredInvoiceLine({
      productName: 'Fahrstunde mit Peter',
      eventTypeCode: null,
      staffFirstName: null,
      customerFirstName: null,
      customerLastName: null,
    })).toEqual({
      product_name: 'Fahrstunde mit Peter',
      breakdown_label: 'Fahrstunde mit Peter',
      customer_line: null,
    })
    expect(hasServiceLineSnapshot({
      eventTypeCode: null,
      staffFirstName: null,
      customerFirstName: null,
    })).toBe(false)
  })

  it('product sales keep their name without a customer line', () => {
    expect(presentStoredInvoiceLine({
      productName: 'Lehrmittel',
      productId: 'prod-1',
      eventTypeCode: 'lesson',
      staffFirstName: 'Pascal',
      customerFirstName: 'Max',
      customerLastName: 'Muster',
    })).toEqual({
      product_name: 'Lehrmittel',
      breakdown_label: 'Lehrmittel',
      customer_line: null,
    })
  })

  it('does not double-append staff when product_name already contains it', () => {
    expect(formatStaffInvoiceLineTitle({
      productName: 'Fahrstunde mit Pascal',
      staffFirstName: 'Pascal',
    })).toBe('Fahrstunde mit Pascal')
  })

  it('formats cancellation with staff before the absage suffix', () => {
    expect(formatStaffInvoiceLineTitle({
      productName: 'Fahrstunde (abgesagt – verrechnet)',
      staffFirstName: 'Pascal',
    })).toBe('Fahrstunde mit Pascal (abgesagt – verrechnet)')
  })
})

describe('buildServiceLineSnapshot', () => {
  it('freezes event, staff and customer at create time without embedding staff in product_name', () => {
    expect(buildServiceLineSnapshot({
      eventTypeCode: 'lesson',
      eventTypeName: 'Fahrstunde',
      staffId: 'staff-1',
      staffFirstName: 'Pascal',
      snapshotUserId: 'student-1',
      customerFirstName: 'Max',
      customerLastName: 'Muster',
    })).toEqual({
      event_type_code: 'lesson',
      user_id: 'student-1',
      staff_id: 'staff-1',
      staff_first_name: 'Pascal',
      customer_first_name: 'Max',
      customer_last_name: 'Muster',
      product_name: 'Fahrstunde',
    })
  })

  it('does not invent customer/staff snapshot for course lines without event type', () => {
    expect(buildServiceLineSnapshot({
      eventTypeCode: null,
      existingTitle: 'Erste Hilfe',
      snapshotUserId: 'student-1',
      customerFirstName: 'Max',
      customerLastName: 'Muster',
      staffFirstName: 'Pascal',
    })).toEqual({
      event_type_code: null,
      user_id: 'student-1',
      staff_id: null,
      staff_first_name: null,
      customer_first_name: null,
      customer_last_name: null,
      product_name: 'Erste Hilfe',
    })
  })
})

describe('formatCustomerInvoiceLine', () => {
  it('returns null without names', () => {
    expect(formatCustomerInvoiceLine({})).toBeNull()
  })
})

describe('invoiceLineBreakdownLabel', () => {
  it('falls back to Leistung', () => {
    expect(invoiceLineBreakdownLabel('')).toBe('Leistung')
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

describe('migration', () => {
  it('adds nullable snapshot columns without backfill', () => {
    const sql = readFileSync(resolve(process.cwd(), 'migrations/20261006_invoice_item_line_snapshot.sql'), 'utf8')
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS event_type_code text')
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS user_id uuid')
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS staff_first_name text')
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS customer_first_name text')
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS customer_last_name text')
    expect(sql).toContain('ON DELETE SET NULL')
    expect(sql.toLowerCase()).not.toContain('update invoice_items')
    expect(sql).toMatch(/Do not backfill/i)
  })
})
