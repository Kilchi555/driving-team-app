/**
 * Public customer login / account activation is allowed when the tenant
 * offers at least one of: password on /register, onboarding SMS, onboarding email.
 * All three off (Gemperli-style) means no public activation links or SMS.
 */
export function allowsCustomerAccountActivation(
  policy: Record<string, any> | null | undefined
): boolean {
  const p = policy || {}
  const accountMode = p.registration_account_mode === 'hidden' ? 'hidden' : 'required'
  const smsOn = p.onboarding_sms_enabled !== false
  const emailOn = p.onboarding_email_enabled === true
  return accountMode === 'required' || smsOn || emailOn
}
