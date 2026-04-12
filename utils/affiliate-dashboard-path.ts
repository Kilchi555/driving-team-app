/**
 * True when the URL path is the affiliate dashboard (any locale/prefix variant).
 */
export function pathnameIncludesAffiliateDashboard(pathname: string): boolean {
  return pathname.includes('affiliate-dashboard')
}
