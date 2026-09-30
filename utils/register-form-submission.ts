export const REGISTER_FORM_STORAGE_KEY = 'register_form_data'
export const REGISTER_SUBMISSION_STORAGE_KEY = 'register_submission_id'
export const REGISTER_SUBMISSION_COMPLETED_KEY = 'register_submission_completed'

const SUBMISSION_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export type KeyValueStore = {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
}

export function isSubmissionId(value: unknown): value is string {
  return typeof value === 'string' && SUBMISSION_ID_RE.test(value.trim())
}

export function createSubmissionId(): string {
  const cryptoObj = globalThis.crypto
  if (typeof cryptoObj?.randomUUID === 'function') return cryptoObj.randomUUID()
  const bytes = new Uint8Array(16)
  if (!cryptoObj?.getRandomValues) {
    throw new Error('crypto.randomUUID is not available')
  }
  cryptoObj.getRandomValues(bytes)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

/** Reuse the id already stored for this submission. Create one only when missing. */
export function reuseOrCreateSubmissionId(
  existing: string | null | undefined,
  createId: () => string = createSubmissionId,
): string {
  if (isSubmissionId(existing)) return existing.trim().toLowerCase()
  const created = createId()
  if (!isSubmissionId(created)) throw new Error('Invalid submission id')
  return created.trim().toLowerCase()
}

export function rememberSubmissionId(
  sessionStore: KeyValueStore,
  createId: () => string = createSubmissionId,
): string {
  const id = reuseOrCreateSubmissionId(sessionStore.getItem(REGISTER_SUBMISSION_STORAGE_KEY), createId)
  sessionStore.setItem(REGISTER_SUBMISSION_STORAGE_KEY, id)
  return id
}

export function shouldRestoreRegisterForm(completedMarker: string | null | undefined): boolean {
  return !completedMarker
}

/**
 * After success the cached form must not be ready to send again.
 * The submission id is dropped so the next real visit gets a new one.
 */
export function finishRegisterSubmission(sessionStore: KeyValueStore, localStore: KeyValueStore): void {
  sessionStore.setItem(REGISTER_SUBMISSION_COMPLETED_KEY, '1')
  sessionStore.removeItem(REGISTER_SUBMISSION_STORAGE_KEY)
  localStore.removeItem(REGISTER_FORM_STORAGE_KEY)
}

/**
 * A reload after success consumes the completed marker and refuses to restore
 * the previous form. Returns true when restoration must be skipped.
 */
export function consumeCompletedRegisterSubmission(
  sessionStore: KeyValueStore,
  localStore: KeyValueStore,
): boolean {
  if (shouldRestoreRegisterForm(sessionStore.getItem(REGISTER_SUBMISSION_COMPLETED_KEY))) {
    return false
  }
  localStore.removeItem(REGISTER_FORM_STORAGE_KEY)
  sessionStore.removeItem(REGISTER_SUBMISSION_STORAGE_KEY)
  sessionStore.removeItem(REGISTER_SUBMISSION_COMPLETED_KEY)
  return true
}
