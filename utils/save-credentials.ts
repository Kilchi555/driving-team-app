/**
 * Cross-platform credential saving (iOS Safari, Chrome/Android, Edge).
 *
 * Strategy (all best-effort, never throws):
 *  1. Credential Management API (Chrome / Android / Edge) via PasswordCredential
 *  2. Hidden iframe + native form POST (helps some WebViews / older Safari)
 *
 * For iOS Safari the most reliable path is still a VISIBLE success-screen form
 * with username + password and a real type="submit" (no @submit.prevent) that
 * POSTs to `/api/auth/credential-save-ack`. Call this helper additionally.
 */

export type SaveCredentialsMode = 'new-password' | 'current-password'

export async function saveCredentials(
  username: string,
  password: string,
  displayName?: string,
  mode: SaveCredentialsMode = 'new-password'
): Promise<void> {
  if (typeof window === 'undefined' || !username || !password) return

  await Promise.allSettled([
    storeViaCredentialApi(username, password, displayName),
    storeViaIframeForm(username, password, mode),
  ])
}

async function storeViaCredentialApi(
  username: string,
  password: string,
  displayName?: string
): Promise<void> {
  if (!('credentials' in navigator)) return
  if (typeof (window as any).PasswordCredential === 'undefined') return

  const cred = new (window as any).PasswordCredential({
    id: username,
    password,
    name: displayName || username,
  })
  await navigator.credentials.store(cred)
}

/**
 * Native form POST into a hidden iframe. Does not navigate the top window.
 * Safari sometimes ignores iframe targets for password save — success-screen
 * form remains the primary iOS path — but this helps Chrome/WebViews.
 */
function storeViaIframeForm(
  username: string,
  password: string,
  mode: SaveCredentialsMode
): Promise<void> {
  return new Promise((resolve) => {
    try {
      const frameName = `cred-save-${Date.now()}`
      const iframe = document.createElement('iframe')
      iframe.name = frameName
      iframe.setAttribute('aria-hidden', 'true')
      iframe.style.cssText =
        'position:fixed;width:1px;height:1px;left:-9999px;top:0;opacity:0;border:0;pointer-events:none'

      const form = document.createElement('form')
      form.method = 'POST'
      form.action = '/api/auth/credential-save-ack'
      form.target = frameName
      form.autocomplete = 'on'
      form.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0.01'

      const userInput = document.createElement('input')
      userInput.type = 'email'
      userInput.name = 'username'
      userInput.autocomplete = 'username'
      userInput.value = username

      const passInput = document.createElement('input')
      passInput.type = 'password'
      passInput.name = 'password'
      passInput.autocomplete = mode
      passInput.value = password

      const redirectInput = document.createElement('input')
      redirectInput.type = 'hidden'
      redirectInput.name = 'redirect'
      redirectInput.value = '/dashboard'

      form.append(userInput, passInput, redirectInput)
      document.body.append(iframe, form)

      // Give the browser a tick to register the fields, then submit
      requestAnimationFrame(() => {
        try {
          form.submit()
        } catch {
          /* ignore */
        }
        window.setTimeout(() => {
          form.remove()
          iframe.remove()
          resolve()
        }, 1500)
      })
    } catch {
      resolve()
    }
  })
}

/** Relative redirect only — blocks open redirects. */
export function safeCredentialRedirect(raw: unknown, fallback = '/dashboard'): string {
  if (typeof raw !== 'string') return fallback
  const value = raw.trim()
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return fallback
  if (value.includes('://')) return fallback
  return value
}
