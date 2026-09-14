import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { staffDefaultCategoryCode, staffRequiresCategory } from '~/utils/staff-category-defaults'

describe('staff category defaults — no fake B', () => {
  it('17. requiresCategory is driving_school AND categories.length > 0', () => {
    expect(staffRequiresCategory('driving_school', 3)).toBe(true)
    expect(staffRequiresCategory('driving_school', 0)).toBe(false)
    expect(staffRequiresCategory('consulting', 3)).toBe(false)
    expect(staffRequiresCategory('consulting', 0)).toBe(false)
  })

  it('never invents category B', () => {
    expect(staffDefaultCategoryCode([])).toBeNull()
    expect(staffDefaultCategoryCode(['A', 'C'])).toBe('A')
    expect(staffDefaultCategoryCode(['B'])).toBe('B')
  })
})

describe('staff UI does not invent B', () => {
  it('EventModal no longer assigns type = B', () => {
    const src = readFileSync(resolve(process.cwd(), 'components/EventModal.vue'), 'utf8')
    expect(src).not.toMatch(/formData\.value\.type = 'B'/)
    expect(src).not.toMatch(/selectedCategory\.value = \{ code: 'B' \}/)
  })

  it('CategorySelector does not emit B when no user is selected', () => {
    const src = readFileSync(resolve(process.cwd(), 'components/CategorySelector.vue'), 'utf8')
    expect(src).not.toMatch(/loading default category: B/)
    expect(src).not.toMatch(/emit\('update:modelValue', 'B'\)/)
  })
})
