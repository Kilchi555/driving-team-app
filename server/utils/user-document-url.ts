import type { SupabaseClient } from '@supabase/supabase-js'

export const USER_DOCUMENTS_BUCKET = 'user-documents'
export const USER_DOCUMENT_SIGNED_TTL_SECONDS = 3600

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function normalizeUserDocumentPath(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== 'string') return null
  let path = raw.trim()
  if (path.startsWith('http://') || path.startsWith('https://')) {
    const marker = '/object/public/user-documents/'
    const idx = path.indexOf(marker)
    if (idx === -1) return null
    path = decodeURIComponent(path.slice(idx + marker.length).split('?')[0] || '')
  }
  path = path.replace(/^\/+/, '').replace(/\/+/g, '/')
  if (!path || path.includes('..')) return null
  return path
}

export function ownerIdFromDocumentPath(
  path: string,
  requestedUserId?: string | null
): string | null {
  if (requestedUserId && UUID_RE.test(requestedUserId)) return requestedUserId
  const segments = path.split('/').filter(Boolean)
  if (segments[0] && UUID_RE.test(segments[0])) return segments[0]
  if (segments[0] === 'medical-certificates' && segments[2] && UUID_RE.test(segments[2])) {
    return segments[2]
  }
  if (segments[0] === 'user-documents' && segments[2] && UUID_RE.test(segments[2])) {
    return segments[2]
  }
  if (segments[0] === 'customer-licenses' && segments[1] && UUID_RE.test(segments[1])) {
    return segments[1]
  }
  return null
}

export function pathBelongsToUser(path: string, userId: string): boolean {
  return path.split('/').includes(userId)
}

export async function createUserDocumentSignedUrl(
  supabase: SupabaseClient,
  path: string,
  expiresIn = USER_DOCUMENT_SIGNED_TTL_SECONDS
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(USER_DOCUMENTS_BUCKET)
    .createSignedUrl(path, expiresIn)
  if (error || !data?.signedUrl) return null
  return data.signedUrl
}
