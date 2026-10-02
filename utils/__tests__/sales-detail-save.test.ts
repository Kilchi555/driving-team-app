import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { initialNextAction, runSalesContactSave } from '../sales-detail-save'

describe('stored next action', () => {
  it('loads demo and proposal, preserves them, and defaults an empty prospect to call', () => {
    expect(initialNextAction('demo')).toBe('demo')
    expect(initialNextAction('proposal')).toBe('proposal')
    expect(initialNextAction(null)).toBe('call')
    expect(initialNextAction('')).toBe('call')
    expect(initialNextAction('not-a-real-action')).toBe('call')
    const loadedDemo = initialNextAction('demo')
    const loadedProposal = initialNextAction('proposal')
    expect(loadedDemo).toBe('demo')
    expect(loadedProposal).toBe('proposal')
    const savedWithoutEdit = loadedDemo
    expect(savedWithoutEdit).toBe('demo')
    const savedAfterExplicitChange = 'nurture'
    expect(savedAfterExplicitChange).toBe('nurture')
    expect(initialNextAction(savedAfterExplicitChange)).toBe('nurture')
  })

  it('wires the detail form to the stored next action and posts that value', () => {
    const source = readFileSync(new URL('../../pages/tenant-admin/sales/[id].vue', import.meta.url), 'utf8')
    expect(source).toContain('form.next_action = initialNextAction(data.profile.next_action)')
    expect(source).toContain('v-model="form.next_action"')
    expect(source).toContain('body: form')
    expect(source).toContain('additional_phones')
    expect(source).toContain('additional_emails')
  })
})

describe('sales contact save lock', () => {
  it('keeps the save button disabled until the post-save reload finishes', async () => {
    let saving = false
    let reloadStarted = false
    let releaseReload: () => void = () => {}
    const reloadGate = new Promise<void>((resolve) => {
      releaseReload = resolve
    })
    const pending = runSalesContactSave({
      onSaving: (value) => {
        saving = value
      },
      post: async () => {
        expect(saving).toBe(true)
      },
      reload: async () => {
        reloadStarted = true
        expect(saving).toBe(true)
        await reloadGate
        expect(saving).toBe(true)
      },
    })
    for (let i = 0; i < 20 && !reloadStarted; i += 1) await Promise.resolve()
    expect(reloadStarted).toBe(true)
    expect(saving).toBe(true)
    releaseReload()
    const result = await pending
    expect(result.posted).toBe(true)
    expect(result.postError).toBeNull()
    expect(result.reloadError).toBeNull()
    expect(saving).toBe(false)
  })

  it('restores the save button when the reload throws', async () => {
    let saving = true
    const result = await runSalesContactSave({
      onSaving: (value) => {
        saving = value
      },
      post: async () => {},
      reload: async () => {
        expect(saving).toBe(true)
        throw new Error('reload failed')
      },
    })
    expect(result.posted).toBe(true)
    expect(result.postError).toBeNull()
    expect(result.reloadError).toBeInstanceOf(Error)
    expect(saving).toBe(false)
  })

  it('does not reload after a failed post and still releases the button', async () => {
    let saving = true
    let reloaded = false
    const result = await runSalesContactSave({
      onSaving: (value) => {
        saving = value
      },
      post: async () => {
        throw new Error('save failed')
      },
      reload: async () => {
        reloaded = true
      },
    })
    expect(reloaded).toBe(false)
    expect(result.posted).toBe(false)
    expect(result.postError).toBeInstanceOf(Error)
    expect(saving).toBe(false)
  })
})
