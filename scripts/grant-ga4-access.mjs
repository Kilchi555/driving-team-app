// One-time script: grants the analytics-sync service account "Analyst" access to the GA4 property.
// Run with: node scripts/grant-ga4-access.mjs
// Requires: node >= 18, @google-analytics/admin already installed
// Uses your personal Google credentials via gcloud: run `gcloud auth application-default login` first.

import { AnalyticsAdminServiceClient } from '@google-analytics/admin'

const PROPERTY_ID = process.env.GA4_PROPERTY_ID // e.g. properties/391234567
const SERVICE_ACCOUNT_EMAIL = 'analytics-sync@driving-team-app.iam.gserviceaccount.com'

if (!PROPERTY_ID) {
  console.error('Set GA4_PROPERTY_ID=properties/XXXXXXXXX before running this script.')
  process.exit(1)
}

const client = new AnalyticsAdminServiceClient()

try {
  const [binding] = await client.createAccessBinding({
    parent: PROPERTY_ID,
    accessBinding: {
      user: SERVICE_ACCOUNT_EMAIL,
      roles: ['predefinedRoles/analyst'],
    },
  })
  console.log('✅ Access granted:', binding.name)
} catch (err) {
  console.error('❌ Error:', err.message)
}
