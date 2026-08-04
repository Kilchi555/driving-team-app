#!/usr/bin/env node
/**
 * Generate Google Play phone screenshots (1080×1920) for Simy.
 * Usage: node scripts/generate-play-screenshots.mjs
 */
import puppeteer from 'puppeteer'
import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { readFileSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const outDir = join(root, 'clients/simy/store/screenshots')
mkdirSync(outDir, { recursive: true })

const iconB64 = readFileSync(join(root, 'clients/simy/icon.png')).toString('base64')

const W = 1080
const H = 1920

function shell(body, { eyebrow = '', title = '' } = {}) {
  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: ${W}px; height: ${H}px; overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
    background: linear-gradient(165deg, #4C1D95 0%, #5B21B6 40%, #7C3AED 100%);
    color: #0f172a;
  }
  .stage { width: 100%; height: 100%; padding: 72px 56px 56px; display: flex; flex-direction: column; }
  .top { color: #fff; margin-bottom: 36px; }
  .eyebrow {
    display: inline-flex; align-items: center; gap: 10px;
    font-size: 28px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;
    color: #DDD6FE; margin-bottom: 18px;
  }
  .eyebrow .dot { width: 14px; height: 14px; border-radius: 50%; background: #F0ABFC; }
  .headline { font-size: 56px; font-weight: 800; line-height: 1.15; color: #fff; letter-spacing: -0.02em; max-width: 920px; }
  .phone {
    flex: 1; background: #F8FAFC; border-radius: 56px; overflow: hidden;
    box-shadow: 0 40px 80px rgba(0,0,0,.35);
    border: 10px solid #1e1b4b;
    display: flex; flex-direction: column;
    position: relative;
  }
  .notch {
    position: absolute; top: 18px; left: 50%; transform: translateX(-50%);
    width: 220px; height: 36px; background: #1e1b4b; border-radius: 20px; z-index: 5;
  }
  .status {
    height: 78px; padding: 40px 36px 0; display: flex; justify-content: space-between;
    font-size: 24px; font-weight: 600; color: #64748b;
  }
  .content { flex: 1; padding: 8px 32px 40px; overflow: hidden; }
</style>
</head>
<body>
  <div class="stage">
    <div class="top">
      ${eyebrow ? `<div class="eyebrow"><span class="dot"></span>${eyebrow}</div>` : ''}
      <div class="headline">${title}</div>
    </div>
    <div class="phone">
      <div class="notch"></div>
      <div class="status"><span>9:41</span><span>5G · 86%</span></div>
      <div class="content">${body}</div>
    </div>
  </div>
</body>
</html>`
}

const screens = {
  '01-login': {
    eyebrow: 'Eine App · Drei Logins',
    title: 'Die All-In-One App<br>für dein KMU',
    body: `
      <div style="display:flex;flex-direction:column;align-items:center;padding-top:40px;">
        <img src="data:image/png;base64,${iconB64}" width="140" height="140" style="border-radius:32px;margin-bottom:28px"/>
        <div style="font-size:48px;font-weight:800;color:#4C1D95;margin-bottom:8px;">Simy</div>
        <div style="font-size:26px;color:#64748b;margin-bottom:48px;text-align:center;">Mit Kunden, Staff & Admin Logins</div>
        <div style="width:100%;display:flex;flex-direction:column;gap:18px;">
          ${['Kunde / Klient','Staff / Team','Admin'].map((r,i)=>`
            <div style="background:#fff;border:2px solid ${i===0?'#7C3AED':'#E2E8F0'};border-radius:24px;padding:28px 32px;display:flex;align-items:center;gap:22px;box-shadow:${i===0?'0 12px 28px rgba(124,58,237,.18)':'none'};">
              <div style="width:64px;height:64px;border-radius:18px;background:${['#EDE9FE','#DBEAFE','#FCE7F3'][i]};display:flex;align-items:center;justify-content:center;font-size:30px;font-weight:800;color:${['#7C3AED','#2563EB','#DB2777'][i]};">${['K','S','A'][i]}</div>
              <div>
                <div style="font-size:30px;font-weight:700;color:#0f172a;">${r}</div>
                <div style="font-size:22px;color:#64748b;margin-top:4px;">${['Termine buchen & bezahlen','Kalender & Kunden betreuen','Betrieb & Abrechnung steuern'][i]}</div>
              </div>
            </div>`).join('')}
        </div>
        <div style="margin-top:40px;width:100%;background:#7C3AED;color:#fff;text-align:center;padding:28px;border-radius:24px;font-size:30px;font-weight:700;">Anmelden</div>
      </div>`
  },

  '02-client': {
    eyebrow: 'Kunden-Login',
    title: 'Termine buchen.<br>Alles im Griff.',
    body: `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:28px;">
        <div>
          <div style="font-size:26px;color:#64748b;">Hallo Lena 👋</div>
          <div style="font-size:40px;font-weight:800;color:#0f172a;">Dein Dashboard</div>
        </div>
        <div style="width:72px;height:72px;border-radius:50%;background:#EDE9FE;color:#7C3AED;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:28px;">LM</div>
      </div>
      <div style="background:linear-gradient(135deg,#7C3AED,#A855F7);border-radius:28px;padding:36px;color:#fff;margin-bottom:24px;box-shadow:0 16px 32px rgba(124,58,237,.3);">
        <div style="font-size:20px;font-weight:700;letter-spacing:.08em;opacity:.85;margin-bottom:10px;">NÄCHSTER TERMIN</div>
        <div style="font-size:40px;font-weight:800;">Morgen · 14:30</div>
        <div style="font-size:26px;margin-top:8px;opacity:.95;">Personal Training · 60 Min</div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:28px;">
        ${[['3','Offene Termine'],['CHF 180','Guthaben']].map(([v,l])=>`
          <div style="background:#fff;border-radius:22px;padding:28px;box-shadow:0 4px 16px rgba(15,23,42,.06);">
            <div style="font-size:36px;font-weight:800;">${v}</div>
            <div style="font-size:22px;color:#64748b;margin-top:4px;">${l}</div>
          </div>`).join('')}
      </div>
      <div style="font-size:28px;font-weight:700;margin-bottom:16px;">Schnellaktionen</div>
      ${[['📅','Termin buchen'],['💳','Zahlung'],['📄','Rechnungen']].map(([i,t])=>`
        <div style="background:#fff;border-radius:20px;padding:26px 28px;margin-bottom:14px;display:flex;align-items:center;gap:18px;box-shadow:0 2px 10px rgba(15,23,42,.05);">
          <span style="font-size:32px;">${i}</span>
          <span style="font-size:28px;font-weight:600;">${t}</span>
          <span style="margin-left:auto;color:#94a3b8;font-size:32px;">›</span>
        </div>`).join('')}`
  },

  '03-staff': {
    eyebrow: 'Staff-Login',
    title: 'Dein Tag.<br>Klar strukturiert.',
    body: `
      <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:22px;">
        <div style="font-size:44px;font-weight:800;">Heute</div>
        <div style="font-size:26px;color:#64748b;">8 Termine</div>
      </div>
      <div style="background:linear-gradient(135deg,#7C3AED,#A855F7);border-radius:28px;padding:32px;color:#fff;margin-bottom:22px;">
        <div style="font-size:18px;font-weight:700;letter-spacing:.08em;opacity:.85;">NÄCHSTER TERMIN</div>
        <div style="font-size:38px;font-weight:800;margin-top:8px;">09:00 · Lena Meier</div>
        <div style="font-size:24px;margin-top:6px;opacity:.95;">Coaching · 45 Min</div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:26px;">
        ${[['14.5h','Heute'],['12','Offen'],['CHF 4.2k','Woche']].map(([v,l])=>`
          <div style="background:#fff;border-radius:18px;padding:22px 16px;text-align:center;box-shadow:0 2px 12px rgba(15,23,42,.05);">
            <div style="font-size:28px;font-weight:800;">${v}</div>
            <div style="font-size:18px;color:#64748b;margin-top:4px;">${l}</div>
          </div>`).join('')}
      </div>
      <div style="font-size:28px;font-weight:700;margin-bottom:14px;">Tagesplan</div>
      <div style="background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 2px 12px rgba(15,23,42,.05);">
        ${[
          ['10:00','JF','Jonas Frei','Nachhilfe Mathe'],
          ['11:00','SK','Sara Keller','Massage 60\''],
          ['13:30','MB','Max Brunner','Gitarrenstunde'],
          ['15:00','AL','Anna Lutz','Hundetraining'],
        ].map(([t,ini,n,d],i)=>`
          <div style="display:flex;align-items:center;gap:18px;padding:22px 24px;border-top:${i? '1px solid #F1F5F9':'none'};">
            <div style="width:70px;font-size:26px;font-weight:700;color:#7C3AED;">${t}</div>
            <div style="width:52px;height:52px;border-radius:50%;background:#EDE9FE;color:#6D28D9;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:20px;">${ini}</div>
            <div>
              <div style="font-size:26px;font-weight:700;">${n}</div>
              <div style="font-size:20px;color:#64748b;">${d}</div>
            </div>
          </div>`).join('')}
      </div>`
  },

  '04-admin': {
    eyebrow: 'Admin-Login',
    title: 'Betrieb steuern.<br>Zahlen im Blick.',
    body: `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:28px;">
        <div>
          <div style="font-size:26px;color:#64748b;">Studio Alpenblick</div>
          <div style="font-size:40px;font-weight:800;">Admin</div>
        </div>
        <img src="data:image/png;base64,${iconB64}" width="64" height="64" style="border-radius:16px"/>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:28px;">
        ${[
          ['CHF 18.4k','Umsatz Monat','#7C3AED'],
          ['126','Kunden aktiv','#2563EB'],
          ['4','Staff-Mitglieder','#DB2777'],
          ['92%','Auslastung','#059669'],
        ].map(([v,l,c])=>`
          <div style="background:#fff;border-radius:22px;padding:28px;box-shadow:0 4px 16px rgba(15,23,42,.06);border-top:5px solid ${c};">
            <div style="font-size:36px;font-weight:800;">${v}</div>
            <div style="font-size:22px;color:#64748b;margin-top:6px;">${l}</div>
          </div>`).join('')}
      </div>
      <div style="font-size:28px;font-weight:700;margin-bottom:16px;">Verwaltung</div>
      ${[
        ['👥','Team & Standorte'],
        ['💰','Preise & Pakete'],
        ['📊','Auswertungen'],
        ['🧾','Rechnungen & QR'],
      ].map(([i,t])=>`
        <div style="background:#fff;border-radius:20px;padding:26px 28px;margin-bottom:14px;display:flex;align-items:center;gap:18px;box-shadow:0 2px 10px rgba(15,23,42,.05);">
          <span style="font-size:32px;">${i}</span>
          <span style="font-size:28px;font-weight:600;">${t}</span>
          <span style="margin-left:auto;color:#94a3b8;font-size:32px;">›</span>
        </div>`).join('')}
      <div style="margin-top:20px;text-align:center;font-size:22px;color:#64748b;">
        Fahrschule · Coaching · Training · Nachhilfe · …
      </div>`
  },
}

const browser = await puppeteer.launch({
  headless: true,
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
})

const page = await browser.newPage()
await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 })

for (const [name, conf] of Object.entries(screens)) {
  const html = shell(conf.body, { eyebrow: conf.eyebrow, title: conf.title })
  await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 15000 })
  await new Promise((r) => setTimeout(r, 200))
  const out = join(outDir, `${name}.png`)
  await page.screenshot({ path: out, type: 'png', clip: { x: 0, y: 0, width: W, height: H } })
  console.log(`✅ ${name}.png`)
}

await browser.close()
console.log(`\nPlay screenshots → ${outDir}`)
console.log('Upload in Play Console: Store-Eintrag → Smartphone-Screenshots (mind. 2)')
