import { createRequire } from 'node:module'

const REGLEMENT_TAGS = [
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'br', 'hr', 'ul', 'ol', 'li',
  'a', 'strong', 'em', 'b', 'i', 'u',
  'span', 'div', 'section',
  'table', 'tr', 'td', 'th', 'thead', 'tbody',
]

const REGLEMENT_ATTR = ['href', 'target', 'rel', 'class', 'id']

type PurifyLike = {
  sanitize: (html: string, config?: Record<string, unknown>) => string
}

/**
 * DOMPurify is loaded on first use. A top-level import evaluates jsdom while
 * the Nitro route module loads. If that evaluation throws, the handler never
 * reaches its own 400/404 branches, so the load stays inside the first call.
 */
let purifyState: { loaded: true; purify: PurifyLike | null } | undefined

function defaultLoadPurify(): PurifyLike | null {
  const require = createRequire(import.meta.url)
  const mod = require('isomorphic-dompurify') as { default?: PurifyLike } & PurifyLike
  const candidate = mod?.default && typeof mod.default.sanitize === 'function' ? mod.default : mod
  return candidate && typeof candidate.sanitize === 'function' ? candidate : null
}

let loadPurifyImpl: () => PurifyLike | null = defaultLoadPurify

function loadPurify(): PurifyLike | null {
  if (purifyState?.loaded) return purifyState.purify
  try {
    const purify = loadPurifyImpl()
    purifyState = { loaded: true, purify }
    return purify
  } catch {
    purifyState = { loaded: true, purify: null }
    return null
  }
}

/** Test-only. Production keeps the deferred isomorphic-dompurify loader. */
export function setTenantHtmlSanitizerLoaderForTests(next: (() => PurifyLike | null) | null) {
  purifyState = undefined
  loadPurifyImpl = next || defaultLoadPurify
}

export type TenantHtmlSanitizeResult =
  | { ok: true; html: string }
  | { ok: false }

/** Sanitized HTML, or ok:false when DOMPurify cannot run. Never returns the input unchanged. */
export function trySanitizeTenantHtml(html: string | null | undefined): TenantHtmlSanitizeResult {
  if (!html) return { ok: true, html: '' }
  const purify = loadPurify()
  if (!purify) return { ok: false }
  try {
    return {
      ok: true,
      html: purify.sanitize(html, {
        ALLOWED_TAGS: REGLEMENT_TAGS,
        ALLOWED_ATTR: REGLEMENT_ATTR,
      }),
    }
  } catch {
    return { ok: false }
  }
}

export function sanitizeTenantHtml(html: string | null | undefined): string {
  const result = trySanitizeTenantHtml(html)
  return result.ok ? result.html : ''
}

export function sanitizeSvgMarkup(svg: string | null | undefined): string {
  if (!svg) return ''
  const purify = loadPurify()
  if (!purify) return ''
  try {
    return purify.sanitize(svg, { USE_PROFILES: { svg: true } })
  } catch {
    return ''
  }
}

/** Test-only reset so a failed init in one case does not stick for the next. */
export function resetTenantHtmlSanitizerForTests() {
  purifyState = undefined
  loadPurifyImpl = defaultLoadPurify
}
