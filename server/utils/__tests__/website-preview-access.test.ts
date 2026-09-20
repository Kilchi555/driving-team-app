import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mintWebsitePreviewToken } from '../website-preview-token'

const mocks = vi.hoisted(() => ({
  getAuthenticatedUser: vi.fn(async () => null as { tenant_id?: string } | null),
}))

vi.mock('~/server/utils/auth', () => ({
  getAuthenticatedUser: mocks.getAuthenticatedUser,
}))

function prospectClient(row: Record<string, unknown> | null) {
  const api: any = {
    select: () => api,
    eq: () => api,
    maybeSingle: async () => ({ data: row, error: null }),
  }
  return {
    from: (table: string) => {
      if (table !== 'website_prospects') throw new Error(`unexpected table ${table}`)
      return api
    },
  }
}

async function expectDenied(fn: () => Promise<unknown>) {
  await expect(fn()).rejects.toMatchObject({ statusCode: 404, statusMessage: 'Website not found' })
}

describe('website preview access', () => {
  beforeEach(() => {
    mocks.getAuthenticatedUser.mockReset()
    mocks.getAuthenticatedUser.mockResolvedValue(null)
  })

  it('allows published websites without a token', async () => {
    const { authorizePublicWebsiteAccess } = await import('../website-preview-access')
    const access = await authorizePublicWebsiteAccess({
      supabase: prospectClient(null),
      website: { id: 'site-a', tenant_id: 'tenant-a', is_published: true },
      previewRaw: undefined,
    })
    expect(access).toEqual({ preview: false, prospectId: null })
  })

  it('allows published websites even if a token is present', async () => {
    const { authorizePublicWebsiteAccess } = await import('../website-preview-access')
    const access = await authorizePublicWebsiteAccess({
      supabase: prospectClient(null),
      website: { id: 'site-a', tenant_id: 'tenant-a', is_published: true },
      previewRaw: mintWebsitePreviewToken().token,
    })
    expect(access.preview).toBe(false)
  })

  it('denies unpublished websites without a token', async () => {
    const { authorizePublicWebsiteAccess } = await import('../website-preview-access')
    await expectDenied(() =>
      authorizePublicWebsiteAccess({
        supabase: prospectClient(null),
        website: { id: 'site-a', tenant_id: 'tenant-a', is_published: false },
        previewRaw: undefined,
      }),
    )
  })

  it('denies unpublished websites when preview=1 is used as a public bypass', async () => {
    const { authorizePublicWebsiteAccess } = await import('../website-preview-access')
    await expectDenied(() =>
      authorizePublicWebsiteAccess({
        supabase: prospectClient(null),
        website: { id: 'site-a', tenant_id: 'tenant-a', is_published: false },
        previewRaw: '1',
      }),
    )
  })

  it('allows unpublished websites with a valid scoped token', async () => {
    const { authorizePublicWebsiteAccess } = await import('../website-preview-access')
    const minted = mintWebsitePreviewToken()
    const access = await authorizePublicWebsiteAccess({
      supabase: prospectClient({
        id: 'prospect-a',
        tenant_id: 'tenant-a',
        website_id: 'site-a',
        preview_token_hash: minted.hash,
        preview_expires_at: minted.expiresAt.toISOString(),
        preview_revoked_at: null,
      }),
      website: { id: 'site-a', tenant_id: 'tenant-a', is_published: false },
      previewRaw: minted.token,
    })
    expect(access).toEqual({ preview: true, prospectId: 'prospect-a' })
  })

  it('denies unpublished websites with the wrong token', async () => {
    const { authorizePublicWebsiteAccess } = await import('../website-preview-access')
    const minted = mintWebsitePreviewToken()
    await expectDenied(() =>
      authorizePublicWebsiteAccess({
        supabase: prospectClient({
          id: 'prospect-a',
          tenant_id: 'tenant-a',
          website_id: 'site-a',
          preview_token_hash: minted.hash,
          preview_expires_at: minted.expiresAt.toISOString(),
          preview_revoked_at: null,
        }),
        website: { id: 'site-a', tenant_id: 'tenant-a', is_published: false },
        previewRaw: mintWebsitePreviewToken().token,
      }),
    )
  })

  it('denies expired and revoked tokens with the same 404', async () => {
    const { authorizePublicWebsiteAccess } = await import('../website-preview-access')
    const minted = mintWebsitePreviewToken()
    await expectDenied(() =>
      authorizePublicWebsiteAccess({
        supabase: prospectClient({
          id: 'prospect-a',
          tenant_id: 'tenant-a',
          website_id: 'site-a',
          preview_token_hash: minted.hash,
          preview_expires_at: new Date(Date.now() - 60_000).toISOString(),
          preview_revoked_at: null,
        }),
        website: { id: 'site-a', tenant_id: 'tenant-a', is_published: false },
        previewRaw: minted.token,
      }),
    )
    await expectDenied(() =>
      authorizePublicWebsiteAccess({
        supabase: prospectClient({
          id: 'prospect-a',
          tenant_id: 'tenant-a',
          website_id: 'site-a',
          preview_token_hash: minted.hash,
          preview_expires_at: minted.expiresAt.toISOString(),
          preview_revoked_at: new Date().toISOString(),
        }),
        website: { id: 'site-a', tenant_id: 'tenant-a', is_published: false },
        previewRaw: minted.token,
      }),
    )
  })

  it('denies token A against website B / tenant B', async () => {
    const { authorizePublicWebsiteAccess } = await import('../website-preview-access')
    const tokenA = mintWebsitePreviewToken()
    await expectDenied(() =>
      authorizePublicWebsiteAccess({
        supabase: prospectClient({
          id: 'prospect-b',
          tenant_id: 'tenant-b',
          website_id: 'site-b',
          preview_token_hash: mintWebsitePreviewToken().hash,
          preview_expires_at: tokenA.expiresAt.toISOString(),
          preview_revoked_at: null,
        }),
        website: { id: 'site-b', tenant_id: 'tenant-b', is_published: false },
        previewRaw: tokenA.token,
      }),
    )
  })

  it('denies a token whose stored prospect is bound to a different website or tenant', async () => {
    const { authorizePublicWebsiteAccess } = await import('../website-preview-access')
    const minted = mintWebsitePreviewToken()
    await expectDenied(() =>
      authorizePublicWebsiteAccess({
        supabase: prospectClient({
          id: 'prospect-a',
          tenant_id: 'tenant-a',
          website_id: 'site-other',
          preview_token_hash: minted.hash,
          preview_expires_at: minted.expiresAt.toISOString(),
          preview_revoked_at: null,
        }),
        website: { id: 'site-a', tenant_id: 'tenant-a', is_published: false },
        previewRaw: minted.token,
      }),
    )
    await expectDenied(() =>
      authorizePublicWebsiteAccess({
        supabase: prospectClient({
          id: 'prospect-a',
          tenant_id: 'tenant-other',
          website_id: 'site-a',
          preview_token_hash: minted.hash,
          preview_expires_at: minted.expiresAt.toISOString(),
          preview_revoked_at: null,
        }),
        website: { id: 'site-a', tenant_id: 'tenant-a', is_published: false },
        previewRaw: minted.token,
      }),
    )
  })

  it('denies missing prospect binding and does not distinguish deleted rows', async () => {
    const { authorizePublicWebsiteAccess } = await import('../website-preview-access')
    await expectDenied(() =>
      authorizePublicWebsiteAccess({
        supabase: prospectClient(null),
        website: { id: 'site-a', tenant_id: 'tenant-a', is_published: false },
        previewRaw: mintWebsitePreviewToken().token,
      }),
    )
  })

  it('denies a foreign-tenant session even for a superadmin-shaped caller', async () => {
    const { authorizePublicWebsiteAccess } = await import('../website-preview-access')
    mocks.getAuthenticatedUser.mockResolvedValue({ tenant_id: 'tenant-admin' })
    await expectDenied(() =>
      authorizePublicWebsiteAccess({
        event: { node: { req: {} } } as any,
        supabase: prospectClient(null),
        website: { id: 'site-a', tenant_id: 'tenant-a', is_published: false },
        previewRaw: '1',
      }),
    )
  })

  it('allows the authenticated same-tenant editor path when a preview query is present', async () => {
    const { authorizePublicWebsiteAccess } = await import('../website-preview-access')
    mocks.getAuthenticatedUser.mockResolvedValue({ tenant_id: 'tenant-a' })
    const access = await authorizePublicWebsiteAccess({
      event: { node: { req: {} } } as any,
      supabase: prospectClient(null),
      website: { id: 'site-a', tenant_id: 'tenant-a', is_published: false },
      previewRaw: '1',
    })
    expect(access).toEqual({ preview: true, prospectId: null })
  })

  it('does not allow same-tenant session to turn a live URL into unpublished preview', async () => {
    const { authorizePublicWebsiteAccess } = await import('../website-preview-access')
    mocks.getAuthenticatedUser.mockResolvedValue({ tenant_id: 'tenant-a' })
    await expectDenied(() =>
      authorizePublicWebsiteAccess({
        event: { node: { req: {} } } as any,
        supabase: prospectClient(null),
        website: { id: 'site-a', tenant_id: 'tenant-a', is_published: false },
        previewRaw: undefined,
      }),
    )
  })
})
