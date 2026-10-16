import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('tsconfig.json', () => {
  it('parses as JSON because nuxi typecheck reads it with JSON.parse', () => {
    const text = readFileSync('tsconfig.json', 'utf8')
    expect(() => JSON.parse(text)).not.toThrow()
    const parsed = JSON.parse(text) as { compilerOptions?: { strict?: boolean } }
    expect(parsed.compilerOptions?.strict).toBe(true)
  })
})
