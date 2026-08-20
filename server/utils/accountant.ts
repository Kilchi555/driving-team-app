export type AccountantAccess = 'read' | 'write'

export const ACCOUNTANT_ALLOWED_PATHS = ['/admin/accounting', '/admin/payroll'] as const

export function normalizeAccountantEmail(email?: string | null): string {
  return (email ?? '').trim().toLowerCase()
}

export function isAccountantAccess(value: unknown): value is AccountantAccess {
  return value === 'read' || value === 'write'
}

export function accountantCanWrite(access?: string | null): boolean {
  return access === 'write'
}

export function isAccountantAllowedPath(path: string): boolean {
  return ACCOUNTANT_ALLOWED_PATHS.some(prefix => path === prefix || path.startsWith(`${prefix}/`))
}

export function accountantAccessLabel(access?: string | null): string {
  return access === 'write' ? 'Lesen & Schreiben' : 'Nur Lesen'
}
