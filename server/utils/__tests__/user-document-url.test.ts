import { describe, expect, it } from 'vitest'
import {
  normalizeUserDocumentPath,
  ownerIdFromDocumentPath,
  pathBelongsToUser,
} from '../user-document-url'

const userA = '11111111-1111-4111-8111-111111111111'
const userB = '22222222-2222-4222-8222-222222222222'

describe('user document path controls', () => {
  it('rejects path traversal and foreign public URLs', () => {
    expect(normalizeUserDocumentPath('../secret.pdf')).toBeNull()
    expect(normalizeUserDocumentPath(`${userA}/../../${userB}/x.pdf`)).toBeNull()
    expect(normalizeUserDocumentPath('https://evil.example/file.pdf')).toBeNull()
  })

  it('denies a customer forging another user folder or traversal', () => {
    const pathB = `${userB}/secret.pdf`
    expect(pathBelongsToUser(pathB, userA)).toBe(false)
    expect(normalizeUserDocumentPath(`${userA}/../${userB}/x.pdf`)).toBeNull()
  })

  it('extracts owner from conventional paths and ignores a mismatched requested id only when path does not contain them', () => {
    expect(ownerIdFromDocumentPath(`${userA}/LIC-1.jpg`)).toBe(userA)
    expect(pathBelongsToUser(`${userA}/LIC-1.jpg`, userB)).toBe(false)
    expect(pathBelongsToUser(`medical-certificates/tenant/${userA}/cert.pdf`, userA)).toBe(true)
  })

  it('rewrites a legacy public user-documents URL into a storage path', () => {
    const publicUrl = `https://unyjaetebnaexaflpyoc.supabase.co/storage/v1/object/public/user-documents/${userA}/LIC-1.jpg`
    expect(normalizeUserDocumentPath(publicUrl)).toBe(`${userA}/LIC-1.jpg`)
    expect(normalizeUserDocumentPath(`https://evil.example/storage/v1/object/public/receipts/${userA}/x.pdf`)).toBeNull()
  })
})
