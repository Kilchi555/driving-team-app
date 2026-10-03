import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  displayInvitationRole,
  registrationHomePath,
  registrationStepSkipped,
  type RegistrationStepSkipInput,
} from '../staff-registration-flow'

const staffDrivingSchool: RegistrationStepSkipInput = {
  invitationRole: 'staff',
  isDrivingSchool: true,
  hasCategories: true,
}

const adminDrivingSchool: RegistrationStepSkipInput = {
  invitationRole: 'admin',
  isDrivingSchool: true,
  hasCategories: true,
}

describe('staff registration wizard stays on the existing steps', () => {
  it('shows categories, hours, locations, calendar, and license for a driving-school staff invite', () => {
    expect(registrationStepSkipped(0, staffDrivingSchool)).toBe(false)
    expect(registrationStepSkipped(1, staffDrivingSchool)).toBe(false)
    expect(registrationStepSkipped(2, staffDrivingSchool)).toBe(false)
    expect(registrationStepSkipped(3, staffDrivingSchool)).toBe(false)
    expect(registrationStepSkipped(4, staffDrivingSchool)).toBe(false)
    expect(registrationStepSkipped(5, staffDrivingSchool)).toBe(false)
    expect(registrationStepSkipped(6, staffDrivingSchool)).toBe(false)
  })

  it('still skips categories without templates and license outside driving schools', () => {
    expect(registrationStepSkipped(1, {
      invitationRole: 'staff',
      isDrivingSchool: false,
      hasCategories: false,
    })).toBe(true)
    expect(registrationStepSkipped(5, {
      invitationRole: 'staff',
      isDrivingSchool: false,
      hasCategories: false,
    })).toBe(true)
    expect(registrationStepSkipped(2, {
      invitationRole: 'staff',
      isDrivingSchool: false,
      hasCategories: false,
    })).toBe(false)
  })
})

describe('admin invitation hides staff onboarding and redirects from the server role', () => {
  it('keeps account data and password, and skips every staff step', () => {
    expect(displayInvitationRole('admin')).toBe('admin')
    expect(displayInvitationRole('staff')).toBe('staff')
    expect(displayInvitationRole('super_admin')).toBe('staff')

    for (const step of [1, 2, 3, 4, 5]) {
      expect(registrationStepSkipped(step, adminDrivingSchool)).toBe(true)
    }
    expect(registrationStepSkipped(0, adminDrivingSchool)).toBe(false)
    expect(registrationStepSkipped(6, adminDrivingSchool)).toBe(false)
  })

  it('sends only an exact server role of admin to /admin', () => {
    expect(registrationHomePath('admin')).toBe('/admin')
    expect(registrationHomePath('staff')).toBe('/dashboard')
    expect(registrationHomePath('super_admin')).toBe('/dashboard')
    expect(registrationHomePath(undefined)).toBe('/dashboard')
    expect(registrationHomePath({ role: 'admin' })).toBe('/dashboard')
  })
})

describe('register/staff.vue uses the loaded invitation for display and the response for redirect', () => {
  const src = readFileSync(resolve(process.cwd(), 'pages/register/staff.vue'), 'utf8')

  it('does not treat the query string or a client role field as the redirect authority', () => {
    expect(src).toContain('displayInvitationRole(inv.role)')
    expect(src).toContain('serverRegistrationRole.value = response.role')
    expect(src).toContain('registrationHomePath(serverRegistrationRole.value)')
    expect(src).toContain('router.push(postRegistrationPath.value)')
    expect(src).not.toContain("router.push('/dashboard')")
    expect(src).not.toContain("router.push('/admin')")
    expect(src).not.toMatch(/route\.query\.role/)
    expect(src).toContain('registrationStepSkipped(')
  })
})
