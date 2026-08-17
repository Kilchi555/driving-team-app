import { marked } from 'marked'

marked.use({ gfm: true, breaks: false })

export interface BlogArticle {
  title: string
  seoTitle?: string
  description: string
  slug: string
  date: string
  dateModified?: string
  author?: string
  category?: string
  image?: string
  ogImage?: string
  keywords?: string
  readingTime?: number
  lang?: string
  html: string
}

const files = import.meta.glob('../content/blog/*.md', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>

function parseFrontmatter(raw: string): { data: Record<string, string>; body: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/)
  if (!match) return { data: {}, body: raw }

  const data: Record<string, string> = {}
  for (const line of match[1].split('\n')) {
    const idx = line.indexOf(':')
    if (idx === -1) continue
    const key = line.slice(0, idx).trim()
    let value = line.slice(idx + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    data[key] = value
  }
  return { data, body: match[2] }
}

function toArticle(raw: string): BlogArticle | null {
  const { data, body } = parseFrontmatter(raw)
  if (!data.slug || !data.title) return null
  return {
    title: data.title,
    seoTitle: data.seoTitle,
    description: data.description || '',
    slug: data.slug,
    date: data.date || '',
    dateModified: data.dateModified,
    author: data.author,
    category: data.category,
    image: data.image,
    ogImage: data.ogImage,
    keywords: data.keywords,
    readingTime: data.readingTime ? Number(data.readingTime) : undefined,
    lang: data.lang,
    html: marked.parse(body, { async: false }) as string,
  }
}

const articles: BlogArticle[] = Object.values(files)
  .map(toArticle)
  .filter((a): a is BlogArticle => !!a)
  .sort((a, b) => (a.date < b.date ? 1 : -1))

export function listBlogArticles(): BlogArticle[] {
  return articles
}

export function getBlogArticle(slug: string): BlogArticle | undefined {
  const clean = String(slug || '').replace(/\/+$/, '')
  return articles.find(a => a.slug === clean)
}
