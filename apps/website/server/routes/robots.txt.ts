export default defineEventHandler(() => {
  const robots = `# Robots.txt for Driving Team Fahrschule
User-agent: *
Allow: /

# Specific crawl delay
Crawl-delay: 1

# Sitemaps
Sitemap: https://drivingteam.ch/sitemap.xml

# Block spammers
User-agent: BadBot
Disallow: /

User-agent: MJ12Bot
Allow: /

# Standard crawlers
User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

User-agent: Slurp
Allow: /
`

  setHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
  setHeader(event, 'Cache-Control', 'public, max-age=604800')
  return robots
})
