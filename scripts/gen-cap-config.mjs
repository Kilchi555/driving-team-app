#!/usr/bin/env node
/**
 * Generates capacitor.config.json for the given client.
 * Needed because Capacitor CLI can't load .ts configs in ESM projects.
 * Usage: node scripts/gen-cap-config.mjs [client-id]
 */

import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const clientId = process.env.CLIENT || process.argv[2] || 'driving-team'
const configPath = join(root, `clients/${clientId}/config.json`)
const client = JSON.parse(readFileSync(configPath, 'utf-8'))

const plugins = {
  SplashScreen: {
    launchShowDuration: 2000,
    backgroundColor: client.backgroundColor || '#ffffff',
    showSpinner: false,
    androidSpinnerStyle: 'small',
    splashFullScreen: true,
    splashImmersive: true,
  },
  StatusBar: {
    style: 'Default',
    overlaysWebView: true,
  },
}

// Only enable push if the client has explicitly opted in and configured APNs/FCM.
// Without APNs entitlements and google-services.json the app will crash on startup.
if (client.features?.push === true) {
  plugins.PushNotifications = {
    presentationOptions: ['badge', 'sound', 'alert'],
  }
}

// Build the server config.
//  - `url` is required for live-reload / hosted-shell setups (Simy).
//  - `allowNavigation` MUST list every domain the WebView may navigate
//    to internally. Without it Capacitor punts every non-exact-url
//    navigation to SFSafariViewController, which is why you'd see the
//    in-app Safari pop up after login on iOS.
//  - We derive the hostname from the serverUrl and also accept any
//    extra hosts from clients/<id>/config.json -> allowNavigation.
const serverConfig = {}
if (client.serverUrl) {
  serverConfig.url = client.serverUrl
  const baseHost = (() => {
    try { return new URL(client.serverUrl).hostname } catch { return null }
  })()
  const extra = Array.isArray(client.allowNavigation) ? client.allowNavigation : []
  const hosts = Array.from(new Set([baseHost, ...extra].filter(Boolean)))
  if (hosts.length) serverConfig.allowNavigation = hosts
}

const config = {
  appId: client.bundleId,
  appName: client.appName,
  webDir: '.output/public',
  server: serverConfig,
  ios: {
    scheme: client.scheme,
    backgroundColor: client.backgroundColor || '#ffffff',
    deploymentTarget: client.ios?.deploymentTarget || '16.0',
    contentInset: 'never',
  },
  android: {
    backgroundColor: client.backgroundColor || '#ffffff',
    allowMixedContent: false,
  },
  plugins,
}

const outPath = join(root, 'capacitor.config.json')
writeFileSync(outPath, JSON.stringify(config, null, 2) + '\n')
console.log(`✅ capacitor.config.json generated for client: ${clientId}`)
