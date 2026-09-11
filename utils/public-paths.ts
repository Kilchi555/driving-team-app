/**
 * Top-level app routes that must never be treated as a tenant-login slug.
 * Keep in sync with pages/[slug].vue reservedRoutes plus real pages/*.vue.
 */
const RESERVED_TOP_SEGMENTS = new Set([
  'admin',
  'dashboard',
  'customer-dashboard',
  'customers',
  'customer',
  'staff',
  'login',
  'register',
  'register-staff',
  'reset-password',
  'password-reset',
  'tenant-register',
  'tenant-start',
  'tenant-demo',
  'tenant-test',
  'tenant-debug',
  'tenant-admin',
  'upgrade',
  'shop',
  'booking',
  'payment',
  'courses',
  'learning',
  'users',
  'partner',
  'partners',
  'affiliate-dashboard',
  'help',
  'newsletter',
  'marketing',
  'auswahl',
  'anonymous-sale',
  'helvetia-offerte',
  'confirm-sessions',
  'unsubscribe',
  'pause',
  'agb',
  'avv',
  'aktion',
  's',
])

function normalizePathname(pathname: string): string {
  const path = (pathname.split('?')[0] || '/').replace(/\/+$/, '')
  return path || '/'
}

/** Public tenant slug as used in URLs (DNS-label style). */
const TENANT_SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/

const REGISTER_RESERVED_SEGMENTS = new Set([
  'staff',
  'accountant',
  'staff-datenschutz',
  'staff-agb',
])

const LOGIN_RESERVED_SEGMENTS = new Set(['set-password'])

export type PublicTenantSurface = 'app' | 'website'

export type PublicTenantRef = {
  slug: string
  surface: PublicTenantSurface
}

export function normalizePublicTenantSlug(raw: unknown): string | null {
  const value = String(Array.isArray(raw) ? raw[0] : raw || '')
    .trim()
    .toLowerCase()
  if (!value) return null
  let decoded = value
  try {
    decoded = decodeURIComponent(value)
  } catch {
    /* keep raw */
  }
  const slug = decoded.trim().toLowerCase()
  return TENANT_SLUG_RE.test(slug) ? slug : null
}

function queryTenantSlug(
  query?: Record<string, unknown> | URLSearchParams | null,
): string | null {
  if (!query) return null
  if (query instanceof URLSearchParams) return normalizePublicTenantSlug(query.get('tenant'))
  return normalizePublicTenantSlug(query.tenant)
}

/**
 * Resolve which tenant a public URL belongs to for crawlers (WhatsApp/OG).
 * Website routes (`/s/{subdomain}`) are tagged separately so page-level SEO wins.
 */
export function resolvePublicTenantRef(
  pathname: string,
  query?: Record<string, unknown> | URLSearchParams | null,
): PublicTenantRef | null {
  const path = normalizePathname(pathname)
  const parts = path.split('/').filter(Boolean)

  if (parts[0] === 's' && parts[1]) {
    const slug = normalizePublicTenantSlug(parts[1])
    return slug ? { slug, surface: 'website' } : null
  }

  const fromQuery = queryTenantSlug(query)
  if (fromQuery) return { slug: fromQuery, surface: 'app' }

  if (parts.length === 1) {
    const slug = normalizePublicTenantSlug(parts[0])
    if (slug && !RESERVED_TOP_SEGMENTS.has(slug)) return { slug, surface: 'app' }
    return null
  }

  const first = parts[0]?.toLowerCase()
  const second = parts[1] ? parts[1].toLowerCase() : ''

  if (first === 'login' && second && !LOGIN_RESERVED_SEGMENTS.has(second)) {
    const slug = normalizePublicTenantSlug(parts[1])
    return slug ? { slug, surface: 'app' } : null
  }
  if (first === 'register' && second && !REGISTER_RESERVED_SEGMENTS.has(second)) {
    const slug = normalizePublicTenantSlug(parts[1])
    return slug ? { slug, surface: 'app' } : null
  }
  if ((first === 'ref' || first === 'services' || first === 'newsletter' || first === 'partner') && parts[1]) {
    const slug = normalizePublicTenantSlug(parts[1])
    return slug ? { slug, surface: 'app' } : null
  }
  if (first === 'booking' && second === 'availability' && parts[2]) {
    const slug = normalizePublicTenantSlug(parts[2])
    return slug ? { slug, surface: 'app' } : null
  }

  return null
}

/**
 * Returns true for public pages that do not require authentication.
 * Auth plugins skip expensive API calls (e.g. /api/auth/current-user) on these paths.
 */
export function isPublicOnlyPath(pathname: string): boolean {
  return (
    pathname.startsWith('/booking/') ||
    pathname.startsWith('/pause') ||
    pathname.startsWith('/customer/courses/') ||
    pathname.startsWith('/courses/') ||
    pathname.startsWith('/shop')
  )
}

/** `/{tenant-slug}` branded login, e.g. /driving-team */
export function isTenantLoginPath(pathname: string): boolean {
  const path = normalizePathname(pathname)
  const parts = path.split('/').filter(Boolean)
  if (parts.length !== 1) return false
  return !RESERVED_TOP_SEGMENTS.has(parts[0].toLowerCase())
}

/**
 * Login / register / tenant login / public websites — never bounce these to /login.
 */
export function isPublicAuthPath(pathname: string): boolean {
  const path = normalizePathname(pathname)
  if (
    path === '/login' ||
    path === '/register' ||
    path === '/reset-password' ||
    path === '/password-reset' ||
    path === '/register-staff' ||
    path === '/tenant-register'
  ) {
    return true
  }
  if (path.startsWith('/s/')) return true
  if (isPublicOnlyPath(pathname)) return true
  return isTenantLoginPath(pathname)
}
