import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(process.cwd())

const publicHandlers = [
  'server/api/public/website/[subdomain].get.ts',
  'server/api/public/website/[subdomain]/[slug].get.ts',
  'server/api/public/website/[subdomain]/lead.post.ts',
  'server/api/public/website/[subdomain]/legal.get.ts',
  'server/api/public/website/[subdomain]/reviews.get.ts',
  'server/api/public/website/[subdomain]/next-slots.get.ts',
  'server/api/public/website/[subdomain]/pickup-check.post.ts',
  'server/api/public/website/[subdomain]/og.png.get.ts',
]

describe('public website preview gate wiring', () => {
  it('routes unpublished access through the shared authorizer and drops preview=1 bypass', () => {
    for (const rel of publicHandlers) {
      const src = readFileSync(resolve(root, rel), 'utf8')
      expect(src, rel).toContain('loadAuthorizedPublicWebsite')
      expect(src, rel).not.toMatch(/getQuery\(event\)\.preview \|\| ''\) === '1'/)
      expect(src, rel).not.toMatch(/preview === true/)
      expect(src, rel).not.toMatch(/body\?\.preview/)
    }
  })

  it('does not write the plaintext token into the unused preview_token column on generate', () => {
    const src = readFileSync(resolve(root, 'server/utils/website-prospect-generate.ts'), 'utf8')
    expect(src).toContain('mintWebsitePreviewToken')
    expect(src).toContain('mintedPreviewFields')
    expect(src).toContain('preview=${encodeURIComponent(minted.token)}')
    expect(src).not.toMatch(/preview_token:\s*minted/)
  })
})
