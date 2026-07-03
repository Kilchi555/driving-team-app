#!/usr/bin/env node
// scripts/generate-icons.mjs
// Generates all required iOS and Android icon and splash screen sizes
// from a single 1024×1024 PNG source.
//
// Prerequisites: npm install -D sharp
// Usage: CLIENT=driving-team node scripts/generate-icons.mjs

import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const clientId = process.env.CLIENT || 'driving-team'
const clientDir = join(root, 'clients', clientId)
const configPath = join(clientDir, 'config.json')
const config = JSON.parse(readFileSync(configPath, 'utf-8'))

// Dynamic import of sharp (optional dep)
let sharp
try {
  sharp = (await import('sharp')).default
} catch {
  console.warn('⚠️  sharp not installed. Run: npm install -D sharp')
  console.warn('   Skipping icon generation.')
  process.exit(0)
}

let iconSrc = join(clientDir, 'icon.png')
let tempIconPath = null
const splashSrc = existsSync(join(clientDir, 'splash.png'))
  ? join(clientDir, 'splash.png')
  : null

if (!existsSync(iconSrc)) {
  console.log('  🌐 No local icon.png found – fetching logo_square_url from Supabase...')
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY env vars.')
    console.error('   Either add clients/${clientId}/icon.png or set the Supabase env vars.')
    process.exit(1)
  }

  const tenantSlug = config.tenantSlug || clientId
  const res = await fetch(
    `${supabaseUrl}/rest/v1/tenants?slug=eq.${tenantSlug}&select=logo_square_url`,
    { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
  )

  if (!res.ok) {
    console.error(`❌ Supabase request failed: ${res.status} ${res.statusText}`)
    process.exit(1)
  }

  const rows = await res.json()
  const logoDataUrl = rows?.[0]?.logo_square_url

  if (!logoDataUrl) {
    console.error(`❌ No logo_square_url found for tenant slug "${tenantSlug}" in Supabase.`)
    console.error('   Upload a square logo in the tenant settings or add clients/${clientId}/icon.png manually.')
    process.exit(1)
  }

  // Decode base64 data URL → temp PNG file
  const base64Data = logoDataUrl.replace(/^data:image\/\w+;base64,/, '')
  tempIconPath = join(clientDir, '_icon-temp.png')
  writeFileSync(tempIconPath, Buffer.from(base64Data, 'base64'))
  iconSrc = tempIconPath
  console.log('  ✅ Logo fetched from Supabase')
}

// ─── iOS Icon Sizes ─────────────────────────────────────────────────────────
// Xcode 14+ only requires a single 1024x1024 universal icon (AppIcon-512@2x.png).
// All other sizes are derived automatically.

// ─── Android Icon Sizes ──────────────────────────────────────────────────────

const ANDROID_ICONS = [
  { dir: 'mipmap-mdpi',    size: 48  },
  { dir: 'mipmap-hdpi',    size: 72  },
  { dir: 'mipmap-xhdpi',   size: 96  },
  { dir: 'mipmap-xxhdpi',  size: 144 },
  { dir: 'mipmap-xxxhdpi', size: 192 },
]

const ANDROID_ADAPTIVE_FOREGROUND = [
  { dir: 'mipmap-mdpi',    size: 108 },
  { dir: 'mipmap-hdpi',    size: 162 },
  { dir: 'mipmap-xhdpi',   size: 216 },
  { dir: 'mipmap-xxhdpi',  size: 324 },
  { dir: 'mipmap-xxxhdpi', size: 432 },
]

async function generateIosIcons() {
  const iosIconsDir = join(root, 'ios', 'App', 'App', 'Assets.xcassets', 'AppIcon.appiconset')
  if (!existsSync(iosIconsDir)) {
    console.warn(`  ⚠️  iOS project not found at ${iosIconsDir} — run 'npx cap add ios' first`)
    return
  }

  console.log('  📱 iOS icon (1024x1024 universal)...')
  await sharp(iconSrc)
    .resize(1024, 1024)
    .toFile(join(iosIconsDir, 'AppIcon-512@2x.png'))

  // Write the Contents.json for a single universal icon (Xcode 14+ format)
  const contentsJson = {
    images: [
      {
        filename: 'AppIcon-512@2x.png',
        idiom: 'universal',
        platform: 'ios',
        size: '1024x1024'
      }
    ],
    info: { author: 'xcode', version: 1 }
  }
  writeFileSync(
    join(iosIconsDir, 'Contents.json'),
    JSON.stringify(contentsJson, null, 2) + '\n'
  )
  console.log('  ✅ iOS icon generated (AppIcon-512@2x.png)')
}

async function generateAndroidIcons() {
  const androidResDir = join(root, 'android', 'app', 'src', 'main', 'res')
  if (!existsSync(androidResDir)) {
    console.warn(`  ⚠️  Android project not found — run 'npx cap add android' first`)
    return
  }

  console.log('  🤖 Android icons...')
  for (const { dir, size } of ANDROID_ICONS) {
    const outDir = join(androidResDir, dir)
    mkdirSync(outDir, { recursive: true })
    await sharp(iconSrc)
      .resize(size, size)
      .toFile(join(outDir, 'ic_launcher.png'))
    await sharp(iconSrc)
      .resize(size, size)
      .toFile(join(outDir, 'ic_launcher_round.png'))
  }

  // Adaptive foreground: shrink icon to 72% with transparent padding
  // so Android's circular mask shows the full icon without double-circle effect
  for (const { dir, size } of ANDROID_ADAPTIVE_FOREGROUND) {
    const outDir = join(androidResDir, dir)
    mkdirSync(outDir, { recursive: true })
    const innerSize = Math.round(size * 0.72)
    const padding = Math.round((size - innerSize) / 2)
    await sharp(iconSrc)
      .resize(innerSize, innerSize)
      .extend({ top: padding, bottom: padding, left: padding, right: padding, background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toFile(join(outDir, 'ic_launcher_foreground.png'))
  }
  console.log(`  ✅ ${ANDROID_ICONS.length} Android icon densities generated`)
}

async function generateSplashScreens() {
  if (!splashSrc) {
    console.warn('  ⚠️  No splash.png found — skipping splash screen generation')
    return
  }

  // iOS splash
  const iosSplashDir = join(root, 'ios', 'App', 'App', 'Assets.xcassets', 'Splash.imageset')
  if (existsSync(iosSplashDir)) {
    await sharp(splashSrc).resize(2732, 2732).toFile(join(iosSplashDir, 'splash.png'))
    console.log('  ✅ iOS splash generated')
  }

  // Android splash
  const androidDrawable = join(root, 'android', 'app', 'src', 'main', 'res', 'drawable')
  if (existsSync(androidDrawable)) {
    await sharp(splashSrc).resize(1920, 1920).toFile(join(androidDrawable, 'splash.png'))
    console.log('  ✅ Android splash generated')
  }
}

// tempIconPath already declared above

console.log(`\n🎨 Generating assets for client: ${clientId}`)
await generateIosIcons()
await generateAndroidIcons()
await generateSplashScreens()

// Clean up temp file from Supabase download
if (tempIconPath && existsSync(tempIconPath)) {
  unlinkSync(tempIconPath)
  console.log('  🧹 Temp icon file removed')
}

console.log('\n✅ All assets generated\n')
