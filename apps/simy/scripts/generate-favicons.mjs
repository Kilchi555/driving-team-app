/**
 * Rasterize the Simy mark onto an opaque brand-purple square.
 * Google Search circular-crops favicons; transparent corners read as empty.
 */
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dirname, '../public')
const BRAND = '#6000BD'
const SOURCE = join(publicDir, 'simy-favicon.png')

function encodeIco(pngs) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(pngs.length, 4)

  let offset = 6 + 16 * pngs.length
  const entries = []
  const bodies = []
  for (const png of pngs) {
    const size = png.size >= 256 ? 0 : png.size
    const entry = Buffer.alloc(16)
    entry.writeUInt8(size, 0)
    entry.writeUInt8(size, 1)
    entry.writeUInt32LE(png.buffer.length, 8)
    entry.writeUInt32LE(offset, 12)
    entries.push(entry)
    bodies.push(png.buffer)
    offset += png.buffer.length
  }
  return Buffer.concat([header, ...entries, ...bodies])
}

async function squarePng(size) {
  const mark = await sharp(SOURCE)
    .resize(size, size, { fit: 'cover' })
    .ensureAlpha()
    .png()
    .toBuffer()

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: BRAND,
    },
  })
    .composite([{ input: mark }])
    .flatten({ background: BRAND })
    .png({ compressionLevel: 9 })
    .toBuffer()
}

const png48 = await squarePng(48)
const png96 = await squarePng(96)
const png180 = await squarePng(180)
const png192 = await squarePng(192)
const png512 = await squarePng(512)
const png16 = await squarePng(16)
const png32 = await squarePng(32)

writeFileSync(join(publicDir, 'favicon-48.png'), png48)
writeFileSync(join(publicDir, 'favicon-96.png'), png96)
writeFileSync(join(publicDir, 'favicon-192.png'), png192)
writeFileSync(join(publicDir, 'favicon-512.png'), png512)
writeFileSync(join(publicDir, 'apple-touch-icon.png'), png180)
writeFileSync(
  join(publicDir, 'favicon.ico'),
  encodeIco([
    { size: 16, buffer: png16 },
    { size: 32, buffer: png32 },
    { size: 48, buffer: png48 },
  ]),
)

writeFileSync(
  join(publicDir, 'favicon.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" fill="${BRAND}"/>
  <text x="16" y="23.2" text-anchor="middle" font-family="system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" font-size="20" font-weight="800" fill="#BEA3FF">S</text>
</svg>
`,
)

writeFileSync(
  join(publicDir, 'site.webmanifest'),
  `${JSON.stringify({
    name: 'Simy',
    short_name: 'Simy',
    icons: [
      { src: '/favicon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/favicon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    theme_color: BRAND,
    background_color: BRAND,
    display: 'standalone',
  }, null, 2)}\n`,
)

console.log('Wrote Google-safe favicons to', publicDir)
