import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const readRepo = (relativeFromUtilsTests: string) =>
  readFileSync(new URL(relativeFromUtilsTests, import.meta.url), 'utf8')

describe('dedicated Production flexible-session E2E workflow', () => {
  const workflow = readRepo('../../.github/workflows/e2e-flexible-session-production.yml')
  const spec = readRepo('../../e2e/flexible-session-category.spec.ts')
  const ci = readRepo('../../.github/workflows/ci.yml')

  it('is workflow_dispatch-only with fixed Production URL and single spec', () => {
    expect(workflow).toMatch(/^\s*workflow_dispatch:\s*$/m)
    expect(workflow).not.toMatch(/^\s*pull_request:/m)
    expect(workflow).not.toMatch(/^\s*push:/m)
    expect(workflow).toContain('E2E_BASE_URL: https://app.simy.ch')
    expect(workflow).toContain('E2E_ISOLATION_PASSWORD: ${{ secrets.E2E_ISOLATION_PASSWORD }}')
    expect(workflow).toContain('npx playwright test e2e/flexible-session-category.spec.ts --retries=0')
    expect(workflow).not.toContain('npm run test:e2e')
    expect(workflow).not.toContain('demo:e2e-isolation:setup')
    expect(workflow).not.toContain('E2E_DEMO_PASSWORD')
    expect(workflow).not.toMatch(/^\s*inputs:/m)
    expect(workflow).toMatch(/permissions:\s*\n\s*contents:\s*read/)
  })

  it('does not alter the general CI workflow to auto-run this suite', () => {
    expect(ci).not.toContain('flexible-session-category.spec.ts')
    expect(ci).not.toContain('e2e-flexible-session-production')
  })

  it('encodes tenant identity and exact-match cleanup guards in the spec', () => {
    expect(spec).toContain("52510467-f3db-4846-938b-7395df308144")
    expect(spec).toContain("e2e-isolation@simy.ch")
    expect(spec).toContain("E2E-FlexSess-")
    expect(spec).toContain('exact: true')
    expect(spec).toContain('CLEANUP_FAILED')
    expect(spec).toContain('ORPHAN_AMBIGUOUS')
    expect(spec).toContain('categoryId === identity.id')
    expect(spec).not.toContain('E2E_DEMO_PASSWORD')
    expect(spec).not.toContain('updateUserById')
    expect(spec).not.toMatch(/ilike|startsWith\(['"]E2E/)
  })
})
