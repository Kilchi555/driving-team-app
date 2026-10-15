/**
 * UI helpers for the dedicated active/inactive action.
 * The displayed flag changes only when the server confirms a boolean is_active.
 */

export function confirmedActiveFlag(response: unknown): boolean | null {
  if (!response || typeof response !== 'object') return null
  const body = response as { success?: unknown; data?: { is_active?: unknown } }
  if (body.success !== true) return null
  if (typeof body.data?.is_active !== 'boolean') return null
  return body.data.is_active
}

export function userFacingStatusMessage(err: unknown, fallback: string): string {
  if (!err || typeof err !== 'object') return fallback
  const error = err as {
    statusCode?: unknown
    statusMessage?: unknown
    data?: { statusCode?: unknown; statusMessage?: unknown }
  }
  const status = error.data?.statusCode ?? error.statusCode
  const message = error.data?.statusMessage ?? error.statusMessage
  if (
    typeof status === 'number' &&
    status >= 400 &&
    status < 500 &&
    typeof message === 'string' &&
    message.trim().length > 0 &&
    !/pgrst|stack|select |update /i.test(message)
  ) {
    return message
  }
  return fallback
}
