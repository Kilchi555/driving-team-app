import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { profileEditSubmitBlocked } from '~/utils/profile-save-guard'

async function attemptSave(state: { isLoadingProfile: boolean; isSavingProfile: boolean }, request: () => Promise<void>) {
  if (profileEditSubmitBlocked(state)) return
  await request()
}

describe('profile edit save guard', () => {
  it('does not send an update request while the profile is loading', async () => {
    const request = vi.fn(async () => undefined)
    await attemptSave({ isLoadingProfile: true, isSavingProfile: false }, request)
    expect(request).not.toHaveBeenCalled()
  })

  it('sends the update request once loading has finished', async () => {
    const request = vi.fn(async () => undefined)
    await attemptSave({ isLoadingProfile: false, isSavingProfile: false }, request)
    expect(request).toHaveBeenCalledOnce()
  })

  it('blocks a second submit while a save is already in flight', async () => {
    const request = vi.fn(async () => undefined)
    await attemptSave({ isLoadingProfile: false, isSavingProfile: true }, request)
    expect(request).not.toHaveBeenCalled()
  })

  it('StaffSettings disables save and returns before the update request while loading', () => {
    const src = readFileSync(resolve(process.cwd(), 'components/StaffSettings.vue'), 'utf8')
    const saveStart = src.indexOf('const saveEditProfile')
    const saveEnd = src.indexOf('const showExamStatistics', saveStart)
    const saveFn = src.slice(saveStart, saveEnd)
    expect(src).toContain(':disabled="isSavingProfile || isLoadingProfile"')
    expect(saveFn.indexOf('profileEditSubmitBlocked')).toBeGreaterThan(-1)
    expect(saveFn.indexOf('profileEditSubmitBlocked')).toBeLessThan(saveFn.indexOf('/api/staff/update-profile'))
    expect(src).toContain('isLoadingProfile.value = false')
  })
})
