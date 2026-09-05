/**
 * Upload a generated PDF to the private `receipts` bucket and return a signed HTTPS URL.
 * Native Capacitor apps can only open PDFs via Browser.open() with http(s) URLs —
 * data:/blob: URLs do not work in SFSafariViewController / Chrome Custom Tabs.
 */
import { createError } from 'h3'
import { logger } from '~/utils/logger'

const GERMAN_TRANSLIT: Record<string, string> = {
  ä: 'ae',
  ö: 'oe',
  ü: 'ue',
  Ä: 'Ae',
  Ö: 'Oe',
  Ü: 'Ue',
  ß: 'ss',
}

// Mirrors supabase/storage `isValidKey` (ASCII / S3-safe object keys only).
const SUPABASE_KEY_RE = /^[\w/!.\- *'()&$@=;:+,?]*$/

export function isValidStorageKey(key: string): boolean {
  return key.length > 0 && key.length <= 1024 && SUPABASE_KEY_RE.test(key)
}

function toAsciiSegment(value: string): string {
  return String(value || '')
    .replace(/[äöüÄÖÜß]/g, (ch) => GERMAN_TRANSLIT[ch] ?? '_')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w.-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^[._-]+|[._-]+$/g, '')
}

/**
 * Supabase Storage rejects non-ASCII object keys (`InvalidKey`).
 * Course names like "Zürich-Altstetten" used to keep the umlaut and fail on upload.
 */
export function sanitizeStorageFilename(filename: string): string {
  const raw = String(filename || '').trim()
  const lastDot = raw.lastIndexOf('.')
  const hasExt = lastDot > 0 && lastDot < raw.length - 1
  const ext = hasExt ? raw.slice(lastDot + 1) : ''
  const base = hasExt ? raw.slice(0, lastDot) : raw

  const safeBase = toAsciiSegment(base) || 'file'
  const safeExt = (toAsciiSegment(ext).replace(/_/g, '') || 'bin')
  return `${safeBase}.${safeExt}`
}

export function buildPdfStoragePath(
  folder: string,
  filename: string,
  uniqueToken: string,
  now = new Date(),
): { filepath: string; filename: string } {
  const safeName = sanitizeStorageFilename(filename)
  const safeFolder = toAsciiSegment(folder) || 'files'
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  // Never put user-facing names in the object key. Course titles like
  // "Zürich-Altstetten" used to fail Supabase `isValidKey` even after
  // light sanitizing. The download name stays human-readable separately.
  const filepath = `${safeFolder}/${year}/${month}/${uniqueToken}.pdf`
  return { filepath, filename: safeName }
}

export async function uploadPdfAndGetPublicUrl(
  supabase: { storage: any },
  opts: { folder: string; filename: string; pdfBuffer: Buffer }
): Promise<{ pdfUrl: string; filename: string }> {
  // ✅ SECURITY: filenames derived from user-facing data (invoice numbers, student names,
  // dates, ...) can collide across different requests/customers/tenants. Since uploads use
  // upsert: true, a collision silently overwrites the other document at the same public URL,
  // letting one customer end up downloading someone else's PDF. A random, unguessable token
  // guarantees every upload gets its own path, regardless of what filename was requested.
  const uniqueToken = crypto.randomUUID()
  const { filepath, filename: safeName } = buildPdfStoragePath(
    opts.folder,
    opts.filename,
    uniqueToken,
  )

  const { error: uploadError } = await supabase.storage
    .from('receipts')
    .upload(filepath, opts.pdfBuffer, { contentType: 'application/pdf', upsert: true })

  if (uploadError) {
    logger.error('PDF upload failed:', uploadError.message)
    throw createError({
      statusCode: 500,
      statusMessage: 'PDF konnte nicht gespeichert werden',
    })
  }

  const { data: signed, error: signError } = await supabase.storage
    .from('receipts')
    .createSignedUrl(filepath, 60 * 60 * 24 * 30)
  const pdfUrl = signed?.signedUrl
  if (signError || !pdfUrl) {
    throw createError({ statusCode: 500, statusMessage: 'PDF konnte nicht gespeichert werden' })
  }

  return { pdfUrl, filename: safeName }
}
