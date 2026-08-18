/** Admin routes a website_only tenant may open. Everything else redirects. */
export const WEBSITE_ONLY_ADMIN_PREFIXES = [
  '/admin/website',
  '/admin/website-analytics',
  '/admin/categories',
  '/admin/billing',
  '/admin/profile',
] as const

export function isWebsiteOnlyTenant(
  info: { website_only?: boolean | null } | null | undefined,
): boolean {
  return !!info?.website_only
}

export function isWebsiteOnlyAllowedAdminPath(path: string): boolean {
  const p = path.split('?')[0] || path
  return WEBSITE_ONLY_ADMIN_PREFIXES.some((prefix) => p === prefix || p.startsWith(`${prefix}/`))
}

export function adminHomePath(websiteOnly?: boolean | null): string {
  return websiteOnly ? '/admin/website' : '/admin'
}

/** Merge the flag into trial info so middleware can run before trial-status returns. */
export function withWebsiteOnlyFlag<T extends { website_only?: boolean | null }>(
  current: T | null | undefined,
  websiteOnly: boolean | null | undefined,
): T | { is_trial: boolean; trial_ends_at: null; subscription_plan: null; current_period_end: null; website_only: true } | null {
  if (!websiteOnly) return current ?? null
  if (current) return { ...current, website_only: true }
  return {
    is_trial: false,
    trial_ends_at: null,
    subscription_plan: null,
    current_period_end: null,
    website_only: true,
  }
}
