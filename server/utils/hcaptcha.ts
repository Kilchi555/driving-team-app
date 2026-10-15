/**
 * Shared hCaptcha verification helper.
 * When HCAPTCHA_SECRET_KEY is unset, verifyHCaptcha returns { ok: false, reason: 'not_configured' }
 * unless requireConfigured is false (then { ok: true, skipped: true }).
 */

export type HCaptchaResult =
  | { ok: true; skipped?: boolean }
  | { ok: false; reason: 'not_configured' | 'missing_token' | 'invalid' | 'provider_error' }

export async function verifyHCaptcha(
  token: string | undefined | null,
  opts?: { requireConfigured?: boolean; remoteip?: string }
): Promise<HCaptchaResult> {
  const secret = process.env.HCAPTCHA_SECRET_KEY
  const requireConfigured = opts?.requireConfigured ?? false

  if (!secret) {
    if (requireConfigured) return { ok: false, reason: 'not_configured' }
    return { ok: true, skipped: true }
  }

  if (!token || typeof token !== 'string' || token.trim().length < 10) {
    return { ok: false, reason: 'missing_token' }
  }

  try {
    const body = new URLSearchParams()
    body.set('secret', secret)
    body.set('response', token.trim())
    if (opts?.remoteip) body.set('remoteip', opts.remoteip)

    const captchaResponse = await fetch('https://hcaptcha.com/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    })

    if (!captchaResponse.ok) {
      return { ok: false, reason: 'provider_error' }
    }

    const captchaData = (await captchaResponse.json()) as { success?: boolean }
    if (!captchaData.success) {
      return { ok: false, reason: 'invalid' }
    }
    return { ok: true }
  } catch {
    return { ok: false, reason: 'provider_error' }
  }
}

/**
 * Tenant register captcha is opt-in via TENANT_REGISTER_REQUIRE_HCAPTCHA=1
 * so existing HCAPTCHA_SECRET_KEY used by login does not block signup
 * until the tenant-register widget is wired and rolled out.
 */
export function tenantRegisterRequiresHcaptcha(): boolean {
  return process.env.TENANT_REGISTER_REQUIRE_HCAPTCHA === '1'
}
