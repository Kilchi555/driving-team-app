import { describe, expect, it } from 'vitest'
import { createStoreZip } from '../zip-store'

describe('createStoreZip', () => {
  it('writes a zip with local + central headers', () => {
    const zip = createStoreZip([
      { name: 'README.txt', data: Buffer.from('hello', 'utf8') },
      { name: 'buchungen.csv', data: Buffer.from('a,b\n1,2\n', 'utf8') },
    ])
    expect(zip.readUInt32LE(0)).toBe(0x04034b50)
    expect(zip.includes(Buffer.from('README.txt'))).toBe(true)
    expect(zip.includes(Buffer.from('PK\x05\x06'))).toBe(true)
    expect(zip.length).toBeGreaterThan(80)
  })
})
