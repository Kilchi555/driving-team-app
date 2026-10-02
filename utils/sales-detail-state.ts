export type SalesDetailLoadState = 'loading' | 'ready' | 'not_found' | 'unauthorized' | 'error'

export function salesDetailLoadFailure(status: number | undefined): Exclude<SalesDetailLoadState, 'loading' | 'ready'> {
  if (status === 404) return 'not_found'
  if (status === 401 || status === 403) return 'unauthorized'
  return 'error'
}

export function salesDetailFailureMessage(state: Exclude<SalesDetailLoadState, 'loading' | 'ready'>): string {
  if (state === 'not_found') return 'Prospect nicht gefunden.'
  if (state === 'unauthorized') return 'Kein Zugriff auf diesen Prospect.'
  return 'Die Prospect-Daten konnten nicht geladen werden.'
}
