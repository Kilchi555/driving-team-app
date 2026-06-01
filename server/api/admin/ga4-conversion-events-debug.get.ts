// Temporary debug endpoint: lists GA4 conversion events via Service Account
// Protected by CRON_SECRET. Delete after use.
import { SignJWT, importPKCS8 } from 'jose'

export default defineEventHandler(async (event) => {
  const authHeader = getHeader(event, 'authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const clientEmail = process.env.GOOGLE_SA_CLIENT_EMAIL
  const privateKeyRaw = process.env.GOOGLE_SA_PRIVATE_KEY?.replace(/\\n/g, '\n')
  const propertyId = process.env.GOOGLE_ANALYTICS_PROPERTY_ID // e.g. "properties/400627759"

  if (!clientEmail || !privateKeyRaw || !propertyId) {
    return { error: 'missing_credentials', clientEmail: !!clientEmail, privateKey: !!privateKeyRaw, propertyId }
  }

  // Build a JWT for the Google API
  const privateKey = await importPKCS8(privateKeyRaw, 'RS256')
  const now = Math.floor(Date.now() / 1000)
  const jwt = await new SignJWT({
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/analytics.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  })
    .setProtectedHeader({ alg: 'RS256' })
    .sign(privateKey)

  // Exchange JWT for access token
  const tokenRes = await $fetch<{ access_token?: string; error?: string }>(
    'https://oauth2.googleapis.com/token',
    {
      method: 'POST',
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    }
  )

  if (!tokenRes.access_token) {
    return { error: 'token_exchange_failed', details: tokenRes }
  }

  // Call GA4 Admin API: list conversion events
  const cleanPropertyId = propertyId.replace('properties/', '')
  const adminRes = await $fetch<{ conversionEvents?: any[]; error?: any }>(
    `https://analyticsadmin.googleapis.com/v1beta/properties/${cleanPropertyId}/conversionEvents`,
    {
      headers: { Authorization: `Bearer ${tokenRes.access_token}` },
    }
  ).catch(err => ({ error: err?.data ?? err?.message }))

  return {
    property: propertyId,
    conversionEvents: (adminRes as any).conversionEvents ?? [],
    raw: adminRes,
  }
})
