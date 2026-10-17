import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { matchesDiscountCategoryFilter } from '~/server/utils/discount-category-filter'
import { staffDiscountCategoryCode } from '~/utils/staff-discount-category-code'

const eventModal = readFileSync(resolve(process.cwd(), 'components/EventModal.vue'), 'utf8')
const priceDisplay = readFileSync(resolve(process.cwd(), 'components/PriceDisplay.vue'), 'utf8')
const validateRoute = readFileSync(resolve(process.cwd(), 'server/api/discounts/validate.post.ts'), 'utf8')

describe('staffDiscountCategoryCode', () => {
  it('sends the license category, not the appointment type', () => {
    expect(staffDiscountCategoryCode('B Automatik', 'lesson')).toBe('B Automatik')
  })

  it('uses the selected category code when type is empty', () => {
    const type = ''
    const selectedCode = 'B Automatik'
    expect(staffDiscountCategoryCode(type || selectedCode, 'lesson')).toBe('B Automatik')
  })

  it('never sends lesson/exam/theory as a category code', () => {
    expect(staffDiscountCategoryCode('lesson', 'lesson')).toBeNull()
    expect(staffDiscountCategoryCode('exam', 'exam')).toBeNull()
    expect(staffDiscountCategoryCode('theory')).toBeNull()
  })

  it('returns null when no category is known', () => {
    expect(staffDiscountCategoryCode(null, 'lesson')).toBeNull()
    expect(staffDiscountCategoryCode('', 'lesson')).toBeNull()
  })
})

describe('staff voucher category wiring', () => {
  it('EventModal passes discountCategoryCode into PriceDisplay', () => {
    expect(eventModal).toMatch(/:category-code="discountCategoryCode"/)
    expect(eventModal).toMatch(/staffDiscountCategoryCode/)
  })

  it('PriceDisplay still posts props.categoryCode to the existing validate API', () => {
    expect(priceDisplay).toMatch(/categoryCode:\s*props\.categoryCode\s*\|\|\s*null/)
    expect(priceDisplay).toMatch(/['"]\/api\/discounts\/validate['"]/)
  })
})

describe('SCHNUPPER60 staff checkout category path', () => {
  const voucherFilter = 'B Automatik'

  it('Test A: matching staff category is accepted', () => {
    const categoryCode = staffDiscountCategoryCode('B Automatik', 'lesson')
    expect(categoryCode).toBe('B Automatik')
    expect(matchesDiscountCategoryFilter(voucherFilter, categoryCode)).toBe(true)
  })

  it('Test B: parent category B does not match B Automatik', () => {
    const categoryCode = staffDiscountCategoryCode('B', 'lesson')
    expect(categoryCode).toBe('B')
    expect(matchesDiscountCategoryFilter(voucherFilter, categoryCode)).toBe(false)
  })

  it('Test C: unrestricted voucher stays valid without a category', () => {
    expect(matchesDiscountCategoryFilter(null, null)).toBe(true)
    expect(matchesDiscountCategoryFilter(null, 'B Automatik')).toBe(true)
  })

  it('missing categoryCode still fails a restricted voucher (backend unchanged)', () => {
    expect(matchesDiscountCategoryFilter(voucherFilter, null)).toBe(false)
  })
})

describe('Test D: tenant isolation on discount validate', () => {
  it('discounts lookup stays scoped to the authenticated tenant', () => {
    const discountsLookup = validateRoute.slice(
      validateRoute.indexOf(".from('discounts')"),
      validateRoute.indexOf('.maybeSingle()', validateRoute.indexOf(".from('discounts')")) + '.maybeSingle()'.length,
    )
    expect(discountsLookup).toContain(".eq('tenant_id', tenantId)")
    expect(validateRoute).toContain("if (authUser?.tenant_id)")
  })
})
