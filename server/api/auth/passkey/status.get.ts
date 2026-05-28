/**
 * GET /api/auth/passkey/status
 *
 * Lightweight, unauthenticated endpoint that tells the client which passkey
 * features are enabled for which roles. Used by the login page to decide
 * whether to show the "Mit Passkey anmelden" button at all.
 *
 * Returns NO user-specific data — never reveals account existence.
 */

import { defineEventHandler } from 'h3'

export default defineEventHandler(() => {
  const enabledRoles = (process.env.PASSKEY_ENABLED_ROLES || 'admin')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)

  const requiredRoles = (process.env.PASSKEY_REQUIRED_ROLES || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)

  return {
    enabledRoles,
    requiredRoles,
    // Convenience flag: if anyone may use passkeys, the login page can offer it
    anyEnabled: enabledRoles.length > 0
  }
})
