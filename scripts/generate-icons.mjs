#!/usr/bin/env node
// scripts/generate-icons.mjs
// Generates all required iOS and Android icon and splash screen sizes
// from a single 1024×1024 PNG source.
//
// Prerequisites: npm install -D sharp
// Usage: CLIENT=driving-team node scripts/generate-icons.mjs

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
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

const iconSrc = join(clientDir, 'icon.png')
const splashSrc = existsSync(join(clientDir, 'splash.png'))
  ? join(clientDir, 'splash.png')
  : null

if (!existsSync(iconSrc)) {
  console.error(`❌ Missing: ${iconSrc}`)
  console.error('   Add a 1024×1024px PNG as clients/${clientId}/icon.png')
  process.exit(1)
}

// ─── iOS Icon Sizes ─────────────────────────────────────────────────────────

const IOS_ICONS = [
  { size: 20,   scale: 1 },
  { size: 20,   scale: 2 },
  { size: 20,   scale: 3 },
  { size: 29,   scale: 1 },
  { size: 29,   scale: 2 },
  { size: 29,   scale: 3 },
  { size: 40,   scale: 1 },
  { size: 40,   scale: 2 },
  { size: 40,   scale: 3 },
  { size: 60,   scale: 2 },
  { size: 60,   scale: 3 },
  { size: 76,   scale: 1 },
  { size: 76,   scale: 2 },
  { size: 83.5, scale: 2 },
  { size: 1024, scale: 1 },
]

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

  console.log('  📱 iOS icons...')
  for (const { size, scale } of IOS_ICONS) {
    const px = Math.round(size * scale)
    const filename = `icon-${size}@${scale}x.png`
    await sharp(iconSrc)
      .resize(px, px)
      .toFile(join(iosIconsDir, filename))
  }
  console.log(`  ✅ ${IOS_ICONS.length} iOS icons generated`)
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

  for (const { dir, size } of ANDROID_ADAPTIVE_FOREGROUND) {
    const outDir = join(androidResDir, dir)
    mkdirSync(outDir, { recursive: true })
    await sharp(iconSrc)
      .resize(size, size)
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

console.log(`\n🎨 Generating assets for client: ${clientId}`)
await generateIosIcons()
await generateAndroidIcons()
await generateSplashScreens()
console.log('\n✅ All assets generated\n')
