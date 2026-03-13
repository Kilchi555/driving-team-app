export default defineEventHandler((event) => {
  const robots = `User-agent: *
Allow: /
Crawl-delay: 1

User-agent: BadBot
Disallow: /

Sitemap: https://drivingteam.ch/sitemap.xml
`

  setHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
  setHeader(event, 'Cache-Control', 'public, max-age=86400')
  return robots
})
