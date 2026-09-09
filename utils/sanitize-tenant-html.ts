import DOMPurify from 'isomorphic-dompurify'

const REGLEMENT_TAGS = [
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'br', 'hr', 'ul', 'ol', 'li',
  'a', 'strong', 'em', 'b', 'i', 'u',
  'span', 'div', 'section',
  'table', 'tr', 'td', 'th', 'thead', 'tbody',
]

const REGLEMENT_ATTR = ['href', 'target', 'rel', 'class', 'id']

export function sanitizeTenantHtml(html: string | null | undefined): string {
  if (!html) return ''
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: REGLEMENT_TAGS,
    ALLOWED_ATTR: REGLEMENT_ATTR,
  })
}

export function sanitizeSvgMarkup(svg: string | null | undefined): string {
  if (!svg) return ''
  return DOMPurify.sanitize(svg, { USE_PROFILES: { svg: true } })
}
