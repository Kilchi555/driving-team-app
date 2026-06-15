/**
 * Returns the app base URL, trimmed of any accidental whitespace or newlines.
 * NUXT_PUBLIC_APP_URL can contain a trailing \n depending on how env vars are set.
 */
export function getAppUrl(): string {
  return (process.env.NUXT_PUBLIC_APP_URL || 'https://app.simy.ch').trim()
}
