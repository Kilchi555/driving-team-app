import { describe, expect, it } from 'vitest'
import { salesDetailFailureMessage, salesDetailLoadFailure } from '../sales-detail-state'

describe('sales detail load failures', () => {
  it('distinguishes not found, unauthorized, and other API failures', () => {
    expect(salesDetailLoadFailure(404)).toBe('not_found')
    expect(salesDetailLoadFailure(401)).toBe('unauthorized')
    expect(salesDetailLoadFailure(403)).toBe('unauthorized')
    expect(salesDetailLoadFailure(500)).toBe('error')
    expect(salesDetailLoadFailure(undefined)).toBe('error')
    expect(salesDetailFailureMessage('not_found')).toBe('Prospect nicht gefunden.')
    expect(salesDetailFailureMessage('unauthorized')).toBe('Kein Zugriff auf diesen Prospect.')
    expect(salesDetailFailureMessage('error')).toBe('Die Prospect-Daten konnten nicht geladen werden.')
  })
})
