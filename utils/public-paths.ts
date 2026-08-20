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
