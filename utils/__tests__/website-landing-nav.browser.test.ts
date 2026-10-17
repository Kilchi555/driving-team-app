import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { chromium, type Browser, type Page } from 'playwright'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const root = path.resolve(__dirname, '../..')

/**
 * Bundled Playwright Chromium is the CI browser. LANDING_NAV_BROWSER may point
 * at a system Chrome when that path exists. A missing browser fails the suite.
 */
function landingBrowserExecutable(): string {
  const configured = process.env.LANDING_NAV_BROWSER?.trim()
  if (configured) {
    if (!existsSync(configured)) {
      throw new Error(`LANDING_NAV_BROWSER is set but no browser exists at ${configured}`)
    }
    return configured
  }
  const bundled = chromium.executablePath()
  if (!existsSync(bundled)) {
    throw new Error(
      `Playwright Chromium is not installed at ${bundled}. Install it with \`npx playwright install chromium\`.`,
    )
  }
  return bundled
}
const landingCss = readFileSync(path.join(root, 'assets/css/website-landing-nav.css'), 'utf8')
const indexVue = readFileSync(path.join(root, 'pages/s/[subdomain]/index.vue'), 'utf8')
const slugVue = readFileSync(path.join(root, 'pages/s/[subdomain]/[slug].vue'), 'utf8')
const siteLayout = readFileSync(path.join(root, 'layouts/site.vue'), 'utf8')

const HASHES = ['angebot', 'produkte', 'team', 'kurse', 'kontakt', 'standort', 'termine'] as const

function svg(width: number, height: number, fill: string) {
  const markup = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="${fill}"/><circle cx="8" cy="${height / 2}" r="6" fill="#fff"/><circle cx="${width - 8}" cy="${height / 2}" r="6" fill="#000"/></svg>`
  return `data:image/svg+xml,${encodeURIComponent(markup)}`
}

/**
 * Structural navbar rules still live in the Vue SFCs. The fixture mirrors the
 * properties that decide bar height, wrapping, and the mobile drawer so the
 * shared stylesheet can be measured the way the templates use it.
 */
function fixture(logoSrc: string, brandWrap: 'home' | 'subpage') {
  const logo = `<img class="lp-logo" width="252" height="60" alt="Mark" src="${logoSrc}" />`
  const brand = brandWrap === 'subpage'
    ? `<a class="lp-brand-link" href="/s/example">${logo}</a>`
    : logo
  const sections = HASHES.map((id) => `<section id="${id}"><h2>${id}</h2><p>Abschnitt ${id}</p></section>`).join('\n')
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    html, body { overflow-x: hidden; max-width: 100vw; margin: 0; }
    ${landingCss}
    .lp-nav { position: sticky; top: 0; z-index: 20; background: #fff; border-bottom: 1px solid #e5e7eb; }
    .lp-nav-inner { max-width: 1100px; margin: 0 auto; padding: 0.7rem 1.25rem; display: flex; align-items: center; flex-wrap: nowrap; gap: 0.75rem; }
    .lp-brand, .lp-brand-link { display: flex; align-items: center; gap: 0.65rem; }
    .lp-nav-links { display: none; gap: 2rem; flex: 1 1 auto; min-width: 0; justify-content: flex-end; padding-right: 1.5rem; overflow: visible; }
    .lp-nav-item { position: relative; flex-shrink: 0; }
    .lp-nav-links a, .lp-nav-drawer a { color: #334155; text-decoration: none; font: 600 0.88rem/1.2 sans-serif; white-space: nowrap; }
    .lp-nav-actions { display: flex; align-items: center; justify-content: flex-end; gap: 0.45rem; flex: 0 0 auto; margin-left: auto; }
    .lp-nav-cta, .lp-nav-wa { flex-shrink: 0; white-space: nowrap; }
    .lp-nav-toggle { width: 44px; height: 44px; }
    .lp-nav-drawer { display: none; flex-direction: column; gap: 0.25rem; padding: 0.75rem 1.25rem 1rem; background: #fff; }
    .lp.lp-nav-open .lp-nav-drawer { display: flex; }
    @media (min-width: 1100px) {
      .lp-nav-links { display: flex; }
      .lp-nav-toggle, .lp-nav-drawer { display: none !important; }
    }
    @media (max-width: 859px) {
      .lp-nav-wa, .lp-nav-cta { display: none; }
    }
    section { min-height: 90vh; padding: 1rem 1.25rem; }
  </style>
</head>
<body>
  <div class="site-root">
    <div class="lp">
      <header class="lp-nav">
        <div class="lp-nav-inner">
          <div class="lp-brand">${brand}</div>
          <nav class="lp-nav-links" aria-label="Bereiche">
            <div class="lp-nav-item"><a href="#angebot">Dienstleistungen</a></div>
            <div class="lp-nav-item"><a href="#produkte">Produkte</a></div>
            <div class="lp-nav-item"><a href="#team">Über uns</a></div>
            <div class="lp-nav-item"><a href="#kontakt">Kontakt</a></div>
          </nav>
          <div class="lp-nav-actions">
            <a class="lp-nav-wa" href="#kontakt">WhatsApp</a>
            <a class="lp-nav-cta" href="#termine">Buchen</a>
            <button class="lp-nav-toggle" type="button" aria-label="Menü">Menu</button>
          </div>
        </div>
        <nav class="lp-nav-drawer" aria-label="Menü">
          ${HASHES.map((id) => `<a href="#${id}">${id}</a>`).join('\n')}
        </nav>
      </header>
      ${sections}
    </div>
  </div>
  <script>
    document.querySelector('.lp-nav-toggle').addEventListener('click', () => {
      document.querySelector('.lp').classList.toggle('lp-nav-open')
    })
    function landingScrollBehavior(reduceMotion) {
      return reduceMotion ? 'auto' : 'smooth'
    }
    function scrollToLandingTarget(id) {
      const el = document.getElementById(id)
      if (!el) return
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      el.scrollIntoView({ behavior: landingScrollBehavior(reduce), block: 'start' })
    }
  </script>
</body>
</html>`
}

async function metrics(page: Page) {
  return page.evaluate(() => {
    const img = document.querySelector('.lp-logo') as HTMLImageElement
    const brand = document.querySelector('.lp-brand') as HTMLElement
    const nav = document.querySelector('.lp-nav') as HTMLElement
    const links = document.querySelector('.lp-nav-links') as HTMLElement
    const imgBox = img.getBoundingClientRect()
    const brandBox = brand.getBoundingClientRect()
    const navBox = nav.getBoundingClientRect()
    const linksBox = links.getBoundingClientRect()
    const style = getComputedStyle(img)
    const htmlStyle = getComputedStyle(document.documentElement)
    const bodyStyle = getComputedStyle(document.body)
    const leftHit = document.elementFromPoint(imgBox.left + 2, imgBox.top + imgBox.height / 2)
    const rightHit = document.elementFromPoint(imgBox.right - 2, imgBox.top + imgBox.height / 2)
    const linksVisible = linksBox.width > 0 && getComputedStyle(links).display !== 'none'
    return {
      img: { w: imgBox.width, h: imgBox.height, top: imgBox.top, right: imgBox.right, bottom: imgBox.bottom, left: imgBox.left },
      brand: { w: brandBox.width, h: brandBox.height, overflow: getComputedStyle(brand).overflow },
      nav: { h: navBox.height, top: navBox.top, bottom: navBox.bottom },
      linksLeft: linksBox.left,
      linksVisible,
      objectFit: style.objectFit,
      maxWidth: style.maxWidth,
      htmlOverflowX: htmlStyle.overflowX,
      htmlOverflowY: htmlStyle.overflowY,
      bodyOverflowX: bodyStyle.overflowX,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      innerWidth: window.innerWidth,
      hitsLogo: leftHit === img && rightHit === img,
      contained: imgBox.left >= brandBox.left - 0.5 && imgBox.right <= brandBox.right + 0.5 && imgBox.top >= brandBox.top - 0.5 && imgBox.bottom <= brandBox.bottom + 0.5,
    }
  })
}

describe('landing navbar source', () => {
  it('uses one shared stylesheet and the reduced-motion scroll helper in both templates', () => {
    expect(siteLayout).toContain('assets/css/website-landing-nav.css')
    for (const source of [indexVue, slugVue]) {
      expect(source).toContain("import { scrollToLandingTarget } from '~/utils/website-landing-scroll'")
      expect(source).toContain("scrollToLandingTarget('kontakt')")
      expect(source).not.toContain('scrollIntoView')
      expect(source).not.toContain('height: 40px')
      expect(source).not.toContain('height: 36px')
      expect(source).not.toContain('min(168px, 46vw)')
      expect(source).not.toContain('min(152px, 62vw)')
      expect(source).toContain('width="252"')
      expect(source).toContain('height="60"')
      expect(source).toContain('overflow: visible')
      expect(source).toContain('class="lp-nav-drawer"')
      expect(source).toContain('class="lp-nav-toggle"')
      expect(source).toContain('mobileNavOpen = false')
    }
    expect(slugVue).toContain('class="lp-brand-link"')
    expect(landingCss).toContain('overflow-x: clip')
    expect(landingCss).toContain('scroll-margin-top: var(--lp-nav-offset)')
    for (const id of HASHES) expect(landingCss).toContain(`#${id}`)
  })
})

describe('landing navbar layout', () => {
  let browser: Browser

  beforeAll(async () => {
    browser = await chromium.launch({
      executablePath: landingBrowserExecutable(),
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    })
  })

  afterAll(async () => {
    await browser?.close()
  })

  async function open(opts: { width: number; height?: number; logo: 'square' | 'wide'; wrap: 'home' | 'subpage'; reduce?: boolean }) {
    const context = await browser.newContext({
      viewport: { width: opts.width, height: opts.height ?? 800 },
      reducedMotion: opts.reduce ? 'reduce' : 'no-preference',
    })
    const page = await context.newPage()
    const src = opts.logo === 'square' ? svg(477, 477, '#0433ff') : svg(960, 120, '#011993')
    await page.setContent(fixture(src, opts.wrap), { waitUntil: 'load' })
    await page.waitForFunction(() => {
      const img = document.querySelector('.lp-logo') as HTMLImageElement | null
      return !!img && img.complete && img.naturalWidth > 0
    })
    return { context, page }
  }

  it('sizes a square logo on the home template at desktop', async () => {
    const { context, page } = await open({ width: 1280, logo: 'square', wrap: 'home' })
    const box = await metrics(page)
    expect(box.img.h).toBeGreaterThanOrEqual(59)
    expect(box.img.h).toBeLessThanOrEqual(61)
    expect(box.img.w).toBeGreaterThanOrEqual(59)
    expect(box.img.w).toBeLessThanOrEqual(61)
    expect(box.objectFit).toBe('contain')
    expect(box.contained).toBe(true)
    expect(box.hitsLogo).toBe(true)
    expect(box.brand.overflow).toBe('visible')
    expect(box.linksVisible).toBe(true)
    expect(box.img.right).toBeLessThanOrEqual(box.linksLeft)
    expect(box.scrollWidth).toBeLessThanOrEqual(box.clientWidth + 1)
    expect(box.htmlOverflowX).toBe('clip')
    expect(box.htmlOverflowY).toBe('visible')
    await context.close()
  })

  it('sizes a square logo on the home template at mobile', async () => {
    const { context, page } = await open({ width: 390, logo: 'square', wrap: 'home' })
    const box = await metrics(page)
    expect(box.img.h).toBeGreaterThanOrEqual(53)
    expect(box.img.h).toBeLessThanOrEqual(55)
    expect(box.img.w).toBeGreaterThanOrEqual(53)
    expect(box.img.w).toBeLessThanOrEqual(55)
    expect(box.contained).toBe(true)
    expect(box.hitsLogo).toBe(true)
    expect(box.img.right).toBeLessThanOrEqual(box.innerWidth)
    expect(box.scrollWidth).toBeLessThanOrEqual(box.clientWidth + 1)
    expect(box.linksVisible).toBe(false)
    await context.close()
  })

  it('uses the same logo box on the subpage template', async () => {
    const desktop = await open({ width: 1280, logo: 'square', wrap: 'subpage' })
    const desktopBox = await metrics(desktop.page)
    expect(desktopBox.img.h).toBeGreaterThanOrEqual(59)
    expect(desktopBox.img.h).toBeLessThanOrEqual(61)
    expect(desktopBox.contained).toBe(true)
    expect(desktopBox.hitsLogo).toBe(true)
    expect(desktopBox.img.right).toBeLessThanOrEqual(desktopBox.linksLeft)
    await desktop.context.close()

    const mobile = await open({ width: 390, logo: 'square', wrap: 'subpage' })
    const mobileBox = await metrics(mobile.page)
    expect(mobileBox.img.h).toBeGreaterThanOrEqual(53)
    expect(mobileBox.img.h).toBeLessThanOrEqual(55)
    expect(mobileBox.contained).toBe(true)
    expect(mobileBox.hitsLogo).toBe(true)
    expect(mobileBox.scrollWidth).toBeLessThanOrEqual(mobileBox.clientWidth + 1)
    await mobile.context.close()
  })

  it('keeps a wide logo inside the cap without clipping or overlapping the nav', async () => {
    const desktop = await open({ width: 1280, logo: 'wide', wrap: 'home' })
    const desktopBox = await metrics(desktop.page)
    expect(desktopBox.img.h).toBeGreaterThanOrEqual(59)
    expect(desktopBox.img.h).toBeLessThanOrEqual(61)
    expect(desktopBox.img.w).toBeGreaterThan(120)
    expect(desktopBox.img.w).toBeLessThanOrEqual(252.5)
    expect(desktopBox.contained).toBe(true)
    expect(desktopBox.hitsLogo).toBe(true)
    expect(desktopBox.img.right).toBeLessThanOrEqual(desktopBox.linksLeft)
    expect(desktopBox.scrollWidth).toBeLessThanOrEqual(desktopBox.clientWidth + 1)
    await desktop.context.close()

    const mobile = await open({ width: 390, logo: 'wide', wrap: 'subpage' })
    const mobileBox = await metrics(mobile.page)
    expect(mobileBox.img.h).toBeGreaterThanOrEqual(53)
    expect(mobileBox.img.h).toBeLessThanOrEqual(55)
    expect(mobileBox.img.w).toBeLessThanOrEqual(228.5)
    expect(mobileBox.contained).toBe(true)
    expect(mobileBox.hitsLogo).toBe(true)
    expect(mobileBox.img.right).toBeLessThanOrEqual(mobileBox.innerWidth)
    expect(mobileBox.scrollWidth).toBeLessThanOrEqual(mobileBox.clientWidth + 1)
    await mobile.context.close()
  })

  it('keeps the navbar stuck and each hash target below it', async () => {
    for (const width of [1280, 390]) {
      const { context, page } = await open({ width, logo: 'square', wrap: width === 1280 ? 'home' : 'subpage' })
      const stuck = await page.evaluate(() => {
        window.scrollTo(0, 640)
        const nav = document.querySelector('.lp-nav')!.getBoundingClientRect()
        return { top: nav.top, scrollY: window.scrollY }
      })
      expect(stuck.scrollY).toBeGreaterThan(500)
      expect(stuck.top).toBeGreaterThanOrEqual(-1)
      expect(stuck.top).toBeLessThanOrEqual(1)

      for (const id of HASHES) {
        const placed = await page.evaluate((target) => {
          window.scrollTo(0, 0)
          location.hash = `#${target}`
          const section = document.getElementById(target)!
          const nav = document.querySelector('.lp-nav')!.getBoundingClientRect()
          const box = section.getBoundingClientRect()
          const margin = parseFloat(getComputedStyle(section).scrollMarginTop)
          return {
            margin,
            navBottom: nav.bottom,
            sectionTop: box.top,
            visible: box.top < window.innerHeight && box.bottom > nav.bottom,
          }
        }, id)
        expect(placed.margin).toBeGreaterThan(placed.navBottom - 2)
        expect(placed.sectionTop).toBeGreaterThanOrEqual(placed.navBottom - 2)
        expect(placed.visible).toBe(true)
        const navAfterHash = await page.evaluate(() => document.querySelector('.lp-nav')!.getBoundingClientRect().top)
        expect(navAfterHash).toBeGreaterThanOrEqual(-1)
        expect(navAfterHash).toBeLessThanOrEqual(1)
      }
      await context.close()
    }
  })

  it('lands a direct hash load below the navbar', async () => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } })
    const page = await context.newPage()
    await page.route('http://landing.test/**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: fixture(svg(477, 477, '#0433ff'), 'home'),
      })
    })
    await page.goto('http://landing.test/#angebot', { waitUntil: 'load' })
    const placed = await page.evaluate(() => {
      const section = document.getElementById('angebot')!
      const nav = document.querySelector('.lp-nav')!.getBoundingClientRect()
      const box = section.getBoundingClientRect()
      return {
        hash: location.hash,
        navTop: nav.top,
        sectionTop: box.top,
        navBottom: nav.bottom,
      }
    })
    expect(placed.hash).toBe('#angebot')
    expect(placed.navTop).toBeGreaterThanOrEqual(-1)
    expect(placed.navTop).toBeLessThanOrEqual(1)
    expect(placed.sectionTop).toBeGreaterThanOrEqual(placed.navBottom - 2)
    await context.close()
  })

  it('opens the mobile drawer without a horizontal scrollbar', async () => {
    const { context, page } = await open({ width: 390, logo: 'wide', wrap: 'home' })
    await page.click('.lp-nav-toggle')
    const drawer = await page.evaluate(() => {
      const nav = document.querySelector('.lp-nav-drawer') as HTMLElement
      const style = getComputedStyle(nav)
      return {
        open: document.querySelector('.lp')!.classList.contains('lp-nav-open'),
        display: style.display,
        links: nav.querySelectorAll('a').length,
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }
    })
    expect(drawer.open).toBe(true)
    expect(drawer.display).toBe('flex')
    expect(drawer.links).toBe(HASHES.length)
    expect(drawer.scrollWidth).toBeLessThanOrEqual(drawer.clientWidth + 1)
    await context.close()
  })

  it('jumps without an animated scroll when reduced motion is set', async () => {
    const reduced = await open({ width: 1280, logo: 'square', wrap: 'home', reduce: true })
    const reducedMove = await reduced.page.evaluate(async () => {
      window.scrollTo(0, 0)
      const seen: string[] = []
      const original = Element.prototype.scrollIntoView
      Element.prototype.scrollIntoView = function (this: Element, arg) {
        const behavior = arg && typeof arg === 'object' ? arg.behavior : undefined
        if (behavior) seen.push(behavior)
        return original.call(this, arg as ScrollIntoViewOptions)
      }
      const samples = [window.scrollY]
      let frames = 0
      const done = new Promise<number[]>((resolve) => {
        const tick = () => {
          samples.push(window.scrollY)
          frames += 1
          if (frames < 8) requestAnimationFrame(tick)
          else resolve(samples)
        }
        requestAnimationFrame(tick)
      })
      ;(window as unknown as { scrollToLandingTarget: (id: string) => void }).scrollToLandingTarget('kontakt')
      const after = window.scrollY
      return { seen, after, samples: await done, reduce: matchMedia('(prefers-reduced-motion: reduce)').matches }
    })
    expect(reducedMove.reduce).toBe(true)
    expect(reducedMove.seen).toEqual(['auto'])
    expect(reducedMove.after).toBeGreaterThan(200)
    const midway = reducedMove.samples.filter((y) => y > 20 && y < reducedMove.after - 20)
    expect(midway).toEqual([])
    await reduced.context.close()

    const smooth = await open({ width: 1280, logo: 'square', wrap: 'home', reduce: false })
    const smoothMove = await smooth.page.evaluate(async () => {
      window.scrollTo(0, 0)
      const seen: string[] = []
      const original = Element.prototype.scrollIntoView
      Element.prototype.scrollIntoView = function (this: Element, arg) {
        const behavior = arg && typeof arg === 'object' ? arg.behavior : undefined
        if (behavior) seen.push(behavior)
        return original.call(this, arg as ScrollIntoViewOptions)
      }
      ;(window as unknown as { scrollToLandingTarget: (id: string) => void }).scrollToLandingTarget('kontakt')
      await new Promise((resolve) => setTimeout(resolve, 120))
      return { seen, reduce: matchMedia('(prefers-reduced-motion: reduce)').matches, y: window.scrollY }
    })
    expect(smoothMove.reduce).toBe(false)
    expect(smoothMove.seen).toEqual(['smooth'])
    expect(smoothMove.y).toBeGreaterThan(0)
    await smooth.context.close()
  })
})
