// Serves /.well-known/apple-app-site-association for iOS Universal Links and
// /.well-known/assetlinks.json for Android App Links.
//
// We use a middleware (instead of server/routes/.well-known/*) because Nuxt's
// file-based router skips directories whose name starts with a dot.
//
// Also blocks /__nitro/* internal endpoints in production to prevent 5xx bot-scan errors.
//
// IMPORTANT: This middleware must run BEFORE other middlewares (hence the 00. prefix).

const APPLE_APP_SITE_ASSOCIATION = {
  applinks: {
    apps: [],
    details: [
      {
        appID: '25H29N3PDT.ch.simy.app',
        paths: ['/payment-callback*', '/customer-dashboard*', '/login*'],
      },
    ],
  },
  // Ties app.simy.ch to this app for iCloud Keychain (matches the
  // webcredentials: entry in ios/App/App/App.entitlements).
  webcredentials: {
    apps: ['25H29N3PDT.ch.simy.app'],
  },
}

/** Normalize "AB:CD:..." / "abcd..." fingerprints to Play assetlinks format. */
function normalizeSha256Fingerprints(raw: string): string[] {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((fp) => {
      const hex = fp.replace(/[^0-9a-fA-F]/g, '').toUpperCase()
      if (hex.length !== 64) return fp.toUpperCase()
      return hex.match(/.{1,2}/g)!.join(':')
    })
}

function buildAndroidAssetLinks(fingerprints: string[]) {
  // Include upload + Play App Signing certs via ANDROID_CERT_SHA256 (comma-separated).
  // See docs/ANDROID_PLAY_SUBMISSION.md §1.4
  return [
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: 'ch.simy.app',
        sha256_cert_fingerprints: fingerprints,
      },
    },
  ]
}

export default defineEventHandler((event) => {
  const url = event.node.req.url || ''

  // Block /__nitro internal endpoints — bots scanning these cause 5xx errors in production.
  // Allow /__nitro/ping through (legitimate Vercel health check).
  if (url.startsWith('/__nitro') && url !== '/__nitro/ping') {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }

  if (url === '/.well-known/apple-app-site-association' || url.startsWith('/.well-known/apple-app-site-association?')) {
    setHeader(event, 'Content-Type', 'application/json')
    setHeader(event, 'Cache-Control', 'public, max-age=3600')
    return APPLE_APP_SITE_ASSOCIATION
  }

  if (url === '/.well-known/assetlinks.json' || url.startsWith('/.well-known/assetlinks.json?')) {
    const config = useRuntimeConfig()
    const fingerprints = normalizeSha256Fingerprints(
      String(config.androidCertSha256 || process.env.ANDROID_CERT_SHA256 || ''),
    )
    setHeader(event, 'Content-Type', 'application/json')
    setHeader(event, 'Cache-Control', 'public, max-age=3600')
    return buildAndroidAssetLinks(fingerprints)
  }
})
