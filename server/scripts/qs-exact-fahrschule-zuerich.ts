import { config } from 'dotenv'
config({ path: '.env.vercel.production', override: true })
config({ path: '.env.vercel', override: false })
config()
import { applyQsExactFahrschuleZuerich } from '../utils/gads-qs-exact-fahrschule-zuerich'

async function getAccessToken() {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_ADS_CLIENT_ID!,
      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN!.trim(),
      grant_type: 'refresh_token',
    }),
  })
  const data = await res.json() as any
  if (!data.access_token) throw new Error(JSON.stringify(data))
  return data.access_token as string
}

async function main() {
  const apply = process.argv.includes('--apply')
  const customerId = (process.env.GOOGLE_ADS_CUSTOMER_ID ?? '').replace(/-/g, '')
  const loginCustomerId = (process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID ?? customerId).replace(/-/g, '')
  const accessToken = await getAccessToken()
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
    'login-customer-id': loginCustomerId,
    'Content-Type': 'application/json',
  }
  const report = await applyQsExactFahrschuleZuerich({
    customerId,
    headers,
    dryRun: !apply,
  })
  console.log(JSON.stringify(report, null, 2))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
