import DOMPurify from 'dompurify'

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

type NodeModuleBuiltin = {
  createRequire: (filename: string) => (id: string) => unknown
}

/**
 * Browser code imports this module. It must not statically import node:module,
 * jsdom, or isomorphic-dompurify: the Node entry of that package builds a
 * JSDOM window while the module evaluates, and Vite cannot bundle node:module
 * for the client.
 *
 * On the server, isomorphic-dompurify is required only inside the first
 * sanitize call. A missing type check on the legal route never reaches it.
 */
let purifyState: { loaded: true; purify: PurifyLike | null } | undefined

function asPurify(value: unknown, windowRef?: unknown): PurifyLike | null {
  if (value && typeof (value as PurifyLike).sanitize === 'function') return value as PurifyLike
  if (typeof value === 'function' && windowRef) {
    const created = (value as (root: unknown) => unknown)(windowRef)
    if (created && typeof (created as PurifyLike).sanitize === 'function') return created as PurifyLike
  }
  return null
}

function loadBrowserPurify(): PurifyLike | null {
  if (typeof window === 'undefined' || typeof document === 'undefined') return null
  return asPurify(DOMPurify, window)
}

function loadNodePurify(): PurifyLike | null {
  const getBuiltin = (process as { getBuiltinModule?: (name: string) => NodeModuleBuiltin }).getBuiltinModule
  const builtin = getBuiltin?.('module')
  if (!builtin?.createRequire) return null
  const nodeRequire = builtin.createRequire(import.meta.url)
  const mod = nodeRequire('isomorphic-dompurify') as { default?: PurifyLike } & PurifyLike
  const candidate = mod?.default && typeof mod.default.sanitize === 'function' ? mod.default : mod
  return candidate && typeof candidate.sanitize === 'function' ? candidate : null
}

function defaultLoadPurify(): PurifyLike | null {
  if (typeof window !== 'undefined' && typeof document !== 'undefined') return loadBrowserPurify()
  return loadNodePurify()
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

/** Test-only. Production keeps the deferred loader. */
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
