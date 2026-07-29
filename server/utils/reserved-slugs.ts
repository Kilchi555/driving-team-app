/**
 * Slugs that conflict with app routes / platform branding and must not be
 * used as tenant URL identifiers.
 */
export const RESERVED_SLUGS = new Set([
  'admin', 'api', 'login', 'logout', 'register', 'booking',
  'tenant-register', 'onboarding', 'billing', 'dashboard',
  'reset-password', 'password-reset', 'set-password',
  'staff', 'customers', 'calendar', 'settings', 'profile',
  'help', 'support', 'terms', 'privacy', 'agb', 'datenschutz',
  'static', 'assets', 'public', 'simy', 'app', 'www', 'mail',
  // Common spam / placeholder slugs
  'test', 'demo', 'example', 'sample', 'asdf', 'null', 'undefined',
])

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(String(slug || '').toLowerCase().trim())
}
