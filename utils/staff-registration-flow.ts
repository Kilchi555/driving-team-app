export type RegistrationRole = 'admin' | 'staff'

/**
 * Display-only role from the invitation payload returned by get-invitation.
 * This is not authorization. The server assigns the role at accept time.
 */
export function displayInvitationRole(role: unknown): RegistrationRole {
  return role === 'admin' ? 'admin' : 'staff'
}

/**
 * Post-registration route. Only the registration response role is authoritative.
 * Anything other than the exact value `admin` stays on the staff dashboard.
 */
export function registrationHomePath(serverRole: unknown): '/admin' | '/dashboard' {
  return serverRole === 'admin' ? '/admin' : '/dashboard'
}

export type RegistrationStepSkipInput = {
  invitationRole: RegistrationRole
  isDrivingSchool: boolean
  hasCategories: boolean
}

/**
 * Staff keeps the existing wizard. Admin skips staff onboarding steps.
 * Steps 0 (account data) and 6 (password) stay for both.
 */
export function registrationStepSkipped(stepId: number, input: RegistrationStepSkipInput): boolean {
  const admin = input.invitationRole === 'admin'
  switch (stepId) {
    case 0:
      return false
    case 1:
      return admin || !input.isDrivingSchool || !input.hasCategories
    case 2:
    case 3:
    case 4:
      return admin
    case 5:
      return admin || !input.isDrivingSchool
    case 6:
      return false
    default:
      return false
  }
}
