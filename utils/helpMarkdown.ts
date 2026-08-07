import DOMPurify from 'isomorphic-dompurify'

export type HelpRole = 'client' | 'staff' | 'admin'

export interface HelpArticleMeta {
  title: string
  summary: string
  order: number
  role: HelpRole
  slug: string
  path: string
}

export interface HelpArticle extends HelpArticleMeta {
  body: string
  html: string
}

interface Frontmatter {
  title?: string
  summary?: string
  order?: number | string
}

function parseFrontmatter(raw: string): { meta: Frontmatter; body: string } {
  const trimmed = raw.replace(/^\uFEFF/, '')
  if (!trimmed.startsWith('---')) {
    return { meta: {}, body: trimmed.trim() }
  }

  const end = trimmed.indexOf('\n---', 3)
  if (end === -1) {
    return { meta: {}, body: trimmed.trim() }
  }

  const fmBlock = trimmed.slice(3, end).trim()
  const body = trimmed.slice(end + 4).trim()
  const meta: Frontmatter = {}

  for (const line of fmBlock.split('\n')) {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/)
    if (!match) continue
    const key = match[1]
    let value = match[2].trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (key === 'order') {
      meta.order = Number(value) || 0
    } else if (key === 'title') {
      meta.title = value
    } else if (key === 'summary') {
      meta.summary = value
    }
  }

  return { meta, body }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function inlineFormat(text: string): string {
  let out = escapeHtml(text)
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>')
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  out = out.replace(/\*([^*]+)\*/g, '<em>$1</em>')
  out = out.replace(
    /\[([^\]]+)\]\((https?:\/\/[^)\s]+|\/[^)\s]*)\)/g,
    '<a href="$2" class="help-link">$1</a>'
  )
  return out
}

function calloutClass(title: string): string | null {
  const t = title.trim().toLowerCase()
  if (t.startsWith('tipp')) return 'help-callout help-callout--tip'
  if (t.startsWith('hinweis') || t.startsWith('gut zu wissen')) return 'help-callout help-callout--note'
  if (t.startsWith('wichtig') || t.startsWith('voraussetzung')) return 'help-callout help-callout--warn'
  return null
}

function isTableSep(line: string): boolean {
  const cells = line.split('|').slice(1, -1).map((c) => c.trim())
  return cells.length > 0 && cells.every((c) => /^:?-+:?$/.test(c))
}

function splitTableRow(line: string): string[] {
  return line.split('|').slice(1, -1).map((c) => c.trim())
}

/** Minimal Markdown → HTML for help articles (headings, lists, paragraphs, inline). */
export function renderHelpMarkdown(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const html: string[] = []
  let inUl = false
  let inOl = false
  let inCallout = false
  let inTable = false
  let paragraph: string[] = []
  let skipNextH1 = true

  const flushParagraph = () => {
    if (!paragraph.length) return
    html.push(`<p>${inlineFormat(paragraph.join(' '))}</p>`)
    paragraph = []
  }

  const closeLists = () => {
    if (inUl) {
      html.push('</ul>')
      inUl = false
    }
    if (inOl) {
      html.push('</ol>')
      inOl = false
    }
  }

  const closeCallout = () => {
    if (!inCallout) return
    html.push('</aside>')
    inCallout = false
  }

  const closeTable = () => {
    if (!inTable) return
    html.push('</tbody></table>')
    inTable = false
  }

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim()

    if (!trimmed) {
      flushParagraph()
      closeLists()
      continue
    }

    if (trimmed.startsWith('|') && trimmed.includes('|', 1)) {
      flushParagraph()
      closeLists()
      if (isTableSep(trimmed)) continue
      const cells = splitTableRow(trimmed)
      if (!inTable) {
        closeCallout()
        html.push('<table class="help-table"><thead><tr>')
        for (const c of cells) html.push(`<th>${inlineFormat(c)}</th>`)
        html.push('</tr></thead><tbody>')
        inTable = true
      } else {
        html.push('<tr>')
        for (const c of cells) html.push(`<td>${inlineFormat(c)}</td>`)
        html.push('</tr>')
      }
      continue
    }

    if (inTable) closeTable()

    const heading = trimmed.match(/^(#{1,3})\s+(.+)$/)
    if (heading) {
      flushParagraph()
      closeLists()
      const level = heading[1].length
      const title = heading[2]

      if (level === 1 && skipNextH1) {
        skipNextH1 = false
        continue
      }
      skipNextH1 = false

      const callout = level === 2 ? calloutClass(title) : null
      closeCallout()
      if (callout) {
        html.push(`<aside class="${callout}">`)
        html.push(`<h2 class="help-callout-title">${inlineFormat(title)}</h2>`)
        inCallout = true
      } else {
        html.push(`<h${level}>${inlineFormat(title)}</h${level}>`)
      }
      continue
    }

    const ul = trimmed.match(/^[-*]\s+(.+)$/)
    if (ul) {
      flushParagraph()
      if (inOl) {
        html.push('</ol>')
        inOl = false
      }
      if (!inUl) {
        html.push('<ul class="help-ul">')
        inUl = true
      }
      html.push(`<li>${inlineFormat(ul[1])}</li>`)
      continue
    }

    const ol = trimmed.match(/^\d+\.\s+(.+)$/)
    if (ol) {
      flushParagraph()
      if (inUl) {
        html.push('</ul>')
        inUl = false
      }
      if (!inOl) {
        html.push('<ol class="help-ol">')
        inOl = true
      }
      html.push(`<li>${inlineFormat(ol[1])}</li>`)
      continue
    }

    closeLists()
    paragraph.push(trimmed)
  }

  flushParagraph()
  closeLists()
  closeCallout()
  closeTable()

  return DOMPurify.sanitize(html.join('\n'), {
    ALLOWED_TAGS: [
      'h1', 'h2', 'h3', 'p', 'ul', 'ol', 'li', 'strong', 'em', 'code', 'a', 'br',
      'aside', 'table', 'thead', 'tbody', 'tr', 'th', 'td'
    ],
    ALLOWED_ATTR: ['href', 'class', 'target', 'rel']
  })
}

export function parseHelpMarkdown(
  raw: string,
  role: HelpRole,
  slug: string,
  path: string
): HelpArticle {
  const { meta, body } = parseFrontmatter(raw)
  const title = meta.title?.trim() || slug
  const summary = meta.summary?.trim() || ''
  const order = typeof meta.order === 'number' ? meta.order : Number(meta.order) || 100

  return {
    title,
    summary,
    order,
    role,
    slug,
    path,
    body,
    html: renderHelpMarkdown(body)
  }
}
