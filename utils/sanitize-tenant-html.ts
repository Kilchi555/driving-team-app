import { createRequire } from 'node:module'

/**
 * isomorphic-dompurify's Node entry constructs JSDOM while the module is
 * evaluated. Importing it from a Nitro route crashes that route before the
 * handler can validate the request. Load it on first use instead.
 */
const require = createRequire(import.meta.url)

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

let cached: PurifyLike | null = null
let initFailed = false

function loadPurify(): PurifyLike {
  if (cached) return cached
  if (initFailed) {
    throw new Error('HTML sanitizer is unavailable')
  }
  try {
    const loaded = require('isomorphic-dompurify') as PurifyLike & { default?: PurifyLike }
    const impl = typeof loaded.sanitize === 'function' ? loaded : loaded.default
    if (!impl || typeof impl.sanitize !== 'function') {
      throw new Error('HTML sanitizer is unavailable')
    }
    cached = impl
    return impl
  } catch (err) {
    initFailed = true
    cached = null
    throw err instanceof Error ? err : new Error('HTML sanitizer is unavailable')
  }
}

export function sanitizeTenantHtml(html: string | null | undefined): string {
  if (!html) return ''
  return loadPurify().sanitize(html, {
    ALLOWED_TAGS: REGLEMENT_TAGS,
    ALLOWED_ATTR: REGLEMENT_ATTR,
  })
}

export function sanitizeSvgMarkup(svg: string | null | undefined): string {
  if (!svg) return ''
  return loadPurify().sanitize(svg, { USE_PROFILES: { svg: true } })
}
