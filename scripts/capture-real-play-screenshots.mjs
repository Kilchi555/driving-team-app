#!/usr/bin/env node
/**
 * Capture REAL Play Store screenshots from live app.simy.ch (apple-review tenant).
 * Temporarily sets a known password via service role, logs in via the real form,
 * then restores nothing (demo tenant — re-run demo:apple-review:setup to rotate).
 *
 * Usage: node scripts/capture-real-play-screenshots.mjs
 */
import puppeteer from 'puppeteer'
import { createClient } from '@supabase/supabase-js'
import { readFileSync, mkdirSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { randomBytes } from 'crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const outDir = join(root, 'clients/simy/store/screenshots')
mkdirSync(outDir, { recursive: true })

const env = Object.fromEntries(
  readFileSync(join(root, '.env'), 'utf8')
    .split('\n')
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]
    }),
)

const admin = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

const W = 390
const H = 844
const SCALE = 3 // → 1170×2532 export (Play-friendly phone)
const APP = 'https://app.simy.ch'
const TEMP_PASSWORD = `Shot-${randomBytes(9).toString('base64url')}!aA1`

const ACCOUNTS = [
  {
    email: 'apple-review@simy.ch',
    file: '02-client',
    afterLogin: [`${APP}/customer-dashboard`, `${APP}/customer-dashboard?tenant=apple-review`],
  },
  {
    email: 'demo-instructor@simy.ch',
    file: '03-staff',
    afterLogin: [`${APP}/dashboard`, `${APP}/staff/expenses`],
  },
  {
    email: 'demo-admin@simy.ch',
    file: '04-admin',
    afterLogin: [`${APP}/admin`, `${APP}/admin/users`],
  },
]

async function ensurePassword(email, password) {
  const { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email })
  if (error) throw new Error(`lookup ${email}: ${error.message}`)
  const userId = data.user.id
  const { error: upErr } = await admin.auth.admin.updateUserById(userId, { password })
  if (upErr) throw new Error(`password ${email}: ${upErr.message}`)
  return userId
}

async function waitReady(page) {
  await page.waitForNetworkIdle({ idleTime: 1000, timeout: 15000 }).catch(() => {})
  await new Promise((r) => setTimeout(r, 1500))
}

async function shot(page, name) {
  const path = join(outDir, `${name}.png`)
  await page.screenshot({ path, type: 'png' })
  console.log(`✅ ${name}.png ← ${page.url()}`)
}

async function clearSession(page) {
  await page.goto(`${APP}/login?tenant=apple-review`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.evaluate(async () => {
    try { localStorage.clear(); sessionStorage.clear() } catch {}
    // best-effort logout hooks
  })
  const client = await page.createCDPSession()
  await client.send('Network.clearBrowserCookies')
}

async function login(page, email, password) {
  await page.goto(`${APP}/login?tenant=apple-review`, { waitUntil: 'networkidle2', timeout: 90000 })
  await waitReady(page)

  // Fill email / password — tolerate DE labels
  await page.waitForSelector('input[type="email"], input[name="email"], input[autocomplete="email"]', { timeout: 20000 })
  const emailSel = await page.$('input[type="email"], input[name="email"], input[autocomplete="email"]')
  const passSel = await page.$('input[type="password"], input[name="password"], input[autocomplete="current-password"]')
  if (!emailSel || !passSel) throw new Error('Login form fields not found')

  await emailSel.click({ clickCount: 3 })
  await emailSel.type(email, { delay: 15 })
  await passSel.click({ clickCount: 3 })
  await passSel.type(password, { delay: 15 })

  // Submit
  await Promise.all([
    page.click('button[type="submit"]').catch(() =>
      page.evaluate(() => {
        const btns = [...document.querySelectorAll('button')]
        const b = btns.find((x) => /anmelden|login|sign in/i.test(x.textContent || ''))
        if (b) b.click()
      }),
    ),
    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 }).catch(() => {}),
  ])
  await waitReady(page)

  if (page.url().includes('/login')) {
    // maybe still loading — wait more
    await new Promise((r) => setTimeout(r, 3000))
  }
  if (page.url().includes('/login')) {
    const err = await page.evaluate(() => document.body?.innerText?.slice(0, 500) || '')
    throw new Error(`Still on login for ${email}. Page text: ${err.replace(/\s+/g, ' ').slice(0, 200)}`)
  }
}

async function gotoFirstWorking(page, urls) {
  for (const url of urls) {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 }).catch(() => {})
    await waitReady(page)
    if (!page.url().includes('/login')) return
  }
}

console.log('🔑 Setting temporary passwords for demo accounts…')
for (const a of ACCOUNTS) {
  await ensurePassword(a.email, TEMP_PASSWORD)
  console.log(`  ✓ ${a.email}`)
}

const browser = await puppeteer.launch({
  headless: true,
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--no-sandbox', '--disable-setuid-sandbox', `--window-size=${W},${H}`],
  defaultViewport: {
    width: W,
    height: H,
    deviceScaleFactor: SCALE,
    isMobile: true,
    hasTouch: true,
  },
})

const page = await browser.newPage()
await page.setUserAgent(
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
)

try {
  // 01 Login
  await page.goto(`${APP}/login?tenant=apple-review`, { waitUntil: 'networkidle2', timeout: 90000 })
  await waitReady(page)
  await shot(page, '01-login')

  for (const account of ACCOUNTS) {
    await clearSession(page)
    console.log(`\n→ Login ${account.email}`)
    await login(page, account.email, TEMP_PASSWORD)
    await gotoFirstWorking(page, account.afterLogin)
    // hide any toast
    await page.evaluate(() => {
      document.querySelectorAll('[role="dialog"], .toast, .fixed.z-50').forEach((el) => {
        if ((el.textContent || '').length < 80) (el).style.display = 'none'
      })
    }).catch(() => {})
    await shot(page, account.file)
  }

  writeFileSync(
    join(outDir, 'README.txt'),
    [
      `Real screenshots from ${APP}?tenant=apple-review`,
      `Captured: ${new Date().toISOString()}`,
      `Viewport: ${W}x${H} @${SCALE}x`,
      '',
      'NOTE: Demo account passwords were rotated for this capture.',
      'Re-seed with: DEMO_PASSWORD=... npm run demo:apple-review:setup',
      '',
    ].join('\n'),
  )

  console.log('\n⚠️  Demo-Passwörter wurden für den Screenshot-Lauf rotiert.')
  console.log('   Für Apple/Play Review neu setzen: DEMO_PASSWORD=... npm run demo:apple-review:setup')
} catch (e) {
  console.error('❌', e)
  await page.screenshot({ path: join(outDir, 'error.png'), type: 'png' }).catch(() => {})
  process.exitCode = 1
} finally {
  await browser.close()
}
