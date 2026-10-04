/**
 * Staff and admin invitations share this token format.
 * invite.post.ts and resend-invite.post.ts both used this generator.
 */
export function generateInvitationToken(): string {
  const array = new Uint8Array(24)
  crypto.getRandomValues(array)
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}
