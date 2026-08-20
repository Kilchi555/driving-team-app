import { SIMY_BASE } from '~/utils/schema'

export default defineEventHandler((event) => {
  const routes: { path: string; priority: string; changefreq: string }[] = [
    { path: '/', priority: '1.0', changefreq: 'weekly' },
    { path: '/branchen', priority: '0.95', changefreq: 'weekly' },
    { path: '/vergleich', priority: '0.95', changefreq: 'weekly' },
    { path: '/vergleich/calendly-alternative', priority: '0.9', changefreq: 'monthly' },
    { path: '/vergleich/terminli', priority: '0.9', changefreq: 'monthly' },
    { path: '/vergleich/klara', priority: '0.9', changefreq: 'monthly' },
    { path: '/vergleich/simplybook', priority: '0.9', changefreq: 'monthly' },
    { path: '/preise', priority: '0.9', changefreq: 'monthly' },
    { path: '/demo', priority: '0.9', changefreq: 'monthly' },
    { path: '/fahrschule', priority: '0.95', changefreq: 'monthly' },
    { path: '/fahrschule/software', priority: '0.8', changefreq: 'monthly' },
    { path: '/fahrschule/buchungssystem', priority: '0.8', changefreq: 'monthly' },
    { path: '/fahrschule/app', priority: '0.8', changefreq: 'monthly' },
    { path: '/coaching', priority: '0.9', changefreq: 'weekly' },
    { path: '/consulting', priority: '0.9', changefreq: 'weekly' },
    { path: '/personal-training', priority: '0.9', changefreq: 'weekly' },
    { path: '/nachhilfe', priority: '0.9', changefreq: 'weekly' },
    { path: '/musikschule', priority: '0.9', changefreq: 'weekly' },
    { path: '/hundeschule', priority: '0.9', changefreq: 'weekly' },
    { path: '/massage', priority: '0.9', changefreq: 'weekly' },
    { path: '/marketing', priority: '0.8', changefreq: 'monthly' },
    { path: '/marketing/google-ads', priority: '0.8', changefreq: 'monthly' },
    { path: '/marketing/seo', priority: '0.8', changefreq: 'monthly' },
    { path: '/website', priority: '0.95', changefreq: 'weekly' },
    { path: '/features/kalender', priority: '0.7', changefreq: 'monthly' },
    { path: '/features/rechnungen', priority: '0.7', changefreq: 'monthly' },
    { path: '/features/kurse', priority: '0.7', changefreq: 'monthly' },
    { path: '/features/google-business-profile', priority: '0.85', changefreq: 'weekly' },
    { path: '/kunden', priority: '0.7', changefreq: 'monthly' },
    { path: '/kontakt', priority: '0.6', changefreq: 'monthly' },
    { path: '/ueber-uns', priority: '0.6', changefreq: 'monthly' },
    { path: '/partner', priority: '0.5', changefreq: 'monthly' },
    { path: '/agb', priority: '0.2', changefreq: 'yearly' },
    { path: '/datenschutz', priority: '0.2', changefreq: 'yearly' },
  ]

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...routes.map(r => [
      '  <url>',
      `    <loc>${SIMY_BASE}${r.path === '/' ? '/' : r.path}</loc>`,
      `    <changefreq>${r.changefreq}</changefreq>`,
      `    <priority>${r.priority}</priority>`,
      '  </url>',
    ].join('\n')),
    '</urlset>',
  ].join('\n')

  setResponseHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  setResponseHeader(event, 'Cache-Control', 'public, max-age=86400')
  return xml
})
