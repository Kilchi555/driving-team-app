import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  assertPersistableReceiptRef,
  extractReceiptStoragePath,
  inferReceiptLocation,
  normalizeReceiptPath,
  receiptDisplayHref,
  resolveOwnedReceiptLocation,
  tenantOwnsReceiptPath,
} from '../receipt-storage'

const tenant = '11111111-1111-4111-8111-111111111111'
const other = '22222222-2222-4222-8222-222222222222'
const ownStaffPath = `${tenant}/accounting/staff/spesen_1.jpg`

describe('receipt storage paths', () => {
  it('maps staff expense, admin tenant-doc, and fallback paths to buckets', () => {
    expect(inferReceiptLocation(`${tenant}/accounting/staff/spesen_${tenant}_1.jpg`)).toEqual({
      bucket: 'receipts',
      path: `${tenant}/accounting/staff/spesen_${tenant}_1.jpg`,
    })
    expect(inferReceiptLocation(`${tenant}/accounting/beleg_1.pdf`)).toEqual({
      bucket: 'tenant-documents',
      path: `${tenant}/accounting/beleg_1.pdf`,
    })
    expect(inferReceiptLocation(`accounting/${tenant}/beleg_1.pdf`)).toEqual({
      bucket: 'user-documents',
      path: `accounting/${tenant}/beleg_1.pdf`,
    })
  })

  it('allows only the owning tenant to access a receipt path', () => {
    expect(tenantOwnsReceiptPath(tenant, ownStaffPath)).toBe(true)
    expect(tenantOwnsReceiptPath(other, ownStaffPath)).toBe(false)
    expect(tenantOwnsReceiptPath(tenant, `accounting/${other}/x.pdf`)).toBe(false)
  })

  it('rejects traversal and encoded traversal in normalizeReceiptPath', () => {
    expect(normalizeReceiptPath(`${tenant}/accounting/staff/../secret.jpg`)).toBeNull()
    expect(normalizeReceiptPath(`${tenant}/accounting/staff/%2e%2e/secret.jpg`)).toBeNull()
    expect(normalizeReceiptPath('//evil.example/file')).toBeNull()
    expect(normalizeReceiptPath('file:///etc/passwd')).toBeNull()
    expect(normalizeReceiptPath(`${tenant}\\accounting\\staff\\x.jpg`)).toBeNull()
    expect(normalizeReceiptPath(ownStaffPath)).toBe(ownStaffPath)
  })

  it('rejects any URL-like ref for persistence and accepts a tenant storage path', () => {
    const reject = /Storage-Pfad|Ungültiger Beleg-Pfad/
    expect(() => assertPersistableReceiptRef('https://evil.example/file')).toThrow(reject)
    expect(() => assertPersistableReceiptRef('http://evil.example/file')).toThrow(reject)
    expect(() => assertPersistableReceiptRef('//evil.example/file')).toThrow(reject)
    expect(() => assertPersistableReceiptRef('/object/sign/receipts/x.jpg')).toThrow(reject)
    expect(() => assertPersistableReceiptRef('/object/public/receipts/x.jpg')).toThrow(reject)
    expect(() => assertPersistableReceiptRef(
      `https://example.supabase.co/storage/v1/object/sign/receipts/${ownStaffPath}?token=t`,
    )).toThrow(reject)
    expect(() => assertPersistableReceiptRef(
      `https://example.supabase.co/storage/v1/object/public/receipts/${ownStaffPath}`,
    )).toThrow(reject)
    expect(assertPersistableReceiptRef(ownStaffPath)).toBe(ownStaffPath)
  })

  it('keeps legacy http URLs as display hrefs and routes paths through the receipt API', () => {
    const legacy = 'https://example.supabase.co/storage/v1/object/public/receipts/old.jpg'
    expect(receiptDisplayHref(legacy)).toBe(legacy)
    expect(receiptDisplayHref(ownStaffPath)).toBe(
      `/api/accounting/receipt?path=${encodeURIComponent(ownStaffPath)}&redirect=1`,
    )
  })
})

describe('owned receipt resolution (export / OCR)', () => {
  it('accepts an owned storage path and a matching own-tenant Supabase object URL', () => {
    expect(resolveOwnedReceiptLocation(tenant, ownStaffPath)).toEqual({
      bucket: 'receipts',
      path: ownStaffPath,
    })
    expect(extractReceiptStoragePath(
      `https://proj.supabase.co/storage/v1/object/public/receipts/${ownStaffPath}`,
    )).toBe(ownStaffPath)
    expect(resolveOwnedReceiptLocation(
      tenant,
      `https://proj.supabase.co/storage/v1/object/sign/receipts/${ownStaffPath}?token=abc`,
    )).toEqual({ bucket: 'receipts', path: ownStaffPath })
  })

  it('rejects foreign tenant paths, foreign Supabase URLs, and arbitrary hosts', () => {
    expect(resolveOwnedReceiptLocation(tenant, `${other}/accounting/staff/x.jpg`)).toBeNull()
    expect(resolveOwnedReceiptLocation(
      tenant,
      `https://proj.supabase.co/storage/v1/object/public/receipts/${other}/accounting/staff/x.jpg`,
    )).toBeNull()
    expect(resolveOwnedReceiptLocation(tenant, 'https://evil.example/file')).toBeNull()
    expect(resolveOwnedReceiptLocation(tenant, 'http://127.0.0.1/secret')).toBeNull()
    expect(extractReceiptStoragePath(`${ownStaffPath}/%2e%2e/${other}/secret.jpg`)).toBeNull()
    expect(extractReceiptStoragePath(
      `https://proj.supabase.co/storage/v1/object/public/receipts/${tenant}/accounting/staff/%2e%2e/secret.jpg`,
    )).toBeNull()
  })

  it('rejects bucket/path mismatches on extracted URLs', () => {
    expect(extractReceiptStoragePath(
      `https://proj.supabase.co/storage/v1/object/public/user-documents/${ownStaffPath}`,
    )).toBeNull()
  })
})

describe('receipt upload endpoints do not persist signed or public URLs', () => {
  const root = resolve(process.cwd())

  it('staff expense upload returns a storage path', () => {
    const src = readFileSync(resolve(root, 'server/api/staff/upload-expense-receipt.post.ts'), 'utf8')
    expect(src).not.toMatch(/getPublicUrl\s*\(/)
    expect(src).not.toMatch(/createSignedUrl/)
    expect(src).toMatch(/path:\s*uploadData\.path/)
  })

  it('admin accounting upload returns a storage path', () => {
    const src = readFileSync(resolve(root, 'server/api/admin/accounting/upload-receipt.post.ts'), 'utf8')
    expect(src).not.toMatch(/getPublicUrl\s*\(/)
    expect(src).not.toMatch(/createSignedUrl/)
    expect(src).toMatch(/path:\s*uploadData\.path/)
    expect(src).toMatch(/path:\s*fallback\.path/)
  })

  it('export archive never fetches user-controlled HTTP refs', () => {
    const src = readFileSync(resolve(root, 'server/api/admin/accounting/export-archive.get.ts'), 'utf8')
    expect(src).not.toMatch(/fetch\s*\(/)
    expect(src).toMatch(/resolveOwnedReceiptLocation/)
    expect(src).toMatch(/\.download\(/)
  })

  it('parse-receipt never fetches user-controlled HTTP refs and binds tenant ownership', () => {
    const src = readFileSync(resolve(root, 'server/api/staff/parse-receipt.post.ts'), 'utf8')
    expect(src).not.toMatch(/fetch\s*\(/)
    expect(src).toMatch(/resolveOwnedReceiptLocation/)
    expect(src).toMatch(/\.download\(/)
  })
})
