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

  // Separate, explicit opt-in for showing the "Mit Passkey anmelden" button on
  // the login page. Decoupled from PASSKEY_ENABLED_ROLES so admins can register
  // passkeys in their profile (feature enabled) WITHOUT the login button being
  // visible to everyone yet. Default OFF — flip to 'true' once ready to expose it.
  const loginEnabled = (process.env.PASSKEY_LOGIN_ENABLED || 'false').trim().toLowerCase() === 'true'

  return {
    enabledRoles,
    requiredRoles,
    // Convenience flag: passkeys are enabled for at least one role (controls
    // whether the in-app management UI is offered).
    anyEnabled: enabledRoles.length > 0,
    // Whether the login page should offer the passkey button at all.
    loginEnabled
  }
})
