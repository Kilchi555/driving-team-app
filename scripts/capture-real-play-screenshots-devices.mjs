#!/usr/bin/env node
/**
 * Capture real Play Store screenshots for 7" tablet, 10" tablet and desktop.
 * Tablets are captured in LANDSCAPE (portrait leaves huge empty gaps with this UI).
 *
 * Usage: DEMO_PASSWORD=... node scripts/capture-real-play-screenshots-devices.mjs
 */
import puppeteer from 'puppeteer'
import { mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const baseOut = join(root, 'clients/simy/store/screenshots')

const APP = 'https://app.simy.ch'
const PASS = process.env.DEMO_PASSWORD || 'PlayShot2026!Review'

const DEVICES = [
  {
    id: 'tablet-7',
    label: '7" Tablet landscape',
    width: 1920,
    height: 1200,
    isMobile: true,
    hasTouch: true,
    ua: 'Mozilla/5.0 (Linux; Android 13; Pixel Tablet) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  },
  {
    id: 'tablet-10',
    label: '10" Tablet landscape',
    width: 2560,
    height: 1600,
    isMobile: true,
    hasTouch: true,
    ua: 'Mozilla/5.0 (Linux; Android 13; Pixel Tablet) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  },
  {
    id: 'desktop',
    label: 'Desktop 16:9',
    width: 1920,
    height: 1080,
    isMobile: false,
    hasTouch: false,
    ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  },
]

const SCREENS = [
  { file: '01-login', email: null, urls: [`${APP}/login?tenant=apple-review`] },
  { file: '02-client', email: 'apple-review@simy.ch', urls: [`${APP}/customer-dashboard`] },
  {
    file: '03-staff',
    email: 'demo-instructor@simy.ch',
    urls: [`${APP}/dashboard`],
    afterNav: async (page) => {
      await page.evaluate(() => {
        const btns = [...document.querySelectorAll('button, a')]
        const woche = btns.find((b) => (b.textContent || '').trim() === 'Woche')
        if (woche) woche.click()
      })
      await new Promise((r) => setTimeout(r, 1200))
    },
  },
  { file: '04-admin', email: 'demo-admin@simy.ch', urls: [`${APP}/admin`] },
]

async function wait(page, ms = 1500) {
  await page.waitForNetworkIdle({ idleTime: 800, timeout: 15000 }).catch(() => {})
  await new Promise((r) => setTimeout(r, ms))
}

async function clearSession(page) {
  const cdp = await page.createCDPSession()
  await cdp.send('Network.clearBrowserCookies')
  await page.goto('about:blank')
}

async function login(page, email) {
  await page.goto(`${APP}/login?tenant=apple-review`, { waitUntil: 'networkidle2', timeout: 90000 })
  await wait(page)
  await page.waitForSelector('input[type="email"]', { timeout: 30000 })
  await page.click('input[type="email"]', { clickCount: 3 })
  await page.type('input[type="email"]', email, { delay: 6 })
  await page.click('input[type="password"]', { clickCount: 3 })
  await page.type('input[type="password"]', PASS, { delay: 6 })
  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 90000 }).catch(() => {}),
  ])
  await wait(page, 2000)
  if (page.url().includes('/login')) throw new Error(`Login failed for ${email}`)
}

async function gotoFirst(page, urls) {
  for (const url of urls) {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 90000 }).catch(() => {})
    await wait(page, 2000)
    if (!page.url().includes('/login')) return
  }
}

const browser = await puppeteer.launch({
  headless: true,
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
})

try {
  for (const device of DEVICES) {
    const outDir = join(baseOut, device.id)
    mkdirSync(outDir, { recursive: true })
    console.log(`\n🖥  ${device.label} (${device.width}×${device.height})`)

    const page = await browser.newPage()
    await page.setUserAgent(device.ua)
    await page.setViewport({
      width: device.width,
      height: device.height,
      deviceScaleFactor: 1,
      isMobile: device.isMobile,
      hasTouch: device.hasTouch,
    })

    for (const screen of SCREENS) {
      await clearSession(page)
      if (screen.email) {
        await login(page, screen.email)
        await gotoFirst(page, screen.urls)
      } else {
        await gotoFirst(page, screen.urls)
      }
      if (screen.afterNav) await screen.afterNav(page)
      const path = join(outDir, `${screen.file}.png`)
      await page.screenshot({ path, type: 'png', fullPage: false })
      console.log(`  ✅ ${device.id}/${screen.file}.png`)
    }
    await page.close()
  }
  console.log('\nDone. Upload:')
  console.log('  tablet-7/   1920×1200 landscape → 7-Zoll')
  console.log('  tablet-10/  2560×1600 landscape → 10-Zoll')
  console.log('  desktop/    1920×1080           → Desktop')
} catch (e) {
  console.error('❌', e)
  process.exitCode = 1
} finally {
  await browser.close()
}
