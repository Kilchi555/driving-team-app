import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { primaryGroupedPhone } from '../sales-intelligence'

function source(path: string): string {
  return readFileSync(new URL(`../../../${path}`, import.meta.url), 'utf8')
}

describe('grouped phone surfaces', () => {
  it('shows the same primary phone on the sprint list, follow-ups, and detail extras', () => {
    const primary = primaryGroupedPhone(null, ['+41 79 555 30 01', '079 555 30 03'])
    expect(primary).toBe('+41 79 555 30 01')
    expect(primaryGroupedPhone('079 555 20 01', ['+41 79 555 20 02'])).toBe('079 555 20 01')
    const list = source('pages/tenant-admin/sales/index.vue')
    const followUps = source('server/api/tenant-admin/sales/follow-ups.get.ts')
    const detail = source('pages/tenant-admin/sales/[id].vue')
    expect(list).toContain('row.phone')
    expect(followUps).toContain('primaryGroupedPhone(row.prospect.phone, row.prospect.additional_phones)')
    expect(detail).toContain('additional_phones')
    expect(detail).toContain('phoneList')
  })
})
