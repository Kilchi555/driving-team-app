import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { filterLeafCategories, selectPersistableLeafCodes } from '~/utils/category-leaf'

const TENANT = '64259d68-195a-4c68-8875-f1b44d962830'
const OTHER = '11111111-1111-1111-1111-111111111111'

const taxonomy = [
  { id: 23, code: 'A', parent_category_id: null, tenant_id: TENANT, is_active: true },
  { id: 59, code: 'A', parent_category_id: 23, tenant_id: TENANT, is_active: true },
  { id: 56, code: 'A1', parent_category_id: 23, tenant_id: TENANT, is_active: true },
  { id: 58, code: 'A35kW', parent_category_id: 23, tenant_id: TENANT, is_active: true },
  { id: 22, code: 'B', parent_category_id: null, tenant_id: TENANT, is_active: true },
  { id: 60, code: 'B Automatik', parent_category_id: 22, tenant_id: TENANT, is_active: true },
  { id: 54, code: 'B Schaltung', parent_category_id: 22, tenant_id: TENANT, is_active: true },
  { id: 25, code: 'BPT', parent_category_id: 22, tenant_id: TENANT, is_active: true },
  { id: 24, code: 'BE', parent_category_id: null, tenant_id: TENANT, is_active: true },
  { id: 31, code: 'Boot', parent_category_id: null, tenant_id: TENANT, is_active: true },
  { id: 27, code: 'C', parent_category_id: null, tenant_id: TENANT, is_active: true },
  { id: 61, code: 'C', parent_category_id: 27, tenant_id: TENANT, is_active: true },
  { id: 26, code: 'C1/D1', parent_category_id: 27, tenant_id: TENANT, is_active: true },
  { id: 28, code: 'CE', parent_category_id: 27, tenant_id: TENANT, is_active: true },
  { id: 29, code: 'D', parent_category_id: null, tenant_id: TENANT, is_active: true },
  { id: 90, code: 'B Automatik', parent_category_id: null, tenant_id: OTHER, is_active: true },
]

describe('StaffSettings profile picker', () => {
  const source = readFileSync('components/StaffSettings.vue', 'utf8')

  it('offers the shared leaf list and does not bind the profile picker to every category', () => {
    expect(source).toContain("import { dedupeSortedCategoryCodes, filterLeafCategories } from '~/utils/category-leaf'")
    expect(source).toContain('v-for="cat in availableCategories"')
    expect(source).not.toContain('v-for="cat in (allCategories.length ? allCategories : availableCategories)"')
    expect(source).toContain('filterLeafCategories(rows)')
  })
})

describe('filterLeafCategories', () => {
  const leaves = filterLeafCategories(taxonomy.filter((row) => row.tenant_id === TENANT))
  const codes = leaves.map((row) => row.code)

  it('excludes mains that have children and keeps their subs', () => {
    expect(codes).not.toContain('B')
    expect(leaves.find((row) => row.id === 22)).toBeUndefined()
    expect(codes).toEqual(expect.arrayContaining(['B Automatik', 'B Schaltung', 'BPT']))
  })

  it('keeps mains without children', () => {
    expect(codes).toEqual(expect.arrayContaining(['BE', 'Boot', 'D']))
  })

  it('keeps the subcategory when main and sub share a code', () => {
    expect(leaves.filter((row) => row.code === 'A').map((row) => row.id)).toEqual([59])
    expect(leaves.filter((row) => row.code === 'C').map((row) => row.id)).toEqual([61])
    expect(codes).toEqual(expect.arrayContaining(['A1', 'A35kW', 'C1/D1', 'CE']))
  })
})

describe('selectPersistableLeafCodes', () => {
  it.each([
    ['B Automatik'],
    ['B Schaltung'],
    ['BPT'],
    ['BE'],
    ['Boot'],
    ['D'],
  ])('accepts leaf %s', (code) => {
    const decision = selectPersistableLeafCodes([code], taxonomy, TENANT)
    expect(decision).toEqual({ ok: true, codes: [code] })
  })

  it('accepts an empty selection', () => {
    expect(selectPersistableLeafCodes([], taxonomy, TENANT)).toEqual({ ok: true, codes: [] })
  })

  it('rejects a main that has children', () => {
    const decision = selectPersistableLeafCodes(['B'], taxonomy, TENANT)
    expect(decision.ok).toBe(false)
  })

  it('rejects a parent mixed with a valid leaf', () => {
    const decision = selectPersistableLeafCodes(['B', 'B Automatik'], taxonomy, TENANT)
    expect(decision.ok).toBe(false)
  })

  it('rejects unknown codes', () => {
    expect(selectPersistableLeafCodes(['unknown'], taxonomy, TENANT).ok).toBe(false)
  })

  it('rejects a code that exists only in another tenant', () => {
    const foreignOnly = [{ id: 1, code: 'FOREIGN', parent_category_id: null, tenant_id: OTHER, is_active: true }]
    expect(selectPersistableLeafCodes(['FOREIGN'], foreignOnly, TENANT).ok).toBe(false)
  })

  it('deduplicates and sorts leaf codes', () => {
    const decision = selectPersistableLeafCodes(['Boot', 'B Automatik', 'B Automatik'], taxonomy, TENANT)
    expect(decision).toEqual({ ok: true, codes: ['B Automatik', 'Boot'] })
  })

  it('rejects non-arrays and non-strings', () => {
    expect(selectPersistableLeafCodes(null, taxonomy, TENANT).ok).toBe(false)
    expect(selectPersistableLeafCodes('B', taxonomy, TENANT).ok).toBe(false)
    expect(selectPersistableLeafCodes([123], taxonomy, TENANT).ok).toBe(false)
  })
})
