/** Client-safe preview query helpers. Do not log the returned token. */

export function websitePreviewQueryValue(raw: unknown): string {
  const value = Array.isArray(raw) ? raw[0] : raw
  if (value == null || value === false) return ''
  return String(value).trim()
}

export function isWebsitePreviewQuery(raw: unknown): boolean {
  return websitePreviewQueryValue(raw).length > 0
}

export function websitePreviewSearch(raw: unknown): string {
  const token = websitePreviewQueryValue(raw)
  return token ? `?preview=${encodeURIComponent(token)}` : ''
}

export function websitePreviewFetchQuery(raw: unknown): { preview: string } | undefined {
  const token = websitePreviewQueryValue(raw)
  return token ? { preview: token } : undefined
}
