import { describe, expect, it } from 'vitest'
import { firstCategoryCode, resolveEvaluationStudentCategory } from '~/utils/evaluation-student-category'

describe('firstCategoryCode', () => {
  it('reads string, CSV and array', () => {
    expect(firstCategoryCode('B,A')).toBe('B')
    expect(firstCategoryCode(['BE', 'B'])).toBe('BE')
    expect(firstCategoryCode(null)).toBe('')
  })
})

describe('resolveEvaluationStudentCategory', () => {
  it('keeps the Fahrschul A/B fallback', () => {
    expect(resolveEvaluationStudentCategory({
      isDrivingSchool: true,
      appointmentType: 'B',
    })).toBe('B')
    expect(resolveEvaluationStudentCategory({
      isDrivingSchool: true,
      userCategory: ['A1'],
    })).toBe('A1')
    expect(resolveEvaluationStudentCategory({
      isDrivingSchool: true,
    })).toBe('A')
  })

  it('does not invent a license code for other verticals', () => {
    expect(resolveEvaluationStudentCategory({
      isDrivingSchool: false,
      eventTypeCode: 'ganzheitliche_fernbehandlung',
    })).toBe('ganzheitliche_fernbehandlung')
    expect(resolveEvaluationStudentCategory({
      isDrivingSchool: false,
      type: 'session',
    })).toBe('session')
    expect(resolveEvaluationStudentCategory({
      isDrivingSchool: false,
    })).toBe('')
  })
})
