import { resolveWebsiteSeoContext } from '~/server/utils/website-seo-context'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
  setHeader(event, 'Cache-Control', 'public, max-age=300')

  const ctx = await resolveWebsiteSeoContext(event)
  if (!ctx) {
    throw createError({ statusCode: 404, statusMessage: 'llms.txt not found' })
  }

  const pages = ctx.pages
    .map((p) => {
      const path = p.is_home || p.slug === 'index' ? '/' : `/${p.slug}`
      return `- [${p.title}](${ctx.baseUrl}${path}): ${p.page_type || 'page'}`
    })
    .join('\n')

  return `# ${ctx.name}

> ${ctx.seo_description || ctx.seo_title || `${ctx.name} — Online-Terminbuchung Schweiz`}

## Site
- Home: ${ctx.baseUrl}/
- Booking: integrated on pages via Simy

## Pages
${pages || `- Home: ${ctx.baseUrl}/`}

## Notes
- Language: de-CH
- Formal address may be Sie or du depending on tenant settings
- Live Google reviews may appear on the home page
`
})
