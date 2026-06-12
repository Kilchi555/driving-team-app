export default defineEventHandler((event) => {
  const BASE = 'https://simy.ch'
  const today = new Date().toISOString().split('T')[0]

  const routes: { path: string; priority: string; changefreq: string; lastmod?: string }[] = [
    { path: '/',                           priority: '1.0', changefreq: 'weekly',  lastmod: today },
    { path: '/preise',                     priority: '0.9', changefreq: 'monthly', lastmod: today },
    { path: '/demo',                       priority: '0.9', changefreq: 'monthly', lastmod: today },
    { path: '/fahrschule',                 priority: '0.9', changefreq: 'monthly', lastmod: today },
    { path: '/fahrschule/software',        priority: '0.8', changefreq: 'monthly', lastmod: today },
    { path: '/fahrschule/buchungssystem',  priority: '0.8', changefreq: 'monthly', lastmod: today },
    { path: '/fahrschule/app',             priority: '0.8', changefreq: 'monthly', lastmod: today },
    { path: '/marketing',                  priority: '0.8', changefreq: 'monthly', lastmod: today },
    { path: '/marketing/google-ads',       priority: '0.8', changefreq: 'monthly', lastmod: today },
    { path: '/marketing/seo',              priority: '0.8', changefreq: 'monthly', lastmod: today },
    { path: '/features/kalender',          priority: '0.7', changefreq: 'monthly', lastmod: today },
    { path: '/features/rechnungen',        priority: '0.7', changefreq: 'monthly', lastmod: today },
    { path: '/kunden',                     priority: '0.7', changefreq: 'monthly', lastmod: today },
    { path: '/coaching',                   priority: '0.7', changefreq: 'monthly', lastmod: today },
    { path: '/kontakt',                    priority: '0.6', changefreq: 'monthly', lastmod: today },
    { path: '/ueber-uns',                  priority: '0.6', changefreq: 'monthly', lastmod: today },
    { path: '/impressum',                  priority: '0.3', changefreq: 'yearly',  lastmod: today },
    { path: '/partner',                    priority: '0.5', changefreq: 'monthly', lastmod: today },
    { path: '/agb',                        priority: '0.2', changefreq: 'yearly',  lastmod: today },
    { path: '/datenschutz',               priority: '0.2', changefreq: 'yearly',  lastmod: today },
  ]

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...routes.map(r => [
      '  <url>',
      `    <loc>${BASE}${r.path}</loc>`,
      r.lastmod ? `    <lastmod>${r.lastmod}</lastmod>` : '',
      `    <changefreq>${r.changefreq}</changefreq>`,
      `    <priority>${r.priority}</priority>`,
      '  </url>',
    ].filter(Boolean).join('\n')),
    '</urlset>',
  ].join('\n')

  setResponseHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  setResponseHeader(event, 'Cache-Control', 'public, max-age=86400')
  return xml
})
