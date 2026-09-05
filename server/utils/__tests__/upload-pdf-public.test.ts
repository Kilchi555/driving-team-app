import { describe, expect, it } from 'vitest'
import {
  buildPdfStoragePath,
  isValidStorageKey,
  sanitizeStorageFilename,
  uploadPdfAndGetPublicUrl,
} from '../upload-pdf-public'

describe('sanitizeStorageFilename', () => {
  it('transliterates umlauts so Zürich course names become valid storage keys', () => {
    const name = sanitizeStorageFilename(
      'Teilnehmerliste_Motorrad_Grundkurs_Zürich-Altstetten_-_29.08.2026.pdf'
    )
    expect(name).toBe('Teilnehmerliste_Motorrad_Grundkurs_Zuerich-Altstetten_-_29.08.2026.pdf')
    expect(isValidStorageKey(`participant-lists/2026/08/uuid_${name}`)).toBe(true)
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

describe('buildPdfStoragePath', () => {
  it('keeps the object key ASCII-only and free of the course name', () => {
    const { filepath, filename } = buildPdfStoragePath(
      'participant-lists',
      'Teilnehmerliste_Motorrad_Grundkurs_Zürich-Altstetten_-_29.08.2026.pdf',
      '7be38dda-9882-4efc-a2c6-b5e66813f9f7',
      new Date('2026-08-24T08:00:00+02:00'),
    )
    expect(filename).toBe('Teilnehmerliste_Motorrad_Grundkurs_Zuerich-Altstetten_-_29.08.2026.pdf')
    expect(filepath).toBe('participant-lists/2026/08/7be38dda-9882-4efc-a2c6-b5e66813f9f7.pdf')
    expect(isValidStorageKey(filepath)).toBe(true)
    expect(filepath.includes('ü')).toBe(false)
    expect(filepath.includes('Zuerich')).toBe(false)
  })
})

describe('uploadPdfAndGetPublicUrl', () => {
  it('returns a receipts signed URL and never a public object URL', async () => {
    const supabase = {
      storage: {
        from(bucket: string) {
          return {
            upload: async () => ({ error: null }),
            createSignedUrl: async (path: string) => ({
              data: {
                signedUrl: `https://example.supabase.co/storage/v1/object/sign/${bucket}/${path}?token=t`,
              },
              error: null,
            }),
            getPublicUrl: (path: string) => ({
              data: {
                publicUrl: `https://example.supabase.co/storage/v1/object/public/${bucket}/${path}`,
              },
            }),
          }
        },
      },
    }

    const { pdfUrl } = await uploadPdfAndGetPublicUrl(supabase, {
      folder: 'invoices',
      filename: 'Rechnung.pdf',
      pdfBuffer: Buffer.from('%PDF'),
    })

    expect(pdfUrl).toContain('/object/sign/receipts/')
    expect(pdfUrl).not.toContain('/object/public/receipts/')
    expect(pdfUrl).not.toContain('/object/public/user-documents/')
  })
})
