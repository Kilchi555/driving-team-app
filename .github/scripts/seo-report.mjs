#!/usr/bin/env node
/**
 * Weekly SEO Report — Google Search Console + Resend
 *
 * Fetches last 7 days vs previous 7 days from GSC Search Analytics,
 * analyses performance changes, and sends a formatted HTML email via Resend.
 *
 * Required env vars (GitHub Secrets):
 *   GSC_SERVICE_ACCOUNT_JSON   Full JSON string of Google service account key
 *   GSC_PROPERTY_URL           e.g. "sc-domain:drivingteam.ch"
 *   RESEND_API_KEY             Resend API key
 *   REPORT_EMAIL               Recipient email (e.g. pascal@drivingteam.ch)
 */

import { google } from 'googleapis';

// ── Config ──────────────────────────────────────────────────────────────────
const PROPERTY    = process.env.GSC_PROPERTY_URL;
const RESEND_KEY  = process.env.RESEND_API_KEY;
const TO_EMAIL    = process.env.REPORT_EMAIL;
const SA_JSON     = process.env.GSC_SERVICE_ACCOUNT_JSON;

if (!PROPERTY || !RESEND_KEY || !TO_EMAIL || !SA_JSON) {
  console.error('❌ Missing required env vars');
  process.exit(1);
}

// ── Date helpers ─────────────────────────────────────────────────────────────
function toISO(date) {
  return date.toISOString().split('T')[0];
}

const today      = new Date();
const thisEnd    = new Date(today); thisEnd.setDate(today.getDate() - 1);
const thisStart  = new Date(today); thisStart.setDate(today.getDate() - 7);
const prevEnd    = new Date(today); prevEnd.setDate(today.getDate() - 8);
const prevStart  = new Date(today); prevStart.setDate(today.getDate() - 14);

const THIS_WEEK  = { startDate: toISO(thisStart),  endDate: toISO(thisEnd)  };
const PREV_WEEK  = { startDate: toISO(prevStart),  endDate: toISO(prevEnd)  };

// ── GSC Auth ─────────────────────────────────────────────────────────────────
const credentials = JSON.parse(SA_JSON);
const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
});
const sc = google.webmasters({ version: 'v3', auth });

// ── GSC Queries ───────────────────────────────────────────────────────────────
async function queryGSC(dateRange, dimensions, rowLimit = 25) {
  const res = await sc.searchanalytics.query({
    siteUrl: PROPERTY,
    requestBody: {
      ...dateRange,
      dimensions,
      rowLimit,
      dataState: 'final',
    },
  });
  return res.data.rows || [];
}

async function fetchData() {
  console.log('📡 Fetching GSC data...');

  const [thisQueries, prevQueries, thisPages, sitemaps] = await Promise.all([
    queryGSC(THIS_WEEK, ['query'], 50),
    queryGSC(PREV_WEEK, ['query'], 50),
    queryGSC(THIS_WEEK, ['page'],  20),
    sc.sitemaps.list({ siteUrl: PROPERTY }).then(r => r.data.sitemap || []),
  ]);

  return { thisQueries, prevQueries, thisPages, sitemaps };
}

// ── Analysis ─────────────────────────────────────────────────────────────────
function analyseKeywords(thisWeek, prevWeek) {
  const prevMap = Object.fromEntries(prevWeek.map(r => [r.keys[0], r]));

  const enriched = thisWeek.map(r => {
    const kw    = r.keys[0];
    const prev  = prevMap[kw];
    return {
      keyword:      kw,
      clicks:       r.clicks,
      impressions:  r.impressions,
      ctr:          (r.ctr * 100).toFixed(1),
      position:     r.position.toFixed(1),
      posDelta:     prev ? (prev.position - r.position).toFixed(1) : null,
      clicksDelta:  prev ? r.clicks - prev.clicks : null,
    };
  });

  const gainers = enriched
    .filter(r => r.posDelta !== null && parseFloat(r.posDelta) > 0.5)
    .sort((a, b) => parseFloat(b.posDelta) - parseFloat(a.posDelta))
    .slice(0, 5);

  const losers = enriched
    .filter(r => r.posDelta !== null && parseFloat(r.posDelta) < -0.5)
    .sort((a, b) => parseFloat(a.posDelta) - parseFloat(b.posDelta))
    .slice(0, 5);

  // High impressions, low CTR → quick-win opportunities
  const opportunities = enriched
    .filter(r => r.impressions > 50 && parseFloat(r.ctr) < 3 && parseFloat(r.position) <= 15)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 5);

  return { top: enriched.slice(0, 10), gainers, losers, opportunities };
}

function analyseSummary(thisWeek, prevWeek) {
  const sum = arr => arr.reduce((acc, r) => ({
    clicks:      acc.clicks      + r.clicks,
    impressions: acc.impressions + r.impressions,
  }), { clicks: 0, impressions: 0 });

  const t = sum(thisWeek);
  const p = sum(prevWeek);

  return {
    clicks:       t.clicks,
    impressions:  t.impressions,
    clicksDelta:  t.clicks      - p.clicks,
    impDelta:     t.impressions - p.impressions,
    avgCtr:       t.impressions > 0 ? ((t.clicks / t.impressions) * 100).toFixed(1) : '0',
  };
}

// ── HTML Email ───────────────────────────────────────────────────────────────
function delta(val, unit = '') {
  if (val === null) return '';
  const n = parseFloat(val);
  if (n > 0) return `<span style="color:#16a34a">▲ ${Math.abs(n)}${unit}</span>`;
  if (n < 0) return `<span style="color:#dc2626">▼ ${Math.abs(n)}${unit}</span>`;
  return `<span style="color:#6b7280">= 0</span>`;
}

function kwRows(rows, showDelta = true) {
  return rows.map(r => `
    <tr>
      <td style="padding:8px 12px;font-size:13px;color:#111">${r.keyword}</td>
      <td style="padding:8px 12px;font-size:13px;text-align:right">${r.clicks}${showDelta ? ' ' + delta(r.clicksDelta) : ''}</td>
      <td style="padding:8px 12px;font-size:13px;text-align:right">${r.impressions.toLocaleString('de-CH')}</td>
      <td style="padding:8px 12px;font-size:13px;text-align:right">${r.ctr}%</td>
      <td style="padding:8px 12px;font-size:13px;text-align:right">${r.position}${showDelta ? ' ' + delta(r.posDelta, ' Pl.') : ''}</td>
    </tr>`).join('');
}

function tableHeader(cols) {
  return `<tr style="background:#f8fafc">${cols.map(c =>
    `<th style="padding:8px 12px;font-size:12px;font-weight:600;color:#6b7280;text-align:${c.align||'left'};text-transform:uppercase;letter-spacing:0.05em">${c.label}</th>`
  ).join('')}</tr>`;
}

function pageRows(pages) {
  return pages.map(r => `
    <tr>
      <td style="padding:8px 12px;font-size:12px;color:#2563eb;word-break:break-all">${r.keys[0].replace('https://drivingteam.ch','')}</td>
      <td style="padding:8px 12px;font-size:13px;text-align:right">${r.clicks}</td>
      <td style="padding:8px 12px;font-size:13px;text-align:right">${r.impressions.toLocaleString('de-CH')}</td>
      <td style="padding:8px 12px;font-size:13px;text-align:right">${(r.ctr * 100).toFixed(1)}%</td>
      <td style="padding:8px 12px;font-size:13px;text-align:right">${r.position.toFixed(1)}</td>
    </tr>`).join('');
}

function buildEmail({ summary, keywords, pages, sitemaps, dateRange }) {
  const smInfo = sitemaps.length > 0
    ? `${sitemaps[0].contents?.[0]?.submitted ?? '?'} eingereicht / ${sitemaps[0].contents?.[0]?.indexed ?? '?'} indexiert`
    : 'Keine Sitemap-Daten';

  return `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">
<div style="max-width:680px;margin:0 auto;padding:24px 16px">

  <!-- Header -->
  <div style="background:#1e40af;border-radius:12px 12px 0 0;padding:28px 32px">
    <p style="margin:0;color:#93c5fd;font-size:12px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase">Driving Team · Wöchentlicher SEO Report</p>
    <h1 style="margin:8px 0 4px;color:#fff;font-size:22px;font-weight:700">Performance ${dateRange}</h1>
    <p style="margin:0;color:#bfdbfe;font-size:13px">drivingteam.ch · Vergleich Vorwoche</p>
  </div>

  <!-- Summary Stats -->
  <div style="background:#fff;padding:24px 32px;display:flex;gap:0;border-bottom:1px solid #e2e8f0">
    <table width="100%"><tr>
      <td style="text-align:center;padding:0 16px">
        <p style="margin:0;font-size:28px;font-weight:700;color:#111">${summary.clicks.toLocaleString('de-CH')}</p>
        <p style="margin:4px 0 0;font-size:12px;color:#6b7280">Klicks</p>
        <p style="margin:2px 0 0;font-size:12px">${delta(summary.clicksDelta)} vs Vorwoche</p>
      </td>
      <td style="text-align:center;padding:0 16px;border-left:1px solid #e2e8f0">
        <p style="margin:0;font-size:28px;font-weight:700;color:#111">${summary.impressions.toLocaleString('de-CH')}</p>
        <p style="margin:4px 0 0;font-size:12px;color:#6b7280">Impressionen</p>
        <p style="margin:2px 0 0;font-size:12px">${delta(summary.impDelta)} vs Vorwoche</p>
      </td>
      <td style="text-align:center;padding:0 16px;border-left:1px solid #e2e8f0">
        <p style="margin:0;font-size:28px;font-weight:700;color:#111">${summary.avgCtr}%</p>
        <p style="margin:4px 0 0;font-size:12px;color:#6b7280">Ø CTR</p>
      </td>
      <td style="text-align:center;padding:0 16px;border-left:1px solid #e2e8f0">
        <p style="margin:0;font-size:28px;font-weight:700;color:#111">${smInfo.split('/')[0].trim()}</p>
        <p style="margin:4px 0 0;font-size:12px;color:#6b7280">URLs in Sitemap</p>
        <p style="margin:2px 0 0;font-size:12px;color:#6b7280">${smInfo.split('/')[1]?.trim() || ''}</p>
      </td>
    </tr></table>
  </div>

  <!-- Top Keywords -->
  <div style="background:#fff;padding:24px 32px;border-bottom:1px solid #e2e8f0">
    <h2 style="margin:0 0 16px;font-size:15px;font-weight:600;color:#111">Top Keywords dieser Woche</h2>
    <table width="100%" style="border-collapse:collapse">
      ${tableHeader([{label:'Keyword'},{label:'Klicks',align:'right'},{label:'Impressionen',align:'right'},{label:'CTR',align:'right'},{label:'Position',align:'right'}])}
      ${kwRows(keywords.top)}
    </table>
  </div>

  <!-- Gewinner & Verlierer -->
  <div style="background:#fff;padding:24px 32px;border-bottom:1px solid #e2e8f0">
    <table width="100%"><tr valign="top">

      <td style="width:50%;padding-right:16px">
        <h2 style="margin:0 0 12px;font-size:15px;font-weight:600;color:#16a34a">Gewinner ▲</h2>
        ${keywords.gainers.length === 0
          ? '<p style="color:#6b7280;font-size:13px">Keine signifikanten Verbesserungen</p>'
          : `<table width="100%" style="border-collapse:collapse">
              ${tableHeader([{label:'Keyword'},{label:'Pos.',align:'right'}])}
              ${keywords.gainers.map(r => `<tr>
                <td style="padding:6px 8px;font-size:12px;color:#111">${r.keyword}</td>
                <td style="padding:6px 8px;font-size:12px;text-align:right">${r.position} ${delta(r.posDelta, '')}</td>
              </tr>`).join('')}
             </table>`
        }
      </td>

      <td style="width:50%;padding-left:16px;border-left:1px solid #e2e8f0">
        <h2 style="margin:0 0 12px;font-size:15px;font-weight:600;color:#dc2626">Verlierer ▼</h2>
        ${keywords.losers.length === 0
          ? '<p style="color:#6b7280;font-size:13px">Keine signifikanten Verschlechterungen</p>'
          : `<table width="100%" style="border-collapse:collapse">
              ${tableHeader([{label:'Keyword'},{label:'Pos.',align:'right'}])}
              ${keywords.losers.map(r => `<tr>
                <td style="padding:6px 8px;font-size:12px;color:#111">${r.keyword}</td>
                <td style="padding:6px 8px;font-size:12px;text-align:right">${r.position} ${delta(r.posDelta, '')}</td>
              </tr>`).join('')}
             </table>`
        }
      </td>
    </tr></table>
  </div>

  <!-- Opportunities -->
  ${keywords.opportunities.length > 0 ? `
  <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:0;padding:24px 32px;border-bottom:1px solid #e2e8f0">
    <h2 style="margin:0 0 4px;font-size:15px;font-weight:600;color:#92400e">Quick Wins — Hohe Impressionen, tiefe CTR</h2>
    <p style="margin:0 0 16px;font-size:12px;color:#78350f">Diese Keywords ranken auf Seite 1, werden aber kaum geklickt. Title/Description optimieren!</p>
    <table width="100%" style="border-collapse:collapse">
      ${tableHeader([{label:'Keyword'},{label:'Impressionen',align:'right'},{label:'CTR',align:'right'},{label:'Pos.',align:'right'}])}
      ${keywords.opportunities.map(r => `<tr>
        <td style="padding:8px 12px;font-size:13px;color:#111">${r.keyword}</td>
        <td style="padding:8px 12px;font-size:13px;text-align:right">${r.impressions.toLocaleString('de-CH')}</td>
        <td style="padding:8px 12px;font-size:13px;text-align:right;color:#dc2626;font-weight:600">${r.ctr}%</td>
        <td style="padding:8px 12px;font-size:13px;text-align:right">${r.position}</td>
      </tr>`).join('')}
    </table>
  </div>` : ''}

  <!-- Top Pages -->
  <div style="background:#fff;padding:24px 32px;border-bottom:1px solid #e2e8f0">
    <h2 style="margin:0 0 16px;font-size:15px;font-weight:600;color:#111">Top Seiten</h2>
    <table width="100%" style="border-collapse:collapse">
      ${tableHeader([{label:'URL'},{label:'Klicks',align:'right'},{label:'Impr.',align:'right'},{label:'CTR',align:'right'},{label:'Pos.',align:'right'}])}
      ${pageRows(pages)}
    </table>
  </div>

  <!-- Footer -->
  <div style="background:#f8fafc;border-radius:0 0 12px 12px;padding:20px 32px;border-top:1px solid #e2e8f0">
    <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center">
      Automatisch generiert · <a href="https://search.google.com/search-console" style="color:#60a5fa">Google Search Console öffnen</a> · <a href="https://drivingteam.ch" style="color:#60a5fa">drivingteam.ch</a>
    </p>
  </div>

</div>
</body>
</html>`;
}

// ── Send via Resend ───────────────────────────────────────────────────────────
async function sendEmail(html, dateRange) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from:    'SEO Report <seo@simy.ch>',
      to:      [TO_EMAIL],
      subject: `SEO Report ${dateRange} — drivingteam.ch`,
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend error ${res.status}: ${err}`);
  }
  console.log('✅ Email sent successfully');
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  try {
    const { thisQueries, prevQueries, thisPages, sitemaps } = await fetchData();

    const summary   = analyseSummary(thisQueries, prevQueries);
    const keywords  = analyseKeywords(thisQueries, prevQueries);
    const dateRange = `${THIS_WEEK.startDate} – ${THIS_WEEK.endDate}`;

    console.log(`📊 Summary: ${summary.clicks} clicks, ${summary.impressions} impressions`);
    console.log(`🔑 Top keyword: ${keywords.top[0]?.keyword || 'n/a'}`);
    console.log(`🚀 Quick wins: ${keywords.opportunities.length} opportunities`);

    const html = buildEmail({ summary, keywords, pages: thisPages, sitemaps, dateRange });
    await sendEmail(html, dateRange);

  } catch (err) {
    console.error('❌ Report failed:', err.message);
    process.exit(1);
  }
}

main();
