import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('sales workspace page order', () => {
  it('orders every ranged read by primary key', () => {
    const source = readFileSync(new URL('../sales-workspace.ts', import.meta.url), 'utf8')
    const reads = source.split('.range(').length - 1
    const ordered = source.match(/\.order\('id', \{ ascending: true \}\)\s*\.range\(/g) || []
    expect(reads).toBe(6)
    expect(ordered).toHaveLength(reads)
  })

  it('shows that unordered pages can drop engagement rows', () => {
    const rows = Array.from({ length: 2500 }, (_, index) => `id-${String(index).padStart(4, '0')}`)
    const collect = (page: (from: number, to: number) => string[]) => {
      const out: string[] = []
      const size = 1000
      for (let from = 0; ; from += size) {
        const batch = page(from, from + size - 1)
        out.push(...batch)
        if (batch.length < size) break
      }
      return out
    }
    const ordered = collect((from, to) => rows.slice(from, to + 1))
    const unordered = collect((from, to) => {
      const flipped = from === 0 ? [...rows].reverse() : rows
      return flipped.slice(from, to + 1)
    })
    expect(new Set(ordered).size).toBe(rows.length)
    expect(new Set(unordered).size).toBeLessThan(rows.length)
  })
})
