import { describe, expect, it } from 'vitest'
import {
  decide,
  isCiAppProject,
  isDependabotRef,
  isRelevantFile,
} from '../../../scripts/vercel-should-build.mjs'

describe('isRelevantFile', () => {
  it('keeps app source and ignores other Vercel projects', () => {
    expect(isRelevantFile('app', 'server/api/health.get.ts')).toBe(true)
    expect(isRelevantFile('app', 'nuxt.config.ts')).toBe(true)
    expect(isRelevantFile('app', 'package.json')).toBe(true)
    expect(isRelevantFile('app', 'apps/website/nuxt.config.ts')).toBe(false)
    expect(isRelevantFile('app', 'apps/simy/app.vue')).toBe(false)
  })

  it('scopes website and simy marketing sites to their folders', () => {
    expect(isRelevantFile('website', 'apps/website/nuxt.config.ts')).toBe(true)
    expect(isRelevantFile('website', 'server/api/health.get.ts')).toBe(false)
    expect(isRelevantFile('simy', 'apps/simy/app.vue')).toBe(true)
    expect(isRelevantFile('simy', 'apps/website/app.vue')).toBe(false)
  })

  it('ignores docs, workflows, native apps, and tests everywhere', () => {
    expect(isRelevantFile('app', 'README.md')).toBe(false)
    expect(isRelevantFile('app', 'docs/seo/notes.md')).toBe(false)
    expect(isRelevantFile('app', '.github/workflows/ci.yml')).toBe(false)
    expect(isRelevantFile('app', 'ios/App/AppDelegate.swift')).toBe(false)
    expect(isRelevantFile('app', 'add_tenant_id_to_locations.sql')).toBe(false)
    expect(isRelevantFile('app', 'server/utils/__tests__/vat.test.ts')).toBe(false)
    expect(isRelevantFile('website', 'README.md')).toBe(false)
  })

  it('treats marketing-site markdown as live content, not docs', () => {
    expect(isRelevantFile('website', 'apps/website/content/blog/vku-kurs-verkehrskunde-sicherheit.md')).toBe(true)
    expect(isRelevantFile('website', 'apps/website/seo-meta-overview.md')).toBe(true)
    expect(isRelevantFile('app', 'apps/website/content/blog/vku-kurs-verkehrskunde-sicherheit.md')).toBe(false)
  })
})

describe('isDependabotRef', () => {
  it('matches dependabot and renovate branches or authors', () => {
    expect(isDependabotRef('dependabot/npm_and_yarn/nuxt-3.20.0')).toBe(true)
    expect(isDependabotRef('renovate/nuxt-3.x')).toBe(true)
    expect(isDependabotRef('cursor/fix-login-0492', 'dependabot[bot]')).toBe(true)
    expect(isDependabotRef('cursor/fix-login-0492', 'Kilchi555')).toBe(false)
  })
})

describe('isCiAppProject', () => {
  it('recognizes the simy-app production host or project id', () => {
    expect(isCiAppProject({ productionUrl: 'https://app.simy.ch' })).toBe(true)
    expect(isCiAppProject({ projectId: 'prj_DhkLC3tYRjc3zE7CZSoLFqhESWhK' })).toBe(true)
    expect(isCiAppProject({})).toBe(true)
  })

  it('rejects the duplicate driving-team-app preview host', () => {
    expect(isCiAppProject({ productionUrl: 'https://driving-team-app.vercel.app' })).toBe(false)
    expect(isCiAppProject({ projectId: 'prj_other' })).toBe(false)
  })
})

describe('decide', () => {
  const appPreview = {
    project: 'app',
    vercelEnv: 'preview',
    branch: 'cursor/fix-login-0492',
    productionUrl: 'https://app.simy.ch',
  } as const

  it('skips docs-only commits on every project, including production', () => {
    const files = ['docs/seo/notes.md', 'README.md', '.github/workflows/ci.yml']
    expect(decide({ project: 'app', vercelEnv: 'production', changedFiles: files }).skip).toBe(true)
    expect(decide({ project: 'website', vercelEnv: 'production', changedFiles: files }).skip).toBe(true)
    expect(decide({ project: 'simy', vercelEnv: 'production', changedFiles: files }).skip).toBe(true)
  })

  it('skips dependabot previews even when lockfiles change', () => {
    const result = decide({
      ...appPreview,
      branch: 'dependabot/npm_and_yarn/nuxt-3.20.0',
      changedFiles: ['package-lock.json'],
    })
    expect(result.skip).toBe(true)
  })

  it('still builds production when a dependabot merge updates the lockfile', () => {
    const result = decide({
      project: 'app',
      vercelEnv: 'production',
      branch: 'main',
      changedFiles: ['package-lock.json'],
    })
    expect(result.skip).toBe(false)
  })

  it('skips duplicate app previews that CI does not use', () => {
    const result = decide({
      project: 'app',
      vercelEnv: 'preview',
      productionUrl: 'https://driving-team-app.vercel.app',
      changedFiles: ['server/api/health.get.ts'],
    })
    expect(result.skip).toBe(true)
    expect(result.reason).toMatch(/duplicate app/)
  })

  it('builds simy-app previews when app code changes', () => {
    const result = decide({
      ...appPreview,
      changedFiles: ['server/api/health.get.ts'],
    })
    expect(result.skip).toBe(false)
  })

  it('skips website preview when only the app changed', () => {
    const result = decide({
      project: 'website',
      vercelEnv: 'preview',
      changedFiles: ['server/api/health.get.ts'],
    })
    expect(result.skip).toBe(true)
  })

  it('builds the website when its own source changed', () => {
    const result = decide({
      project: 'website',
      vercelEnv: 'preview',
      changedFiles: ['apps/website/nuxt.config.ts'],
    })
    expect(result.skip).toBe(false)
  })

  it('builds website production when only a blog post changed', () => {
    const result = decide({
      project: 'website',
      vercelEnv: 'production',
      changedFiles: ['apps/website/content/blog/theorieprufung-tipps-zuerich.md'],
    })
    expect(result.skip).toBe(false)
  })

  it('skips simy-app preview when this commit is only tests, even if the PR also has app files', () => {
    const result = decide({
      ...appPreview,
      changedFiles: ['server/utils/__tests__/vat.test.ts', 'README.md'],
    })
    expect(result.skip).toBe(true)
  })

  it('forces a build when the commit message asks for it', () => {
    const result = decide({
      project: 'app',
      vercelEnv: 'preview',
      commitMessage: 'docs only [vercel deploy]',
      productionUrl: 'https://driving-team-app.vercel.app',
      changedFiles: ['README.md'],
    })
    expect(result.skip).toBe(false)
  })

  it('builds when the file list is unknown', () => {
    const result = decide({
      ...appPreview,
      changedFiles: null,
    })
    expect(result.skip).toBe(false)
  })
})
