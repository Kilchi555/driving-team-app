/**
 * Public website header: short standard slots on wide screens.
 * Long SEO titles (Kategorie B Automatik, Standort …) stay in the overflow menu.
 */

export type WebsiteNavPage = {
  slug: string
  href: string
  title: string
  page_type?: string | null
}

export type WebsiteSectionLink = {
  href: string
  label: string
  children?: Array<{ href: string; label: string }>
}

export type WebsiteNavSlots = {
  services?: boolean
  products?: boolean
  courses?: boolean
  team?: boolean
}

function hashHref(homeHref: string, onHome: boolean, id: string) {
  const prefix = onHome ? '' : String(homeHref || '').replace(/\/$/, '')
  return `${prefix}#${id}`
}

function isProductPage(p: WebsiteNavPage) {
  const type = String(p.page_type || '').toLowerCase()
  const title = String(p.title || '').toLowerCase()
  return type === 'product' || type === 'products' || /(^|\b)produkte?\b/.test(title)
}

function isPricesPage(p: WebsiteNavPage) {
  const type = String(p.page_type || '').toLowerCase()
  const title = String(p.title || '').toLowerCase()
  return type === 'prices' || title === 'preise'
}

function isAboutPage(p: WebsiteNavPage) {
  const type = String(p.page_type || '').toLowerCase()
  const title = String(p.title || '').toLowerCase()
  return type === 'about' || /über uns|ueber uns/.test(title)
}

function blockHas(blocks: Array<{ type?: string; content?: Record<string, any> }>, type: string, key: string) {
  const b = blocks.find((x) => x.type === type)
  const arr = b?.content?.[key]
  return Array.isArray(arr) && arr.length > 0
}

function uniqueLinks(items: Array<{ href: string; label: string }>) {
  const seen = new Set<string>()
  const out: Array<{ href: string; label: string }> = []
  for (const item of items) {
    const label = String(item.label || '').replace(/\s+/g, ' ').trim()
    if (!label) continue
    const key = label.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ href: item.href, label })
  }
  return out
}

function serviceDropdown(
  blocks: Array<{ type?: string; content?: Record<string, any> }>,
  pages: WebsiteNavPage[],
  homeHref: string,
  onHome: boolean,
) {
  const cats = pages.filter((p) => String(p.page_type || '') === 'category')
  if (cats.length >= 2) return uniqueLinks(cats.map((p) => ({ href: p.href, label: p.title })))
  const services = blocks.find((b) => b.type === 'services')?.content?.services
  if (!Array.isArray(services)) return []
  return uniqueLinks(
    services.map((s: any) => ({
      href: String(s?.page_url || hashHref(homeHref, onHome, 'angebot')),
      label: String(s?.name || s?.page_label || ''),
    })),
  )
}

function productDropdown(
  blocks: Array<{ type?: string; content?: Record<string, any> }>,
  homeHref: string,
  onHome: boolean,
) {
  const products = blocks.find((b) => b.type === 'products')?.content?.products
  if (!Array.isArray(products)) return []
  return uniqueLinks(
    products.map((p: any) => ({
      href: String(p?.shop_url || hashHref(homeHref, onHome, 'produkte')),
      label: String(p?.name || ''),
    })),
  )
}

export function websitePageHref(slug: string, subdomain: string, isHome?: boolean) {
  const sub = String(subdomain || '').replace(/^\/+|\/+$/g, '')
  const clean = String(slug || '').replace(/^\/+|\/+$/g, '')
  if (!sub) return clean ? `/${clean}` : '/'
  if (isHome || !clean || clean === 'index') return `/s/${sub}`
  return `/s/${sub}/${clean}`
}

export function websitePageCardHref(
  p: { href?: string; url?: string; slug?: string; title?: string },
  subdomain: string,
  nav?: Array<{ title?: string; href?: string; slug?: string }>,
) {
  const direct = String(p?.href || p?.url || '').trim()
  if (direct) return direct
  const slug = String(p?.slug || '').trim()
  if (slug) return websitePageHref(slug, subdomain)
  const title = String(p?.title || '').replace(/\s+/g, ' ').trim().toLowerCase()
  if (!title) return ''
  const match = (nav || []).find((n) => String(n.title || '').replace(/\s+/g, ' ').trim().toLowerCase() === title)
  if (!match) return ''
  if (match.href) return String(match.href)
  if (match.slug) return websitePageHref(String(match.slug), subdomain)
  return ''
}

export function websitePageLinks(
  items: Array<{ title?: string; slug?: string; href?: string; page_type?: string | null; is_home?: boolean }>,
  excludeSlug?: string,
  subdomain?: string,
): WebsiteNavPage[] {
  return (items || [])
    .filter((n) => n && !n.is_home && n.slug && n.slug !== 'index' && n.slug !== excludeSlug)
    .map((n) => ({
      slug: String(n.slug),
      href: String(n.href || (subdomain ? websitePageHref(String(n.slug), subdomain) : '')),
      title: String(n.title || n.slug).replace(/\s+/g, ' ').trim(),
      page_type: n.page_type || null,
    }))
}

/** Desktop bar: Dienstleistungen, Produkte?, Kurse?, Preise, Über uns — skip empty slots. */
export function websiteStandardLinks(opts: {
  blocks?: Array<{ type?: string; content?: Record<string, any> }> | null
  pages?: Array<{ title?: string; slug?: string; href?: string; page_type?: string | null; is_home?: boolean }>
  homeHref: string
  onHome: boolean
  slots?: WebsiteNavSlots | null
}): WebsiteSectionLink[] {
  const blocks = opts.blocks || []
  const pages = websitePageLinks(opts.pages || [])
  const slots = opts.slots || {}
  const out: WebsiteSectionLink[] = []

  const hasServices =
    slots.services ||
    blockHas(blocks, 'services', 'services') ||
    blocks.some((b) => b.type === 'services')
  if (hasServices) {
    const kids = serviceDropdown(blocks, pages, opts.homeHref, opts.onHome)
    out.push({
      href: hashHref(opts.homeHref, opts.onHome, 'angebot'),
      label: 'Dienstleistungen',
      children: kids.length >= 2 ? kids : undefined,
    })
  } else {
    const categoryPage = pages.find((p) => String(p.page_type || '') === 'category')
    if (categoryPage) {
      const kids = serviceDropdown(blocks, pages, opts.homeHref, opts.onHome)
      out.push({
        href: categoryPage.href,
        label: 'Dienstleistungen',
        children: kids.length >= 2 ? kids : undefined,
      })
    }
  }

  const productPage = pages.find(isProductPage)
  const hasProducts = slots.products || blockHas(blocks, 'products', 'products') || !!productPage
  if (hasProducts || productPage) {
    const kids = productDropdown(blocks, opts.homeHref, opts.onHome)
    out.push({
      href: productPage?.href || hashHref(opts.homeHref, opts.onHome, 'produkte'),
      label: 'Produkte',
      children: kids.length >= 2 ? kids : undefined,
    })
  }

  const hasCourses = slots.courses || blockHas(blocks, 'courses', 'items')
  if (hasCourses) {
    out.push({ href: hashHref(opts.homeHref, opts.onHome, 'kurse'), label: 'Kurse' })
  }

  const pricesPage = pages.find(isPricesPage)
  if (pricesPage) {
    out.push({ href: pricesPage.href, label: 'Preise' })
  }

  const hasTeam = slots.team || blockHas(blocks, 'team', 'members')
  if (hasTeam) {
    out.push({ href: hashHref(opts.homeHref, opts.onHome, 'team'), label: 'Über uns' })
  } else {
    const aboutPage = pages.find(isAboutPage)
    if (aboutPage) out.push({ href: aboutPage.href, label: 'Über uns' })
  }

  return out.slice(0, 5)
}

/** Pages that stay in the hamburger (SEO titles), not already used as a standard slot. */
export function websiteOverflowPages(
  pages: WebsiteNavPage[],
  standard: WebsiteSectionLink[],
): WebsiteNavPage[] {
  const used = new Set(standard.map((s) => s.href))
  return pages.filter(
    (p) =>
      !used.has(p.href) &&
      !isPricesPage(p) &&
      !isProductPage(p) &&
      !isAboutPage(p) &&
      String(p.page_type || '') !== 'category',
  )
}
