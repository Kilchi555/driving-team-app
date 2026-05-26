// Serves /.well-known/apple-app-site-association for iOS Universal Links and
// /.well-known/assetlinks.json for Android App Links.
//
// We use a middleware (instead of server/routes/.well-known/*) because Nuxt's
// file-based router skips directories whose name starts with a dot.
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
}

const ANDROID_ASSETLINKS = [
  {
    relation: ['delegate_permission/common.handle_all_urls'],
    target: {
      namespace: 'android_app',
      package_name: 'ch.simy.app',
      // sha256_cert_fingerprints will be filled once Google Play signing is set up
      sha256_cert_fingerprints: [],
    },
  },
]

export default defineEventHandler((event) => {
  const url = event.node.req.url || ''

  if (url === '/.well-known/apple-app-site-association' || url.startsWith('/.well-known/apple-app-site-association?')) {
    setHeader(event, 'Content-Type', 'application/json')
    setHeader(event, 'Cache-Control', 'public, max-age=3600')
    return APPLE_APP_SITE_ASSOCIATION
  }

  if (url === '/.well-known/assetlinks.json' || url.startsWith('/.well-known/assetlinks.json?')) {
    setHeader(event, 'Content-Type', 'application/json')
    setHeader(event, 'Cache-Control', 'public, max-age=3600')
    return ANDROID_ASSETLINKS
  }
})
