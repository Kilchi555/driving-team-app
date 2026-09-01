/**
 * Vercel Ignored Build Step.
 *
 * Exit 0 → skip the build (saves Build CPU minutes).
 * Exit 1 → continue with the build.
 *
 * Usage (from each project's Root Directory):
 *   node scripts/vercel-should-build.mjs app
 *   node ../../scripts/vercel-should-build.mjs website
 *   node ../../scripts/vercel-should-build.mjs simy
 *
 * Add `[vercel deploy]` to a commit message to force a build.
 */
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

export const PROJECTS = ['app', 'website', 'simy']

/** Production host of the app preview that CI / E2E wait for. */
export const SIMY_APP_HOSTS = ['app.simy.ch', 'simy-app']

/** Known Vercel project id of the live app (env rotation / app.simy.ch). */
export const SIMY_APP_PROJECT_ID = 'prj_DhkLC3tYRjc3zE7CZSoLFqhESWhK'

export const PRODUCTION_FALLBACK_URL = 'https://app.simy.ch'

export const FORCE_BUILD_RE = /\[vercel deploy\]/i

const IGNORE_PREFIXES = [
  'docs/',
  '.github/',
  '.cursor/',
  '.agents/',
  '.githooks/',
  'ios/',
  'android/',
  'e2e/',
  'migrations/',
  'supabase/',
  'scripts/',
]

const IGNORE_EXACT = new Set([
  'playwright.config.ts',
  'vitest.config.ts',
  'LICENSE',
  'CODEOWNERS',
  '.gitignore',
  '.editorconfig',
])

export function normalizeFile(file) {
  return String(file || '').replace(/\\/g, '/').replace(/^\.\//, '')
}

function isMarketingSitePath(name) {
  return name.startsWith('apps/website/') || name.startsWith('apps/simy/')
}

export function isIgnoredEverywhere(file) {
  const name = normalizeFile(file)
  if (!name) return true
  if (name.endsWith('.sql')) return true
  // Blog/CMS markdown under the marketing sites is live Nuxt Content.
  // Repo-root and docs/*.md stay ignored so they do not rebuild the app.
  if ((name.endsWith('.md') || name.endsWith('.mdc')) && !isMarketingSitePath(name)) return true
  if (IGNORE_EXACT.has(name)) return true
  if (IGNORE_PREFIXES.some((prefix) => name.startsWith(prefix))) return true
  if (name.includes('/__tests__/')) return true
  if (name.endsWith('.test.ts') || name.endsWith('.spec.ts')) return true
  return false
}

export function isRelevantFile(project, file) {
  const name = normalizeFile(file)
  if (isIgnoredEverywhere(name)) return false
  if (project === 'website') return name.startsWith('apps/website/')
  if (project === 'simy') return name.startsWith('apps/simy/')
  if (project === 'app') {
    return !name.startsWith('apps/website/') && !name.startsWith('apps/simy/')
  }
  return true
}

export function isDependabotRef(branch, authorLogin = '') {
  const ref = String(branch || '')
  const author = String(authorLogin || '').toLowerCase()
  if (/^(dependabot|renovate)(\/|$)/i.test(ref)) return true
  return author === 'dependabot' || author === 'dependabot[bot]' || author === 'app/dependabot'
}

export function isCiAppProject({ productionUrl = '', projectId = '' } = {}) {
  const host = String(productionUrl || '').toLowerCase()
  if (SIMY_APP_HOSTS.some((part) => host.includes(part))) return true
  if (projectId && projectId === SIMY_APP_PROJECT_ID) return true
  // Unknown identity: do not drop the preview CI depends on.
  if (!host && !projectId) return true
  return false
}

/**
 * @param {{
 *   project: string,
 *   vercelEnv?: string,
 *   branch?: string,
 *   commitMessage?: string,
 *   authorLogin?: string,
 *   productionUrl?: string,
 *   projectId?: string,
 *   changedFiles?: string[] | null,
 * }} input
 */
export function decide(input) {
  const project = input.project
  const vercelEnv = input.vercelEnv || 'preview'
  const branch = input.branch || ''
  const commitMessage = input.commitMessage || ''
  const isProduction = vercelEnv === 'production'

  if (!PROJECTS.includes(project)) {
    return { skip: false, reason: `unknown project "${project}", building to be safe` }
  }

  if (FORCE_BUILD_RE.test(commitMessage)) {
    return { skip: false, reason: 'forced by [vercel deploy]' }
  }

  if (!isProduction) {
    if (isDependabotRef(branch, input.authorLogin)) {
      return { skip: true, reason: `preview skipped for ${branch || input.authorLogin || 'dependabot'}` }
    }
    if (project === 'app' && !isCiAppProject(input)) {
      return { skip: true, reason: 'preview skipped for duplicate app project (CI uses simy-app)' }
    }
  }

  if (input.changedFiles == null) {
    return { skip: false, reason: 'could not list changed files, building to be safe' }
  }

  const relevant = input.changedFiles.filter((file) => isRelevantFile(project, file))
  if (relevant.length === 0) {
    return { skip: true, reason: `no ${project}-relevant files in this commit` }
  }

  return { skip: false, reason: `${relevant.length} ${project}-relevant file(s)` }
}

export function listChangedFiles() {
  try {
    const out = execSync('git diff --name-only -z HEAD^ HEAD', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
    return out.split('\0').map(normalizeFile).filter(Boolean)
  } catch {
    return null
  }
}

export function decideFromEnv(project, env = process.env) {
  return decide({
    project,
    vercelEnv: env.VERCEL_ENV || 'preview',
    branch: env.VERCEL_GIT_COMMIT_REF || '',
    commitMessage: env.VERCEL_GIT_COMMIT_MESSAGE || '',
    authorLogin: env.VERCEL_GIT_COMMIT_AUTHOR_LOGIN || '',
    productionUrl: env.VERCEL_PROJECT_PRODUCTION_URL || '',
    projectId: env.VERCEL_PROJECT_ID || '',
    changedFiles: listChangedFiles(),
  })
}

export function runCli(project = process.argv[2], env = process.env) {
  if (!project) {
    console.error('usage: node vercel-should-build.mjs <app|website|simy>')
    return 1
  }
  const result = decideFromEnv(project, env)
  const label = result.skip ? 'skip' : 'build'
  console.log(`[vercel-should-build] ${label}: ${result.reason}`)
  return result.skip ? 0 : 1
}

const invokedDirectly = process.argv[1]
  && path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1])

if (invokedDirectly) {
  process.exit(runCli())
}
