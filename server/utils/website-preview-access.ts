/**
 * Public unpublished-website authorization.
 * Resolves website → tenant → prospect from the database. Never trusts
 * a client-supplied tenant_id / website_id / prospect_id.
 */
import type { H3Event } from 'h3'
import { createError } from 'h3'
import {
  parseWebsitePreviewToken,
  verifyWebsitePreviewToken,
} from '~/server/utils/website-preview-token'

export type PublicWebsiteAccessRow = {
  id: string
  tenant_id: string
  subdomain?: string | null
  is_published: boolean | null
}

export type WebsitePreviewAccess = {
  preview: boolean
  prospectId: string | null
}

type ProspectPreviewRow = {
  id: string
  tenant_id: string | null
  website_id: string | null
  preview_token_hash: string | null
  preview_expires_at: string | null
  preview_revoked_at: string | null
}

export function denyPublicWebsite(): never {
  throw createError({ statusCode: 404, statusMessage: 'Website not found' })
}

export function hasWebsitePreviewIntent(raw: unknown): boolean {
  const value = Array.isArray(raw) ? raw[0] : raw
  if (value == null || value === false) return false
  return String(value).trim().length > 0
}

async function loadBoundProspect(
  supabase: { from: (table: string) => any },
  website: PublicWebsiteAccessRow,
): Promise<ProspectPreviewRow | null> {
  if (!website.id || !website.tenant_id) return null
  const { data, error } = await supabase
    .from('website_prospects')
    .select('id, tenant_id, website_id, preview_token_hash, preview_expires_at, preview_revoked_at')
    .eq('website_id', website.id)
    .eq('tenant_id', website.tenant_id)
    .maybeSingle()
  if (error || !data) return null
  return data as ProspectPreviewRow
}

function prospectMatchesWebsite(prospect: ProspectPreviewRow, website: PublicWebsiteAccessRow) {
  return prospect.website_id === website.id && prospect.tenant_id === website.tenant_id
}

async function hasSameTenantWebsiteSession(event: H3Event | undefined, tenantId: string) {
  if (!event || !tenantId) return false
  try {
    const { getAuthenticatedUser } = await import('~/server/utils/auth')
    const user = await getAuthenticatedUser(event)
    const userTenant = String(user?.tenant_id || '')
    return !!userTenant && userTenant === tenantId
  } catch {
    return false
  }
}

export async function authorizePublicWebsiteAccess(opts: {
  event?: H3Event
  supabase: { from: (table: string) => any }
  website: PublicWebsiteAccessRow | null | undefined
  previewRaw: unknown
  now?: Date
}): Promise<WebsitePreviewAccess> {
  const website = opts.website
  if (!website?.id || !website.tenant_id) denyPublicWebsite()

  if (website.is_published) {
    return { preview: false, prospectId: null }
  }

  const token = parseWebsitePreviewToken(opts.previewRaw)
  if (token) {
    const prospect = await loadBoundProspect(opts.supabase, website)
    if (
      prospect &&
      prospectMatchesWebsite(prospect, website) &&
      verifyWebsitePreviewToken(token, prospect, opts.now).ok
    ) {
      return { preview: true, prospectId: prospect.id }
    }
  }

  // Authenticated same-tenant editor path. Not a public preview=1 bypass
  // and not a superadmin exception on the public API.
  if (hasWebsitePreviewIntent(opts.previewRaw)) {
    const sameTenant = await hasSameTenantWebsiteSession(opts.event, website.tenant_id)
    if (sameTenant) {
      return { preview: true, prospectId: null }
    }
  }

  denyPublicWebsite()
}

export async function loadAuthorizedPublicWebsite<T extends PublicWebsiteAccessRow>(opts: {
  event: H3Event
  supabase: { from: (table: string) => any }
  subdomain: string
  columns: string
  now?: Date
}): Promise<{ website: T; preview: boolean; prospectId: string | null; subdomain: string }> {
  const subdomain = String(opts.subdomain || '').trim().toLowerCase()
  if (!subdomain) {
    throw createError({ statusCode: 400, statusMessage: 'subdomain required' })
  }

  const { data: website, error } = await opts.supabase
    .from('website_tenants')
    .select(opts.columns)
    .eq('subdomain', subdomain)
    .maybeSingle()

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }
  if (!website) denyPublicWebsite()

  const access = await authorizePublicWebsiteAccess({
    event: opts.event,
    supabase: opts.supabase,
    website: website as T,
    previewRaw: getQuery(opts.event).preview,
    now: opts.now,
  })

  return {
    website: website as T,
    preview: access.preview,
    prospectId: access.prospectId,
    subdomain,
  }
}
