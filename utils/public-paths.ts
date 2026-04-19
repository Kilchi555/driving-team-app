/**
 * Returns true for public pages that do not require authentication.
 * Auth plugins skip expensive API calls (e.g. /api/auth/current-user) on these paths.
 */
export function isPublicOnlyPath(pathname: string): boolean {
  return (
    pathname.startsWith('/booking/') ||
    pathname.startsWith('/customer/courses/') ||
    pathname.startsWith('/courses/') ||
    pathname.startsWith('/shop')
  )
}
