import { describe, expect, it } from 'vitest'
import { isAllowedUserDocumentType } from '~/utils/document-types'

describe('isAllowedUserDocumentType', () => {
  it('accepts category-specific licence prefixes used by staff uploads', () => {
    expect(isAllowedUserDocumentType('lernfahrausweis')).toBe(true)
    expect(isAllowedUserDocumentType('lernfahrausweis_a')).toBe(true)
    expect(isAllowedUserDocumentType('lernfahrausweis_be')).toBe(true)
    expect(isAllowedUserDocumentType('fuehrerschein')).toBe(true)
    expect(isAllowedUserDocumentType('fuehrerschein_ce')).toBe(true)
  })

  it('rejects unknown or unsafe values', () => {
    expect(isAllowedUserDocumentType('notes')).toBe(false)
    expect(isAllowedUserDocumentType('../secret')).toBe(false)
    expect(isAllowedUserDocumentType('')).toBe(false)
  })
})
