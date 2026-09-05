export const RECEIPTS_BUCKET = 'receipts'
export const RECEIPT_SIGNED_TTL_SECONDS = 3600

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const SCHEME_RE = /^[a-zA-Z][a-zA-Z0-9+.-]*:/
const ALLOWED_RECEIPT_BUCKETS = new Set(['receipts', 'tenant-documents', 'user-documents'])
const STORAGE_OBJECT_RE = /\/(?:storage\/v1\/)?object\/(?:(?:public|sign|authenticated)\/)?([^/]+)\/(.+)$/i

export type ReceiptLocation = {
  bucket: 'receipts' | 'tenant-documents' | 'user-documents'
  path: string
}

export function isHttpReceiptUrl(value: string): boolean {
  return value.startsWith('http://') || value.startsWith('https://')
}

export function isSignedObjectUrl(value: string): boolean {
  return value.includes('/object/sign/')
}

export function isPublicObjectUrl(value: string): boolean {
  return value.includes('/object/public/')
}

function looksLikeAbsoluteOrSchemeRef(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed) return false
  if (SCHEME_RE.test(trimmed)) return true
  if (trimmed.startsWith('//')) return true
  return false
}

function decodeOnce(value: string): string | null {
  try {
    return decodeURIComponent(value)
  } catch {
    return null
  }
}

function isUnsafeDecodedPath(value: string): boolean {
  if (!value) return true
  if (value.includes('\0') || value.includes('\\')) return true
  if (value.includes('..')) return true
  if (looksLikeAbsoluteOrSchemeRef(value)) return true
  return false
}

export function normalizeReceiptPath(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== 'string') return null
  const trimmed = raw.trim()
  if (!trimmed || isUnsafeDecodedPath(trimmed)) return null

  const decoded = decodeOnce(trimmed)
  if (decoded == null || isUnsafeDecodedPath(decoded)) return null

  const path = decoded.replace(/^\/+/, '').replace(/\/+/g, '/')
  if (!path || path.includes('..') || looksLikeAbsoluteOrSchemeRef(path)) return null
  return path
}

export function inferReceiptLocation(path: string): ReceiptLocation | null {
  if (path.includes('/accounting/staff/')) {
    return { bucket: 'receipts', path }
  }
  if (path.startsWith('accounting/')) {
    return { bucket: 'user-documents', path }
  }
  if (path.includes('/accounting/')) {
    return { bucket: 'tenant-documents', path }
  }
  return null
}

export function tenantOwnsReceiptPath(tenantId: string, path: string): boolean {
  if (!tenantId || !UUID_RE.test(tenantId)) return false
  return path.startsWith(`${tenantId}/`) || path.startsWith(`accounting/${tenantId}/`)
}

export function receiptDisplayHref(value: string | null | undefined): string {
  if (!value) return ''
  const trimmed = value.trim()
  if (isHttpReceiptUrl(trimmed)) return trimmed
  const path = normalizeReceiptPath(trimmed)
  if (!path) return ''
  return `/api/accounting/receipt?path=${encodeURIComponent(path)}&redirect=1`
}

/**
 * Extract a storage object path from a plain path or a Supabase object URL.
 * Never fetches the URL. Returns null unless bucket + path are a known receipt shape.
 */
export function extractReceiptStoragePath(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== 'string') return null
  const trimmed = raw.trim()
  if (!trimmed) return null

  const asPath = normalizeReceiptPath(trimmed)
  if (asPath && inferReceiptLocation(asPath)) return asPath

  if (!looksLikeAbsoluteOrSchemeRef(trimmed)) return null

  let url: URL
  try {
    url = trimmed.startsWith('//') ? new URL(`https:${trimmed}`) : new URL(trimmed)
  } catch {
    return null
  }
  if (!['http:', 'https:'].includes(url.protocol)) return null

  const pathname = decodeOnce(url.pathname)
  if (!pathname || isUnsafeDecodedPath(pathname)) return null

  const match = pathname.match(STORAGE_OBJECT_RE)
  if (!match) return null
  const bucket = match[1]
  const objectPath = normalizeReceiptPath(match[2])
  if (!objectPath || !ALLOWED_RECEIPT_BUCKETS.has(bucket)) return null
  const location = inferReceiptLocation(objectPath)
  if (!location || location.bucket !== bucket) return null
  return objectPath
}

export function resolveOwnedReceiptLocation(
  tenantId: string,
  raw: string | null | undefined,
): ReceiptLocation | null {
  const path = extractReceiptStoragePath(raw)
  if (!path || !tenantOwnsReceiptPath(tenantId, path)) return null
  return inferReceiptLocation(path)
}

export function assertPersistableReceiptRef(value: unknown): string | null {
  if (value == null || value === '') return null
  if (typeof value !== 'string') {
    throw new Error('Ungültiger Beleg-Pfad')
  }
  const trimmed = value.trim()
  if (
    looksLikeAbsoluteOrSchemeRef(trimmed)
    || isSignedObjectUrl(trimmed)
    || isPublicObjectUrl(trimmed)
  ) {
    throw new Error('Beleg darf nur als Storage-Pfad gespeichert werden')
  }
  const path = normalizeReceiptPath(trimmed)
  if (!path || !inferReceiptLocation(path)) {
    throw new Error('Ungültiger Beleg-Pfad')
  }
  return path
}
