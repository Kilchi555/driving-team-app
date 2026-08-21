import { describe, expect, it } from 'vitest'
import { sanitizeStorageFilename } from '../upload-pdf-public'

// Mirrors supabase/storage `isValidKey` (ASCII / S3-safe object keys only).
const SUPABASE_KEY_RE = /^(\w|\/|!|-|\.|\*|'|\(|\)| |&|\$|@|=|;|:|\+|,|\?)*$/

describe('sanitizeStorageFilename', () => {
  it('transliterates umlauts so Zürich course names become valid storage keys', () => {
    const name = sanitizeStorageFilename(
      'Teilnehmerliste_Motorrad_Grundkurs_Zürich-Altstetten_-_08.08.2026.pdf'
    )
    expect(name).toBe('Teilnehmerliste_Motorrad_Grundkurs_Zuerich-Altstetten_-_08.08.2026.pdf')
    expect(SUPABASE_KEY_RE.test(`participant-lists/2026/08/uuid_${name}`)).toBe(true)
  })

  it('strips remaining accents and collapses junk characters', () => {
    expect(sanitizeStorageFilename('Brief Genève / été.pdf')).toBe('Brief_Geneve_ete.pdf')
    expect(sanitizeStorageFilename('  Rechnung #12 (Müller) .pdf  ')).toBe('Rechnung_12_Mueller.pdf')
  })

  it('keeps a usable fallback when the name is empty after sanitizing', () => {
    expect(sanitizeStorageFilename('___')).toBe('file.bin')
    expect(sanitizeStorageFilename('')).toBe('file.bin')
  })
})
