import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { confirmedActiveFlag, userFacingStatusMessage } from '../user-status-feedback'

const detailsPath = resolve(process.cwd(), 'components/admin/UserDetails.vue')

describe('confirmed active flag', () => {
  it('returns the server flag only after a successful status response', () => {
    expect(confirmedActiveFlag({ success: true, data: { is_active: false } })).toBe(false)
    expect(confirmedActiveFlag({ success: true, data: { is_active: true } })).toBe(true)
  })

  it('does not yield a flag when the server rejects the request', () => {
    expect(confirmedActiveFlag({ success: false, data: { is_active: false } })).toBeNull()
    expect(confirmedActiveFlag(null)).toBeNull()
    expect(confirmedActiveFlag({ success: true, data: {} })).toBeNull()
    expect(confirmedActiveFlag({ success: true })).toBeNull()
  })
})

describe('user-facing status errors', () => {
  it('shows a client error and hides database failures', () => {
    expect(userFacingStatusMessage(
      { statusCode: 403, statusMessage: 'Forbidden: Tenant mismatch' },
      'Fehler',
    )).toBe('Forbidden: Tenant mismatch')
    expect(userFacingStatusMessage(
      { data: { statusCode: 500, statusMessage: 'JSON object requested, multiple (or no) rows returned' } },
      'Fehler beim deaktivieren des Benutzers',
    )).toBe('Fehler beim deaktivieren des Benutzers')
    expect(userFacingStatusMessage(
      { statusCode: 400, statusMessage: 'PGRST116 The result contains 0 rows' },
      'Fehler',
    )).toBe('Fehler')
  })
})

describe('UserDetails status wiring', () => {
  const source = readFileSync(detailsPath, 'utf8')
  const toggle = source.slice(source.indexOf('const toggleUserStatus'), source.indexOf('const handleDeleteUser'))
  const save = source.slice(source.indexOf('const saveChanges'), source.indexOf('const closeEditModal'))

  it('updates the displayed status only from a confirmed server flag', () => {
    expect(toggle).toContain("action: 'set-user-active'")
    expect(toggle).not.toContain('update-user')
    expect(toggle).not.toContain('user_data: { is_active')
    const confirmed = toggle.indexOf('confirmedActiveFlag(response)')
    const assign = toggle.indexOf('userDetails.value.is_active = confirmed')
    expect(confirmed).toBeGreaterThan(-1)
    expect(assign).toBeGreaterThan(confirmed)
    expect(toggle.indexOf('catch')).toBeGreaterThan(assign)
  })

  it('does not report a profile save when the server rejects it', () => {
    expect(save).not.toMatch(/is_active\s*:/)
    expect(save).not.toMatch(/\brole\s*:/)
    expect(save.indexOf('if (!response?.success)')).toBeLessThan(
      save.indexOf("successMessage.value = 'Benutzer erfolgreich aktualisiert!'"),
    )
    expect(save).toContain('successMessage.value = null')
    expect(source).not.toContain('id="modalIsActive"')
    expect(source).not.toContain('id="modalRole"')
    expect(source).toContain('werden in diesem Formular nicht gespeichert')
  })
})
