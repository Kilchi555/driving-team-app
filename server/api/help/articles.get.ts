import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import {
  parseHelpMarkdown,
  type HelpArticle,
  type HelpRole
} from '~/utils/helpMarkdown'

const ROLES: HelpRole[] = ['client', 'staff', 'admin']

/**
 * GET /api/help/articles
 * Reads Markdown help articles from content/help/{role}/*.md on disk.
 */
export default defineEventHandler(async (): Promise<HelpArticle[]> => {
  const baseDir = join(process.cwd(), 'content', 'help')
  const articles: HelpArticle[] = []

  for (const role of ROLES) {
    const dir = join(baseDir, role)
    let files: string[] = []
    try {
      files = await readdir(dir)
    } catch {
      continue
    }

    for (const file of files) {
      if (!file.endsWith('.md') || file === 'README.md') continue
      const slug = file.replace(/\.md$/, '')
      const raw = await readFile(join(dir, file), 'utf8')
      articles.push(parseHelpMarkdown(raw, role, slug, `content/help/${role}/${file}`))
    }
  }

  articles.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, 'de'))
  return articles
})
