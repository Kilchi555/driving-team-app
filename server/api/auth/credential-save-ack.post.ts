/**
 * No-op endpoint used as the target of a native HTML form POST so mobile
 * password managers (especially iOS Safari) can detect username+password and
 * offer to save them. We ignore credentials here — the user is already logged
 * in via cookies/session — and only redirect to a safe relative path.
 */
import { defineEventHandler, readBody, sendRedirect, getQuery } from 'h3'
import { safeCredentialRedirect } from '~/utils/save-credentials'

export default defineEventHandler(async (event) => {
  const body = await readBody(event).catch(() => ({} as any))
  const query = getQuery(event)
  const redirect = safeCredentialRedirect(
    body?.redirect ?? query.redirect,
    '/dashboard'
  )
  return sendRedirect(event, redirect, 303)
})
