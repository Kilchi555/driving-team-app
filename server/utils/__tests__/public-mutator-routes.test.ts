import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { resolve, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = process.cwd()

const REMOVED_ROUTES = [
  'server/api/sari/validate-enrollment.post.ts',
  'server/api/tenants/seed-defaults.post.ts',
  'server/api/reminder/seed-templates.post.ts',
  'server/api/debug/trigger-recalc-queue.post.ts',
  'server/api/geocoding/resolve-plz.post.ts',
] as const

const REMOVED_PATHS = [
  '/api/sari/validate-enrollment',
  '/api/tenants/seed-defaults',
  '/api/reminder/seed-templates',
  '/api/debug/trigger-recalc-queue',
  '/api/geocoding/resolve-plz',
] as const

const SCAN_ROOTS = [
  'server',
  'utils',
  'pages',
  'components',
  'composables',
  'plugins',
  'middleware',
  'stores',
  'apps',
]

function walk(dir: string, acc: string[]) {
  if (!existsSync(dir)) return
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.nuxt' || entry === 'dist') continue
    const full = resolve(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) {
      if (entry === '__tests__' || entry === 'test') continue
      walk(full, acc)
    } else if (/\.(ts|vue|js|mjs)$/.test(entry)) acc.push(full)
  }
}

describe('unauthenticated privileged mutators are not registered', () => {
  it('deletes the five public mutator route files', () => {
    for (const rel of REMOVED_ROUTES) {
      expect(existsSync(resolve(ROOT, rel)), rel).toBe(false)
    }
  })

  it('keeps the recalc cron, SARI lookup, and postal-code helper', () => {
    expect(existsSync(resolve(ROOT, 'server/api/cron/process-recalc-queue.get.ts'))).toBe(true)
    expect(existsSync(resolve(ROOT, 'server/api/sari/lookup-customer.post.ts'))).toBe(true)
    expect(existsSync(resolve(ROOT, 'utils/postalCodeUtils.ts'))).toBe(true)
    expect(existsSync(resolve(ROOT, 'server/utils/resolve-plz.ts'))).toBe(true)
  })

  it('has no executable caller of the removed HTTP paths', () => {
    const files: string[] = []
    for (const root of SCAN_ROOTS) walk(resolve(ROOT, root), files)
    const hits: string[] = []
    for (const file of files) {
      const text = readFileSync(file, 'utf8')
      for (const path of REMOVED_PATHS) {
        if (text.includes(path)) hits.push(`${relative(ROOT, file)} -> ${path}`)
      }
    }
    expect(hits).toEqual([])
  })

  it('does not import the deleted route modules', async () => {
    const imports = [
      '../../api/sari/validate-enrollment.post',
      '../../api/tenants/seed-defaults.post',
      '../../api/reminder/seed-templates.post',
      '../../api/debug/trigger-recalc-queue.post',
      '../../api/geocoding/resolve-plz.post',
    ]
    for (const spec of imports) {
      await expect(import(spec)).rejects.toThrow()
    }
  })
})
