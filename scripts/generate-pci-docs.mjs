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
import {
  PCI_DOCS,
  buildReplacements,
  fillTemplate,
  mdToHtml,
  htmlDocument,
} from '../server/templates/pci-templates.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

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

  const replacements = buildReplacements({
    company,
    address: args.address || db?.address,
    uid: args.uid || db?.uid,
    email: args.email || db?.email,
    approver: args.approver || db?.approver,
    title: args.title,
    effectiveDate: args.date,
    reviewDate: args.review,
  })

  const outDir = join(root, 'docs', 'pci', slug)
  mkdirSync(outDir, { recursive: true })

  const chrome = args.pdf ? findChrome() : null
  if (args.pdf && !chrome) console.warn('⚠️  Kein Chromium-Browser gefunden — überspringe PDF-Erzeugung.')

  console.log(`\n📄 PCI-Dokumente für: ${company}  (slug: ${slug})`)
  if (db) console.log(`   ↳ Daten aus tenants-Tabelle übernommen.`)
  if (db?.usedDisplayFallback) console.log(`   ⚠️  Kein legal_company_name in DB — Anzeigename "${db.displayName}" als Fallback verwendet.`)
  console.log('')

  for (const d of PCI_DOCS) {
    const filled = fillTemplate(d.template, replacements)
    const mdPath = join(outDir, `${d.filenameBase}_${slug}.md`)
    writeFileSync(mdPath, filled)
    console.log(`   ✓ ${mdPath.replace(root + '/', '')}`)

    if (chrome) {
      const htmlPath = join(outDir, `.${d.filenameBase}_${slug}.html`)
      const pdfPath = join(outDir, `${d.filenameBase}_${slug}.pdf`)
      writeFileSync(htmlPath, htmlDocument(mdToHtml(filled), { title: d.title }))
      try {
        execFileSync(chrome, ['--headless=new', '--disable-gpu', `--print-to-pdf=${pdfPath}`, `file://${htmlPath}`], { stdio: 'ignore' })
        console.log(`   ✓ ${pdfPath.replace(root + '/', '')}`)
      } catch (e) {
        console.warn(`   ⚠️  PDF fehlgeschlagen für ${d.filenameBase}: ${e.message}`)
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
