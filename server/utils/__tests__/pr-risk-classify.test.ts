import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  autoMergeAction,
  classifyFile,
  classifyFromRaw,
  classifyPullRequest,
  formatRiskComment,
  mergeRiskSignals,
  parseChangedFilesInput,
  shouldEnableAutoMerge,
} from '../../../scripts/pr-risk-classify.mjs'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')

function ghPrMergeCommands(yaml: string) {
  const lines = yaml.split('\n')
  const commands: string[] = []
  for (let i = 0; i < lines.length; i += 1) {
    if (!/^\s*gh pr merge\b/.test(lines[i])) continue
    let command = lines[i].trim()
    while (command.endsWith('\\')) {
      i += 1
      command = `${command.slice(0, -1).trimEnd()} ${lines[i].trim()}`
    }
    commands.push(command)
  }
  return commands
}

function files(...paths: string[]) {
  return paths.map((filename) => ({ filename }))
}

function riskOf(...paths: string[]) {
  return classifyPullRequest(files(...paths)).risk
}

describe('GREEN', () => {
  it('classifies docs-only changes as green', () => {
    expect(riskOf('docs/backup-cloudflare-r2.md')).toBe('green')
    expect(riskOf('README.md')).toBe('green')
    expect(riskOf('content/help/admin/buchhaltung-und-lohn.md')).toBe('green')
  })

  it('classifies UI-only Vue without money/auth names as green', () => {
    expect(riskOf('components/CalendarComponent.vue')).toBe('green')
    expect(riskOf('apps/website/components/LeadMagnetForm.vue')).toBe('green')
  })

  it('classifies test-only changes as green even when names mention money', () => {
    expect(riskOf('server/utils/__tests__/wallee-webhook-replay.test.ts')).toBe('green')
    expect(riskOf('server/utils/__tests__/account-switch.test.ts')).toBe('green')
    expect(riskOf('e2e/login.spec.ts')).toBe('green')
  })

  it('does not upgrade docs that mention wallee in the diff', () => {
    const result = classifyFile({
      filename: 'docs/payments.md',
      patch: '+ Wallee webhook recovery and wallet credits',
    })
    expect(result.risk).toBe('green')
  })

  it('allows auto-merge only for green ready PRs', () => {
    expect(shouldEnableAutoMerge({ risk: 'green', draft: false, classifyOk: true })).toBe(true)
  })
})

describe('YELLOW', () => {
  it('classifies a normal API change as yellow', () => {
    expect(riskOf('server/api/booking/check-conflicts.post.ts')).toBe('yellow')
  })

  it('classifies normal business logic as yellow', () => {
    expect(riskOf('composables/useAvailabilitySystem.ts')).toBe('yellow')
    expect(riskOf('pages/shop.vue')).toBe('yellow')
    expect(riskOf('package.json')).toBe('yellow')
  })

  it('blocks auto-merge for yellow', () => {
    expect(shouldEnableAutoMerge({ risk: 'yellow', draft: false, classifyOk: true })).toBe(false)
    expect(autoMergeAction({
      classifyResult: 'success',
      risk: 'yellow',
      draft: false,
      headRepo: 'Kilchi555/driving-team-app',
      thisRepo: 'Kilchi555/driving-team-app',
    })).toBe('disable')
  })
})

describe('RED', () => {
  it('classifies auth and session middleware as red', () => {
    expect(riskOf('middleware/auth.ts')).toBe('red')
    expect(riskOf('plugins/01-session-recovery.client.ts')).toBe('red')
    expect(riskOf('plugins/02-supabase-auth-interceptor.client.ts')).toBe('red')
  })

  it('classifies authorization / admin access as red', () => {
    expect(riskOf('server/api/admin/get-tenant-users.get.ts')).toBe('red')
    expect(riskOf('components/admin/UserDetails.vue')).toBe('red')
    expect(riskOf('server/utils/access-control.ts')).toBe('red')
  })

  it('classifies RLS and tenant isolation as red', () => {
    expect(riskOf('docs/rls-notes.md')).toBe('green')
    expect(riskOf('server/utils/rls-helpers.ts')).toBe('red')
    expect(riskOf('composables/useTenant.ts')).toBe('red')
  })

  it('classifies service_role references as red', () => {
    expect(riskOf('server/utils/service-role-client.ts')).toBe('red')
    const fromDiff = classifyFile({
      filename: 'server/api/booking/check-conflicts.post.ts',
      patch: '+ const supabase = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY)',
    })
    expect(fromDiff.risk).toBe('red')
  })

  it('classifies student PII UI as red', () => {
    expect(riskOf('components/AddStudentModal.vue')).toBe('red')
  })

  it('classifies the ship-to-main Cursor rule as red', () => {
    expect(riskOf('.cursor/rules/ship-to-main.mdc')).toBe('red')
  })

  it('blocks auto-merge for red', () => {
    expect(shouldEnableAutoMerge({ risk: 'red', draft: false, classifyOk: true })).toBe(false)
  })
})

describe('CRITICAL', () => {
  it('classifies Wallee paths as critical', () => {
    expect(riskOf('server/api/wallee/webhook.post.ts')).toBe('critical')
  })

  it('classifies payment paths as critical', () => {
    expect(riskOf('server/api/payments/process.post.ts')).toBe('critical')
    expect(riskOf('pages/pay/token.vue')).toBe('critical')
  })

  it('classifies wallet and credits as critical', () => {
    expect(riskOf('server/utils/wallet-atomic.ts')).toBe('critical')
    expect(riskOf('server/api/admin/credit/adjust.post.ts')).toBe('critical')
  })

  it('classifies webhooks as critical', () => {
    expect(riskOf('server/api/stripe/webhook.post.ts')).toBe('critical')
  })

  it('classifies migrations as critical', () => {
    expect(riskOf('migrations/20260906_wallee_checkout_claim.sql')).toBe('critical')
    expect(riskOf('sql_migrations/add_tenant.sql')).toBe('critical')
  })

  it('classifies account switching and impersonation as critical', () => {
    expect(riskOf('server/utils/account-switch.ts')).toBe('critical')
    expect(riskOf('server/api/admin/impersonate.post.ts')).toBe('critical')
  })

  it('classifies production-write scripts as critical', () => {
    expect(riskOf('server/scripts/run-fix-probe-landing-via-prod.mjs')).toBe('critical')
  })

  it('classifies merge-governance workflows as critical', () => {
    expect(riskOf('.github/workflows/auto-merge.yml')).toBe('critical')
    expect(riskOf('.github/workflows/import-reviews.yml')).toBe('critical')
    expect(riskOf('.github/CODEOWNERS')).toBe('critical')
    expect(riskOf('scripts/pr-risk-classify.mjs')).toBe('critical')
  })

  it('blocks auto-merge for critical', () => {
    expect(shouldEnableAutoMerge({ risk: 'critical', draft: false, classifyOk: true })).toBe(false)
  })
})

describe('highest class wins', () => {
  it('upgrades a mixed docs + payment PR to critical', () => {
    expect(riskOf('README.md', 'server/api/payments/process.post.ts')).toBe('critical')
  })

  it('upgrades UI + auth to red', () => {
    expect(riskOf('components/CalendarComponent.vue', 'middleware/auth.ts')).toBe('red')
  })
})

describe('FAIL-CLOSED', () => {
  it('treats unknown paths as unknown, never green', () => {
    expect(riskOf('vendor/mystery.bin')).toBe('unknown')
    expect(shouldEnableAutoMerge({ risk: 'unknown', draft: false, classifyOk: true })).toBe(false)
  })

  it('treats malformed metadata as unknown', () => {
    expect(classifyFromRaw('not-json').risk).toBe('unknown')
    expect(classifyFromRaw('{"filename":"README.md"}').risk).toBe('unknown')
    expect(() => parseChangedFilesInput('')).toThrow('empty_files_payload')
    expect(() => parseChangedFilesInput('[{"filename":""}]')).toThrow('malformed_file_entry')
  })

  it('treats missing risk as no auto-merge', () => {
    expect(shouldEnableAutoMerge({ risk: undefined, draft: false, classifyOk: true })).toBe(false)
    expect(shouldEnableAutoMerge({ risk: '', draft: false, classifyOk: true })).toBe(false)
    expect(autoMergeAction({
      classifyResult: 'success',
      risk: '',
      headRepo: 'a',
      thisRepo: 'a',
    })).toBe('disable')
  })

  it('uses the highest label when risk labels conflict', () => {
    const result = classifyPullRequest(files('README.md'), {
      labels: ['risk:green', 'risk:red'],
    })
    expect(result.risk).toBe('red')
    expect(result.autoMerge).toBe(false)
  })

  it('returns unknown when a risk label is invalid', () => {
    expect(mergeRiskSignals({ computed: 'green', labels: ['risk:purple'] })).toBe('unknown')
    expect(shouldEnableAutoMerge({ risk: 'unknown', classifyOk: true })).toBe(false)
  })

  it('blocks auto-merge when the classifier job failed', () => {
    expect(autoMergeAction({
      classifyResult: 'failure',
      risk: 'green',
      draft: false,
      headRepo: 'a',
      thisRepo: 'a',
    })).toBe('disable')
  })

  it('blocks auto-merge for drafts and fork PRs', () => {
    expect(autoMergeAction({
      classifyResult: 'success',
      risk: 'green',
      draft: true,
      headRepo: 'a',
      thisRepo: 'a',
    })).toBe('disable')
    expect(autoMergeAction({
      classifyResult: 'success',
      risk: 'green',
      draft: false,
      headRepo: 'fork/app',
      thisRepo: 'Kilchi555/driving-team-app',
    })).toBe('disable')
  })

  it('never maps unknown to green', () => {
    const result = classifyFromRaw('[]')
    expect(result.risk).toBe('unknown')
    expect(result.autoMerge).toBe(false)
  })
})

describe('trusted base classifier vs poisoned PR copy', () => {
  it('keeps CRITICAL when the PR poisons the classifier and changes Wallee', () => {
    const prDiff = [
      {
        filename: 'scripts/pr-risk-classify.mjs',
        patch: '+export function classifyPullRequest() { return { risk: "green", autoMerge: true } }',
      },
      {
        filename: 'server/api/wallee/webhook.post.ts',
        patch: '+// attacker-controlled payment webhook change',
      },
    ]
    const poisonedClassifierResult = { risk: 'green', autoMerge: true }
    const trusted = classifyPullRequest(prDiff)

    expect(poisonedClassifierResult.risk).toBe('green')
    expect(trusted.risk).toBe('critical')
    expect(trusted.autoMerge).toBe(false)
    expect(trusted.files.map(file => file.filename)).toEqual([
      'scripts/pr-risk-classify.mjs',
      'server/api/wallee/webhook.post.ts',
    ])
  })

  it('still blocks auto-merge if the PR only rewrites the classifier to always-green', () => {
    const trusted = classifyPullRequest([
      {
        filename: 'scripts/pr-risk-classify.mjs',
        patch: '+console.log("risk=green")',
      },
    ])
    expect(trusted.risk).toBe('critical')
    expect(trusted.autoMerge).toBe(false)
  })

  it('classifies the PR file list from the API, not the base tree', () => {
    const currentPrFiles = files('README.md', 'server/api/payments/process.post.ts')
    const baseTreeWouldLookLike = files('README.md')
    expect(classifyPullRequest(baseTreeWouldLookLike).risk).toBe('green')
    expect(classifyPullRequest(currentPrFiles).risk).toBe('critical')
  })
})

describe('comment', () => {
  it('explains the chosen class and triggered rules', () => {
    const result = classifyPullRequest(files('server/api/wallee/webhook.post.ts'))
    const comment = formatRiskComment(result)
    expect(comment).toContain('<!-- simy-pr-risk -->')
    expect(comment).toContain('CRITICAL')
    expect(comment).toContain('wallee')
    expect(comment).toContain('auto-merge blocked')
  })
})

describe('workflow validation', () => {
  const autoMerge = readFileSync(path.join(repoRoot, '.github/workflows/auto-merge.yml'), 'utf8')
  const importReviews = readFileSync(path.join(repoRoot, '.github/workflows/import-reviews.yml'), 'utf8')

  it('executes the classifier from PR base.sha, not PR head', () => {
    expect(autoMerge).not.toMatch(/pull_request_target/)
    expect(autoMerge).toContain('ref: ${{ github.event.pull_request.base.sha }}')
    expect(autoMerge).not.toMatch(/ref:\s*\$\{\{\s*github\.event\.pull_request\.head\.sha/)
    expect(autoMerge).not.toMatch(/ref:\s*\$\{\{\s*github\.sha/)
    expect(autoMerge).toContain('pulls/${PR_NUMBER}/files')
    expect(autoMerge).toContain('node scripts/pr-risk-classify.mjs')
    expect(autoMerge).not.toMatch(/npm ci/)
    expect(autoMerge).not.toMatch(/npm install/)
  })

  it('cancels stale governance runs for the same PR', () => {
    expect(autoMerge).toContain('pr-governance-${{ github.event.pull_request.number }}')
    expect(autoMerge).toContain('cancel-in-progress: true')
    // GitHub's cancel-in-progress is not reproducible in-process. This test
    // only asserts the workflow wiring: a newer synchronize must cancel the
    // older run so a stale GREEN enable cannot finish after CRITICAL.
  })

  it('enables auto-merge only when classify succeeded and risk is green', () => {
    expect(autoMerge).toContain('${RISK}" = "green"')
    expect(autoMerge).toContain('${CLASSIFY_RESULT}" = "success"')
    expect(autoMerge).toContain('auto-merge disabled (fail-closed)')
    expect(autoMerge).not.toMatch(/unknown → green|unknown -> green/)
  })

  it('fail-closed path uses --disable-auto, not the invalid --disable flag', () => {
    const commands = ghPrMergeCommands(autoMerge)
    const failClosed = commands.filter(command => !/(?:^|\s)--auto(?:\s|$)/.test(command))
    const enable = commands.filter(command => /(?:^|\s)--auto(?:\s|$)/.test(command))

    expect(failClosed).toHaveLength(1)
    expect(enable).toHaveLength(1)
    expect(failClosed[0]).toMatch(/--disable-auto(?:\s|$)/)
    expect(failClosed[0]).not.toMatch(/--disable(?!-auto)/)
    expect(enable[0]).not.toMatch(/--disable(?!-auto)/)
  })

  it('does not grant administration write', () => {
    expect(autoMerge).not.toMatch(/administration:\s*write/)
    expect(importReviews).not.toMatch(/administration:\s*write/)
  })

  it('keeps classifier write scope to PR labels/comments', () => {
    expect(autoMerge).toMatch(/classify:[\s\S]*permissions:[\s\S]*contents: read/)
    expect(autoMerge).toMatch(/issues: write/)
  })

  it('stops import-reviews from committing to main or skipping CI', () => {
    expect(importReviews).not.toContain('git-auto-commit-action')
    expect(importReviews).not.toMatch(/\[skip ci\]/)
    expect(importReviews).toContain('bot/weekly-review-import')
    expect(importReviews).toContain('refusing to push default branch')
    expect(importReviews).toContain('refusing to commit on main')
    expect(importReviews).toContain('gh pr create')
    expect(importReviews).toContain('HEAD:refs/heads/${BRANCH}')
    expect(importReviews).not.toMatch(/git push origin main/)
  })
})
