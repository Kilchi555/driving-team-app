import { describe, expect, it } from 'vitest'
import { isStockEventTypeColor } from '../stock-event-type-color'

describe('isStockEventTypeColor', () => {
  it('treats Simy template indigo and sky as stock', () => {
    expect(isStockEventTypeColor('#6366f1')).toBe(true)
    expect(isStockEventTypeColor('#6366F1')).toBe(true)
    expect(isStockEventTypeColor('#0EA5E9')).toBe(true)
  })

  it('keeps a tenant brand color', () => {
    expect(isStockEventTypeColor('#3D4A64')).toBe(false)
  })
})
