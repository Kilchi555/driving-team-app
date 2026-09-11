/**
 * Tenant Open Graph tags for WhatsApp / iMessage / Slack previews.
 * The product app is SPA (`routeRules['/**'].ssr = false`), so crawlers would
 * otherwise only see the platform defaults from nuxt.config.
 */
import { getTerminologyDefaults } from '~/composables/useTerminology'
import { getBrandingCache } from '~/server/utils/branding-cache'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { buildLocalSeoDefaults, resolveWebsiteCity } from '~/server/utils/website-local-seo'
import { isLinkPreviewCrawler, isSkippedTenantOgPath } from '~/utils/link-preview-crawler'
import { resolvePublicTenantRef, type PublicTenantRef } from '~/utils/public-paths'

const OG_CACHE_TTL_MS = 5 * 60_000
const ogCache = new Map<string, { expiresAt: number; data: TenantOgSource | null }>()

const TENANT_OG_SELECT = [
  'id',
  'name',
  'slug',
  'brand_name',
  'brand_tagline',
  'brand_description',
  'meta_description',
  'meta_keywords',
  'primary_color',
  'secondary_color',
  'accent_color',
  'logo_url',
  'logo_wide_url',
  'logo_square_url',
  'business_type',
  'address',
  'invoice_city',
].join(', ')

export type TenantOgSource = {
  id?: string | null
  name: string
  slug: string
  brand_name?: string | null
  brand_tagline?: string | null
  brand_description?: string | null
  meta_description?: string | null
  meta_keywords?: string | string[] | null
  primary_color?: string | null
  secondary_color?: string | null
  accent_color?: string | null
  logo_url?: string | null
  logo_wide_url?: string | null
  logo_square_url?: string | null
  business_type?: string | null
  address?: string | null
  invoice_city?: string | null
}

export type TenantOgTags = {
  title: string
  description: string
  siteName: string
  url: string
  image: string
  imageAlt: string
}

export type TenantOgCardInput = {
  title: string
  subtitle: string
  brand: string
  primary?: string
  secondary?: string
  accent?: string
  logoUrl?: string | null
}

function escapeHtml(text: string): string {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function sliceChars(s: string, max: number) {
  const t = s.trim()
  if (t.length <= max) return t
  return `${t.slice(0, Math.max(0, max - 1)).trim()}…`
}

function brandNameOf(source: TenantOgSource): string {
  return String(source.brand_name || source.name || '').trim() || source.slug
}

export function tenantOgImagePath(slug: string): string {
  return `/api/public/tenant/${encodeURIComponent(slug)}/og.png`
}

export function httpLogoUrl(url?: string | null): string | null {
  const value = String(url || '').trim()
  if (/^https?:\/\//i.test(value)) return value
  return null
}

export function buildTenantOgCardInput(source: TenantOgSource): TenantOgCardInput {
  const tags = buildTenantOgTags(source, {
    origin: 'https://app.simy.ch',
    canonicalUrl: `https://app.simy.ch/${source.slug}`,
  })
  return {
    title: tags.siteName,
    subtitle: tags.description,
    brand: tags.siteName,
    primary: source.primary_color || undefined,
    secondary: source.secondary_color || undefined,
    accent: source.accent_color || undefined,
    logoUrl:
      httpLogoUrl(source.logo_wide_url) ||
      httpLogoUrl(source.logo_url) ||
      httpLogoUrl(source.logo_square_url),
  }
}

export function buildTenantOgTags(
  source: TenantOgSource,
  opts: { origin: string; canonicalUrl: string },
): TenantOgTags {
  const name = brandNameOf(source)
  const terms = getTerminologyDefaults(source.business_type)
  const tagline = String(source.brand_tagline || '').trim()
  const title = sliceChars(tagline ? `${name} – ${tagline}` : `${name} – ${terms.bookAction}`, 70)

  const local = buildLocalSeoDefaults({
    name,
    business_type: source.business_type,
    city: resolveWebsiteCity(source) || null,
    address: source.address,
  })

  const description = sliceChars(
    String(source.meta_description || source.brand_description || local.description || '').trim() ||
      `${name}: ${terms.appointmentsPlural} online buchen.`,
    160,
  )

  const origin = opts.origin.replace(/\/$/, '')
  return {
    title,
    description,
    siteName: name,
    url: opts.canonicalUrl,
    image: `${origin}${tenantOgImagePath(source.slug)}`,
    imageAlt: `${name} – ${terms.bookAction}`,
  }
}

function sourceFromCachedBranding(data: any, slug: string): TenantOgSource | null {
  if (!data || typeof data !== 'object') return null
  const resolvedSlug = String(data.slug || slug || '').trim()
  const name = String(data.name || data.brand_name || '').trim()
  if (!resolvedSlug || !name) return null
  return {
    id: data.id,
    name,
    slug: resolvedSlug,
    brand_name: data.brand_name,
    brand_tagline: data.brand_tagline,
    brand_description: data.brand_description,
    meta_description: data.meta_description,
    meta_keywords: data.meta_keywords,
    primary_color: data.primary_color,
    secondary_color: data.secondary_color,
    accent_color: data.accent_color,
    logo_url: data.logo_url,
    logo_wide_url: data.logo_wide_url,
    logo_square_url: data.logo_square_url,
    business_type: data.business_type,
    address: data.address,
    invoice_city: data.invoice_city,
  }
}

export async function loadTenantOgSource(slug: string): Promise<TenantOgSource | null> {
  const key = slug.toLowerCase()
  const hit = ogCache.get(key)
  if (hit && hit.expiresAt > Date.now()) return hit.data

  const fromBranding = sourceFromCachedBranding(getBrandingCache(`slug:${key}`), key)
  if (fromBranding) {
    ogCache.set(key, { data: fromBranding, expiresAt: Date.now() + OG_CACHE_TTL_MS })
    return fromBranding
  }

  try {
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('tenants')
      .select(TENANT_OG_SELECT)
      .eq('slug', key)
      .eq('is_active', true)
      .maybeSingle()

    if (error || !data) {
      ogCache.set(key, { data: null, expiresAt: Date.now() + 30_000 })
      return null
    }

    const source = sourceFromCachedBranding(data, key)
    ogCache.set(key, { data: source, expiresAt: Date.now() + OG_CACHE_TTL_MS })
    return source
  } catch {
    return null
  }
}

export function resolveRequestOrigin(event: {
  node: { req: { headers: Record<string, string | string[] | undefined> } }
}): string {
  const headers = event.node.req.headers
  const host = String(headers['x-forwarded-host'] || headers.host || 'app.simy.ch')
    .split(',')[0]
    .trim()
  const proto = String(headers['x-forwarded-proto'] || 'https')
    .split(',')[0]
    .trim() || 'https'
  return `${proto}://${host}`
}

export function canonicalUrlForEvent(
  origin: string,
  pathname: string,
  search = '',
): string {
  const path = pathname.startsWith('/') ? pathname : `/${pathname}`
  return `${origin.replace(/\/$/, '')}${path}${search || ''}`
}

function upsertMeta(html: string, attr: 'property' | 'name', key: string, content: string): string {
  const tag = `<meta ${attr}="${key}" content="${escapeHtml(content)}">`
  const re = new RegExp(
    `<meta\\s[^>]*(?:${attr}\\s*=\\s*["']${key}["']|${attr}\\s*=\\s*${key})[^>]*>`,
    'i',
  )
  if (re.test(html)) return html.replace(re, tag)
  if (/<\/head>/i.test(html)) return html.replace(/<\/head>/i, `  ${tag}\n</head>`)
  return `${html}\n${tag}`
}

function upsertTitle(html: string, title: string): string {
  const safe = escapeHtml(title)
  if (/<title\b[^>]*>[\s\S]*?<\/title>/i.test(html)) {
    return html.replace(/<title\b[^>]*>[\s\S]*?<\/title>/i, `<title>${safe}</title>`)
  }
  if (/<\/head>/i.test(html)) return html.replace(/<\/head>/i, `  <title>${safe}</title>\n</head>`)
  return html
}

function upsertCanonical(html: string, href: string): string {
  const tag = `<link rel="canonical" href="${escapeHtml(href)}">`
  const re = /<link\s[^>]*rel\s*=\s*["']canonical["'][^>]*>/i
  if (re.test(html)) return html.replace(re, tag)
  if (/<\/head>/i.test(html)) return html.replace(/<\/head>/i, `  ${tag}\n</head>`)
  return html
}

/** Replace or insert OG/Twitter tags in an HTML document or a `<head>` fragment. */
export function applyTenantOgTags(html: string, tags: TenantOgTags): string {
  let out = html
  out = upsertTitle(out, tags.title)
  out = upsertMeta(out, 'name', 'description', tags.description)
  out = upsertMeta(out, 'property', 'og:title', tags.title)
  out = upsertMeta(out, 'property', 'og:description', tags.description)
  out = upsertMeta(out, 'property', 'og:type', 'website')
  out = upsertMeta(out, 'property', 'og:site_name', tags.siteName)
  out = upsertMeta(out, 'property', 'og:locale', 'de_CH')
  out = upsertMeta(out, 'property', 'og:url', tags.url)
  out = upsertMeta(out, 'property', 'og:image', tags.image)
  out = upsertMeta(out, 'property', 'og:image:secure_url', tags.image)
  out = upsertMeta(out, 'property', 'og:image:width', '1200')
  out = upsertMeta(out, 'property', 'og:image:height', '630')
  out = upsertMeta(out, 'property', 'og:image:alt', tags.imageAlt)
  out = upsertMeta(out, 'property', 'og:image:type', 'image/png')
  out = upsertMeta(out, 'name', 'twitter:card', 'summary_large_image')
  out = upsertMeta(out, 'name', 'twitter:title', tags.title)
  out = upsertMeta(out, 'name', 'twitter:description', tags.description)
  out = upsertMeta(out, 'name', 'twitter:image', tags.image)
  out = upsertCanonical(out, tags.url)
  return out
}

export function buildTenantOgHtml(tags: TenantOgTags): string {
  return applyTenantOgTags(
    `<!DOCTYPE html>
<html lang="de-CH">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
</head>
<body>
  <p><a href="${escapeHtml(tags.url)}">${escapeHtml(tags.siteName)}</a></p>
</body>
</html>
`,
    tags,
  )
}

export function applyTenantOgToHeadChunks(head: string[], tags: TenantOgTags): string[] {
  const rewritten = applyTenantOgTags(head.join('\n'), tags)
  return [rewritten]
}

export function shouldServeTenantOgStub(opts: {
  method?: string | null
  pathname: string
  userAgent?: string | null
  query?: Record<string, unknown> | URLSearchParams | null
}): boolean {
  const method = String(opts.method || 'GET').toUpperCase()
  if (method !== 'GET' && method !== 'HEAD') return false
  if (isSkippedTenantOgPath(opts.pathname)) return false
  if (!isLinkPreviewCrawler(opts.userAgent)) return false
  return tenantRefForOg(opts.pathname, opts.query)?.surface === 'app'
}

export function tenantRefForOg(pathname: string, query?: Record<string, unknown> | URLSearchParams | null): PublicTenantRef | null {
  if (isSkippedTenantOgPath(pathname)) return null
  return resolvePublicTenantRef(pathname, query)
}
