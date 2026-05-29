#!/usr/bin/env node
/**
 * scripts/generate-pci-docs.mjs
 *
 * Generates per-tenant (per-merchant) PCI DSS documents from the German
 * templates in docs/pci/templates/:
 *   - PCI-Compliance-Richtlinie
 *   - PCI Incident-Response-Plan
 *
 * Each tenant that accepts online card payments via Wallee is the MERCHANT OF
 * RECORD and therefore needs its own PCI documents in its own legal name.
 * Simy IT Systems Kilchenmann is only the technical platform/integration
 * partner (SAQ A model — no cardholder data ever touches Simy systems).
 *
 * ── Recommended usage (data pulled from the tenants table) ──────────────────
 *   node scripts/generate-pci-docs.mjs --tenant-slug driving-team --pdf
 *   node scripts/generate-pci-docs.mjs --tenant-id <uuid> --pdf
 *
 *   Pulled automatically: legal_company_name (fallback: name), address,
 *   contact_email, uid_number (fallback: wallee_uid_number),
 *   contact_person_first_name + last_name (used as approver if present).
 *
 * ── Manual usage / overriding any field ─────────────────────────────────────
 *   node scripts/generate-pci-docs.mjs \
 *     --company "Driving Team Zürich GmbH" \
 *     --address "Baslerstrasse 145, 8048 Zürich" \
 *     --uid "CHE-293.989.777" \
 *     --email "info@drivingteam.ch" \
 *     --approver "Pascal Kilchenmann" --title "Geschäftsführer" \
 *     --slug driving-team --pdf
 *
 * Any explicit flag overrides the value fetched from the database.
 * Unknown fields fall back to a clearly marked placeholder
 * «[BITTE AUSFÜLLEN: ...]» so a document is never silently wrong.
 *
 * Output: docs/pci/<slug>/*.md  (+ *.pdf with --pdf, when a Chromium-based
 *         browser is available).
 *
 * DB access requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (read from the
 * environment or the project .env file).
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { execFileSync } from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const templatesDir = join(root, 'docs', 'pci', 'templates')

// ─── Load .env (so the script works without exporting vars) ──────────────────
const envPath = join(root, '.env')
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('=')
    if (eq < 0) continue
    const k = t.slice(0, eq).trim()
    let v = t.slice(eq + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
    if (!process.env[k]) process.env[k] = v
  }
}

// ─── Parse CLI flags ─────────────────────────────────────────────────────────
function parseArgs(argv) {
  const out = { pdf: false }
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--pdf') { out.pdf = true; continue }
    if (a.startsWith('--')) {
      const key = a.slice(2)
      const val = argv[i + 1]
      if (val !== undefined && !val.startsWith('--')) { out[key] = val; i++ }
      else out[key] = true
    }
  }
  return out
}

const args = parseArgs(process.argv)

// ─── Optionally fetch tenant data from the database ──────────────────────────
async function fetchTenant() {
  const tenantSlug = args['tenant-slug']
  const tenantId = args['tenant-id']
  if (!tenantSlug && !tenantId) return null

  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL
  const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('❌ Für --tenant-slug/--tenant-id werden SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY benötigt (env oder .env).')
    process.exit(1)
  }

  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } })

  const query = supabase
    .from('tenants')
    .select('name, legal_company_name, address, contact_email, contact_person_first_name, contact_person_last_name, uid_number, wallee_uid_number')
  const { data, error } = tenantId
    ? await query.eq('id', tenantId).maybeSingle()
    : await query.eq('slug', tenantSlug).maybeSingle()

  if (error) { console.error('❌ DB-Fehler:', error.message); process.exit(1) }
  if (!data) { console.error(`❌ Kein Tenant gefunden für ${tenantId ? `id=${tenantId}` : `slug=${tenantSlug}`}.`); process.exit(1) }

  const approverFromDb = [data.contact_person_first_name, data.contact_person_last_name].filter(Boolean).join(' ').trim()
  return {
    company: data.legal_company_name || data.name,
    displayName: data.name,
    address: data.address,
    email: data.contact_email,
    uid: data.uid_number || data.wallee_uid_number,
    approver: approverFromDb || undefined,
    usedDisplayFallback: !data.legal_company_name,
  }
}

// ─── Minimal Markdown → HTML (sufficient for these docs) ──────────────────────
function mdToHtml(src) {
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const inline = (s) => esc(s)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
  const lines = src.split('\n')
  let html = '', i = 0, inUl = false, inOl = false
  const closeLists = () => { if (inUl) { html += '</ul>\n'; inUl = false } if (inOl) { html += '</ol>\n'; inOl = false } }
  while (i < lines.length) {
    const line = lines[i]
    if (/^\s*\|/.test(line) && i + 1 < lines.length && /^\s*\|[\s:|-]+\|?\s*$/.test(lines[i + 1])) {
      closeLists()
      const header = line.split('|').slice(1, -1).map((c) => c.trim())
      i += 2
      html += '<table><thead><tr>' + header.map((h) => `<th>${inline(h)}</th>`).join('') + '</tr></thead><tbody>\n'
      while (i < lines.length && /^\s*\|/.test(lines[i])) {
        const cells = lines[i].split('|').slice(1, -1).map((c) => c.trim())
        html += '<tr>' + cells.map((c) => `<td>${inline(c)}</td>`).join('') + '</tr>\n'
        i++
      }
      html += '</tbody></table>\n'; continue
    }
    if (/^#\s+/.test(line)) { closeLists(); html += `<h1>${inline(line.replace(/^#\s+/, ''))}</h1>\n`; i++; continue }
    if (/^##\s+/.test(line)) { closeLists(); html += `<h2>${inline(line.replace(/^##\s+/, ''))}</h2>\n`; i++; continue }
    if (/^###\s+/.test(line)) { closeLists(); html += `<h3>${inline(line.replace(/^###\s+/, ''))}</h3>\n`; i++; continue }
    if (/^---\s*$/.test(line)) { closeLists(); html += '<hr/>\n'; i++; continue }
    if (/^>\s?/.test(line)) { closeLists(); html += `<blockquote>${inline(line.replace(/^>\s?/, ''))}</blockquote>\n`; i++; continue }
    if (/^\s*[-*]\s+/.test(line)) { if (!inUl) { closeLists(); html += '<ul>\n'; inUl = true } html += `<li>${inline(line.replace(/^\s*[-*]\s+/, ''))}</li>\n`; i++; continue }
    if (/^\s*\d+\.\s+/.test(line)) { if (!inOl) { closeLists(); html += '<ol>\n'; inOl = true } html += `<li>${inline(line.replace(/^\s*\d+\.\s+/, ''))}</li>\n`; i++; continue }
    if (line.trim() === '') { closeLists(); i++; continue }
    closeLists(); html += `<p>${inline(line)}</p>\n`; i++
  }
  closeLists()
  return `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><style>
@page { margin: 22mm 18mm; }
body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #1a1a1a; font-size: 11pt; line-height: 1.5; }
h1 { font-size: 20pt; border-bottom: 3px solid #7C3AED; padding-bottom: 6px; }
h2 { font-size: 14pt; color: #7C3AED; margin-top: 22px; }
h3 { font-size: 12pt; margin-top: 16px; }
table { border-collapse: collapse; width: 100%; margin: 12px 0; font-size: 10pt; }
th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; vertical-align: top; }
th { background: #f3effc; }
blockquote { border-left: 4px solid #A855F7; background: #faf8ff; margin: 12px 0; padding: 8px 14px; color: #444; }
code { background: #f0f0f3; padding: 1px 5px; border-radius: 3px; font-size: 9.5pt; }
hr { border: none; border-top: 1px solid #ddd; margin: 18px 0; }
a { color: #7C3AED; }
li { margin: 3px 0; }
</style></head><body>${html}</body></html>`
}

function findChrome() {
  const candidates = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
  ]
  return candidates.find((c) => existsSync(c)) || null
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const db = await fetchTenant()

  // Resolve every field: explicit CLI flag > database > placeholder.
  const company = args.company || db?.company
  if (!company) {
    console.error('❌ Firmenname fehlt. Gib --company "…" an oder nutze --tenant-slug/--tenant-id.')
    process.exit(1)
  }

  const slug = args.slug || args['tenant-slug'] || company.toLowerCase()
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

  const today = new Date()
  const effective = args.date || today.toISOString().slice(0, 10)
  const review = args.review ||
    `${today.getFullYear() + 1}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const ph = (label, val) => val || `[BITTE AUSFÜLLEN: ${label}]`

  const replacements = {
    COMPANY_NAME:    company,
    COMPANY_ADDRESS: ph('Adresse', args.address || db?.address),
    COMPANY_UID:     ph('UID', args.uid || db?.uid),
    CONTACT_EMAIL:   ph('Kontakt-E-Mail', args.email || db?.email),
    APPROVER_NAME:   ph('Name Unterzeichner', args.approver || db?.approver),
    APPROVER_TITLE:  ph('Funktion', args.title),
    EFFECTIVE_DATE:  effective,
    REVIEW_DATE:     review,
  }

  const fill = (template) => template.replace(/\{\{(\w+)\}\}/g, (_, k) =>
    k in replacements ? replacements[k] : `{{${k}}}`)

  const outDir = join(root, 'docs', 'pci', slug)
  mkdirSync(outDir, { recursive: true })

  const docs = [
    { tpl: 'PCI_COMPLIANCE_POLICY.de.template.md', out: 'PCI-Compliance-Richtlinie' },
    { tpl: 'PCI_INCIDENT_RESPONSE_PLAN.de.template.md', out: 'PCI-Incident-Response-Plan' },
  ]

  const chrome = args.pdf ? findChrome() : null
  if (args.pdf && !chrome) console.warn('⚠️  Kein Chromium-Browser gefunden — überspringe PDF-Erzeugung.')

  console.log(`\n📄 PCI-Dokumente für: ${company}  (slug: ${slug})`)
  if (db) console.log(`   ↳ Daten aus tenants-Tabelle übernommen.`)
  if (db?.usedDisplayFallback) console.log(`   ⚠️  Kein legal_company_name in DB — Anzeigename "${db.displayName}" als Fallback verwendet.`)
  console.log('')

  for (const d of docs) {
    const filled = fill(readFileSync(join(templatesDir, d.tpl), 'utf-8'))
    const mdPath = join(outDir, `${d.out}_${slug}.md`)
    writeFileSync(mdPath, filled)
    console.log(`   ✓ ${mdPath.replace(root + '/', '')}`)

    if (chrome) {
      const htmlPath = join(outDir, `.${d.out}_${slug}.html`)
      const pdfPath = join(outDir, `${d.out}_${slug}.pdf`)
      writeFileSync(htmlPath, mdToHtml(filled))
      try {
        execFileSync(chrome, ['--headless=new', '--disable-gpu', `--print-to-pdf=${pdfPath}`, `file://${htmlPath}`], { stdio: 'ignore' })
        console.log(`   ✓ ${pdfPath.replace(root + '/', '')}`)
      } catch (e) {
        console.warn(`   ⚠️  PDF fehlgeschlagen für ${d.out}: ${e.message}`)
      } finally {
        try { rmSync(htmlPath, { force: true }) } catch { /* ignore */ }
      }
    }
  }

  const missing = Object.entries(replacements).filter(([, v]) => String(v).startsWith('[BITTE AUSFÜLLEN'))
  if (missing.length) {
    console.log('\n⚠️  Noch offene Platzhalter (per Flag ergänzen oder im Tenant nachtragen):')
    for (const [k] of missing) console.log(`     - ${k}`)
  } else {
    console.log('\n✅ Alle Felder vollständig — versandbereit.')
  }
  console.log('')
}

main().catch((err) => { console.error('\n❌ Fehler:', err); process.exit(1) })
