/**
 * Builds Resend `from` with a display name so clients show e.g. tenant name instead of only noreply@….
 * @see https://resend.com/docs/api-reference/emails/send-email#body-parameters
 */
export function formatResendFrom(displayName: string, emailAddress: string): string {
  const email = (emailAddress || '').trim()
  if (!email) {
    throw new Error('formatResendFrom: email address is required')
  }
  if (email.includes('<') && email.includes('>')) {
    return email
  }

  let name = (displayName || '').replace(/\r\n|\r|\n/g, ' ').trim()
  if (!name) {
    name = 'Fahrschule'
  }

  name = name.replace(/["\\<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 200)
  if (!name) {
    name = 'Fahrschule'
  }

  return `"${name}" <${email}>`
}
