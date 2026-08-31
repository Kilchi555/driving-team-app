import { describe, expect, it } from 'vitest'
import {
  accountantAccessLabel,
  accountantCanWrite,
  isAccountantAccess,
  isAccountantAllowedPath,
  normalizeAccountantEmail,
} from '../accountant'

describe('accountant access helpers', () => {
  it('normalizes emails and access flags', () => {
    expect(normalizeAccountantEmail('  Treu@Kanzlei.ch ')).toBe('treu@kanzlei.ch')
    expect(isAccountantAccess('read')).toBe(true)
    expect(isAccountantAccess('write')).toBe(true)
    expect(isAccountantAccess('admin')).toBe(false)
    expect(accountantCanWrite('write')).toBe(true)
    expect(accountantCanWrite('read')).toBe(false)
    expect(accountantAccessLabel('write')).toBe('Lesen & Schreiben')
    expect(accountantAccessLabel('read')).toBe('Nur Lesen')
  })

  it('allows only accounting and payroll paths', () => {
    expect(isAccountantAllowedPath('/admin/accounting')).toBe(true)
    expect(isAccountantAllowedPath('/admin/payroll')).toBe(true)
    expect(isAccountantAllowedPath('/admin/payroll/x')).toBe(true)
    expect(isAccountantAllowedPath('/admin')).toBe(false)
    expect(isAccountantAllowedPath('/admin/users')).toBe(false)
    expect(isAccountantAllowedPath('/admin/profile')).toBe(false)
  })
})
