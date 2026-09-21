import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(process.cwd())

function src(rel: string) {
  return readFileSync(resolve(root, rel), 'utf8')
}

describe('website factory foundation security contracts', () => {
  it('keeps rollback and revision list tenant-bound', () => {
    const rollback = src('server/api/website/rollback.post.ts')
    const list = src('server/api/website/revisions.get.ts')
    expect(rollback).toContain('getAuthenticatedUser')
    expect(rollback).toContain('.eq(\'tenant_id\', tenantId)')
    expect(rollback).toContain('rollbackWebsiteRevision')
    expect(rollback).not.toContain('body.version_number')
    expect(list).toContain('getAuthenticatedUser')
    expect(list).toContain('.eq(\'tenant_id\', tenantId)')
    expect(list).toContain('.eq(\'website_id\', website.id)')
  })

  it('does not let clients mark drafts published or choose version numbers', () => {
    const revision = src('server/utils/website-revision.ts')
    expect(revision).toContain('allocateWebsiteVersionNumber')
    expect(revision).toContain('status: \'published\'')
    expect(revision).not.toMatch(/version_number:\s*opts\.version/)
    expect(revision).not.toMatch(/status:\s*opts\.status/)
  })

  it('keeps #251 payment != publish and hashed claim tokens', () => {
    const billing = src('server/utils/website-billing.ts')
    const claim = src('server/utils/website-claim-token.ts')
    const qa = src('server/api/tenant-admin/websites/[id]/qa.post.ts')
    expect(billing).toContain('payment != publication')
    expect(billing).toContain('publishWebsiteForTenant')
    expect(billing).toContain('runWebsiteQualityChecks')
    expect(claim).toContain('sha256')
    expect(claim).toContain('timingSafeEqual')
    expect(qa).toContain('requireSuperAdmin')
  })

  it('does not change #249 preview or /s/** ISR in this foundation slice', () => {
    const nuxt = src('nuxt.config.ts')
    const publicHome = src('server/api/public/website/[subdomain].get.ts')
    const cache = src('server/utils/website-public-cache.ts')
    expect(nuxt).toContain("'/s/**'")
    expect(nuxt).toMatch(/isr:\s*60/)
    expect(publicHome).toContain('preview')
    expect(publicHome).not.toContain('published_revision_id')
    expect(publicHome).not.toContain('website_revisions')
    expect(cache).toContain("private, no-store")
    expect(src('server/utils/website-lifecycle.ts')).not.toContain('preview_token_hash')
  })

  it('keeps every public website read on website_pages.blocks (no Strategy B cutover)', () => {
    const publicPaths = [
      'server/api/public/website/[subdomain].get.ts',
      'server/api/public/website/[subdomain]/[slug].get.ts',
      'server/api/public/website/[subdomain]/og.png.get.ts',
      'server/api/public/website/[subdomain]/legal.get.ts',
      'server/api/public/website/[subdomain]/reviews.get.ts',
      'server/api/public/website/[subdomain]/lead.post.ts',
      'server/api/public/website/[subdomain]/next-slots.get.ts',
      'server/routes/s/[subdomain]/sitemap.xml.ts',
      'server/routes/s/[subdomain]/llms.txt.ts',
      'server/routes/s/[subdomain]/robots.txt.ts',
      'server/routes/robots.txt.ts',
      'server/middleware/02.custom-domain.ts',
      'server/utils/website-seo-context.ts',
      'server/utils/website-public-cache.ts',
    ]
    for (const rel of publicPaths) {
      const body = src(rel)
      expect(body, rel).not.toContain('published_revision_id')
      expect(body, rel).not.toContain('website_revisions')
      expect(body, rel).not.toContain('website-revision-backfill')
    }
    expect(src('server/api/public/website/[subdomain].get.ts')).toContain("from('website_pages')")
    expect(src('server/api/public/website/[subdomain]/[slug].get.ts')).toContain("from('website_pages')")
    expect(src('server/api/website/wizard-save.post.ts')).toContain('website_pages.blocks')
    expect(src('server/api/website/slots-save.post.ts')).toContain('website_pages.blocks')
    const backfill = src('server/utils/website-revision-backfill.ts')
    expect(backfill).toContain("eq('is_published', true)")
    expect(backfill).toContain('isDeterministicHomepage')
    expect(backfill).not.toMatch(/create trigger|CREATE TRIGGER/i)
  })

  it('routes live draft writes through published-block protection', () => {
    const slots = src('server/api/website/slots-save.post.ts')
    const pagePut = src('server/api/website/pages/[[slug]].put.ts')
    const wizard = src('server/api/website/wizard-save.post.ts')
    const restore = src('server/utils/website-revision.ts')
    for (const body of [slots, pagePut, wizard]) {
      expect(body).toContain('buildWebsitePageContentWrite')
      expect(body).toContain('publishedWebsiteProtectsLiveBlocks')
    }
    expect(restore).toContain('is_published: page.is_published === true')
    expect(restore).not.toMatch(/is_published:\s*true/)
  })

  it('does not apply or invoke production backfill from application boot paths', () => {
    expect(src('server/utils/website-billing.ts')).not.toContain('website-revision-backfill')
    expect(src('server/utils/website-prospect-generate.ts')).not.toContain('website-revision-backfill')
    expect(src('nuxt.config.ts')).not.toContain('website-revision-backfill')
  })

  it('never writes secrets into lifecycle audit metadata', () => {
    const audit = src('server/utils/website-lifecycle-audit.ts')
    expect(audit).toContain('sanitizeWebsiteAuditMetadata')
    expect(audit).toContain('claim_token')
    expect(audit).toContain('preview_token')
    const generate = src('server/utils/website-prospect-generate.ts')
    expect(generate).toContain('website_generated')
    expect(generate).toContain('metadata: { prospect_id: prospect.id }')
    const auditCall = generate.slice(generate.indexOf('recordWebsiteLifecycleEvent'))
    const auditBlock = auditCall.slice(0, auditCall.indexOf('}).catch') + 1)
    expect(auditBlock).not.toContain('claim_token')
    expect(auditBlock).not.toContain('preview_token')
  })
})
