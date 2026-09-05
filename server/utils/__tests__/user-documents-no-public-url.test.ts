import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(process.cwd())

const uploadEndpoints = [
  'server/api/admin/upload-student-document.post.ts',
  'server/api/students/upload-document.post.ts',
  'server/api/documents/upload.post.ts',
  'server/api/customer/upload-document.post.ts',
  'server/api/customer/manage-documents.post.ts',
  'server/api/medical-certificate/upload.post.ts',
]

function read(rel: string) {
  return readFileSync(resolve(root, rel), 'utf8')
}

describe('user-documents upload endpoints do not emit public URLs', () => {
  it.each(uploadEndpoints)('%s does not call getPublicUrl', (rel) => {
    const src = read(rel)
    expect(src).not.toMatch(/getPublicUrl\s*\(/)
    expect(src).not.toContain('/storage/v1/object/public/user-documents')
  })

  it('medical certificate persists the storage path and links email to the admin review page', () => {
    const src = read('server/api/medical-certificate/upload.post.ts')
    expect(src).toMatch(/medical_certificate_url:\s*fileName/)
    expect(src).not.toMatch(/medical_certificate_url:\s*urlData/)
    expect(src).toContain('/admin/medical-certificate-reviews')
    expect(src).not.toMatch(/createSignedUrl|createUserDocumentSignedUrl/)
  })
})
