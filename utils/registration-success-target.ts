/**
 * Public registration success action.
 *
 * Hidden-account tenants may leave for their own website. The URL must be the
 * website_url already loaded for the route slug, and only an absolute http(s)
 * URL without userinfo. Every other hidden case stays on `/`.
 * Account mode `required` (and any unknown mode) keeps the existing login target.
 */

export type RegistrationSuccessAction = {
  label: string
  href: string
  external: boolean
}

export function parseSafePublicWebsiteUrl(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim()
  if (!trimmed) return null

  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    return null
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
  if (url.username || url.password) return null
  return url.href
}

export function resolveRegistrationSuccessAction(input: {
  accountMode: unknown
  routeSlug?: string | null
  loadedTenantSlug?: string | null
  websiteUrl?: unknown
  registeredSlug?: string | null
}): RegistrationSuccessAction {
  if (input.accountMode === 'hidden') {
    const routeSlug = input.routeSlug
    const slugMatches = typeof routeSlug === 'string'
      && routeSlug.length > 0
      && input.loadedTenantSlug === routeSlug
    const website = slugMatches ? parseSafePublicWebsiteUrl(input.websiteUrl) : null
    if (website) {
      return { label: 'Zurück zur Website', href: website, external: true }
    }
    return { label: 'Zurück zur Startseite', href: '/', external: false }
  }

  const slug = input.registeredSlug || input.routeSlug
  return {
    label: 'Zum Login',
    href: slug ? `/${slug}` : '/login',
    external: false,
  }
}
