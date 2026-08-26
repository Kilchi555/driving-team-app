import { config } from 'dotenv'
config()
config({ path: '.env.vercel.production', override: false })
import { reallocateAutoZhWest } from '../utils/gads-reallocate-auto-zh-west'
import { fixLkwMetaIdentity } from '../utils/meta-fix-lkw-identity'

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
  const skipGads = process.argv.includes('--meta-only')
  const skipMeta = process.argv.includes('--gads-only')
  const customerId = (process.env.GOOGLE_ADS_CUSTOMER_ID ?? '').replace(/-/g, '')
  const loginCustomerId = (process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID ?? customerId).replace(/-/g, '')

  if (!skipGads) {
    const accessToken = await getAccessToken()
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
      'login-customer-id': loginCustomerId,
      'Content-Type': 'application/json',
    }
    const gads = await reallocateAutoZhWest({ customerId, headers, dryRun: !apply })
    console.log(JSON.stringify({ google_ads: gads }, null, 2))
  }

  if (!skipMeta) {
    const meta = await fixLkwMetaIdentity({ dryRun: !apply })
    console.log(JSON.stringify({ meta }, null, 2))
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
