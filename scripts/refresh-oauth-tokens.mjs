/**
 * Google OAuth Token Refresher
 *
 * Usage:
 *   node scripts/refresh-oauth-tokens.mjs
 *
 * You will be prompted for your OAuth client credentials.
 * The script opens the auth URL in your browser, you paste the code,
 * and it prints the new refresh token to paste into Vercel.
 */
import { createInterface } from 'readline'
import { createServer } from 'http'
import { exec } from 'child_process'

const rl = createInterface({ input: process.stdin, output: process.stdout })
const ask = (q) => new Promise((res) => rl.question(q, res))

async function getRefreshToken({ clientId, clientSecret, scope, service }) {
  const redirectUri = 'http://localhost:9988/oauth/callback'

  const authUrl =
    `https://accounts.google.com/o/oauth2/v2/auth` +
    `?client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent(scope)}` +
    `&access_type=offline` +
    `&prompt=consent`

  console.log(`\n📂 Öffne Browser für ${service} ...`)
  console.log(`\nFalls der Browser nicht öffnet, kopiere diese URL:\n${authUrl}\n`)
  exec(`open "${authUrl}"`)

  // Local callback server
  const code = await new Promise((resolve) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url, 'http://localhost:9988')
      const code = url.searchParams.get('code')
      if (code) {
        res.end('<h1>✅ Autorisierung erfolgreich! Schliesse diesen Tab.</h1>')
        server.close()
        resolve(code)
      } else {
        res.end('<h1>❌ Kein Code empfangen.</h1>')
        server.close()
        resolve(null)
      }
    })
    server.listen(9988, () => console.log('🔗 Warte auf Callback auf Port 9988 ...'))
  })

  if (!code) throw new Error('Kein Autorisierungscode empfangen')

  // Exchange code for refresh token
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })
  const tokenData = await tokenRes.json()
  if (!tokenData.refresh_token) {
    console.error('Token Response:', tokenData)
    throw new Error('Kein Refresh Token erhalten')
  }
  return tokenData.refresh_token
}

async function main() {
  console.log('=================================================')
  console.log('  Google OAuth Token Refresher')
  console.log('=================================================')
  console.log('Werte findest du in Vercel → Settings → Env Vars\n')

  const choice = await ask(
    'Was möchtest du erneuern?\n  1) Google Search Console\n  2) Google Ads\n  3) Beide\nEingabe (1/2/3): '
  )

  if (choice === '1' || choice === '3') {
    console.log('\n--- Google Search Console ---')
    const clientId = await ask('GOOGLE_OAUTH_CLIENT_ID: ')
    const clientSecret = await ask('GOOGLE_OAUTH_CLIENT_SECRET: ')
    const token = await getRefreshToken({
      clientId: clientId.trim(),
      clientSecret: clientSecret.trim(),
      scope: 'https://www.googleapis.com/auth/webmasters.readonly',
      service: 'Search Console',
    })
    console.log('\n✅ Neues GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN:')
    console.log(`\n  ${token}\n`)
    console.log('→ In Vercel unter GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN eintragen.')
  }

  if (choice === '2' || choice === '3') {
    console.log('\n--- Google Ads ---')
    const clientId = await ask('GOOGLE_ADS_CLIENT_ID: ')
    const clientSecret = await ask('GOOGLE_ADS_CLIENT_SECRET: ')
    const token = await getRefreshToken({
      clientId: clientId.trim(),
      clientSecret: clientSecret.trim(),
      scope: 'https://www.googleapis.com/auth/adwords',
      service: '  Google Ads',
    })
    console.log('\n✅ Neues GOOGLE_ADS_REFRESH_TOKEN:')
    console.log(`\n  ${token}\n`)
    console.log('→ In Vercel unter GOOGLE_ADS_REFRESH_TOKEN eintragen.')
  }

  console.log('\n🎉 Fertig! Nach dem Eintragen in Vercel kurz warten bis Vercel redeploys.')
  console.log('Dann die Crons manuell testen.\n')
  rl.close()
}

main().catch((err) => {
  console.error('\n❌ Fehler:', err.message)
  rl.close()
  process.exit(1)
})
