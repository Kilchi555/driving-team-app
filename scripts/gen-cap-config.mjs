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

const config = {
  appId: client.bundleId,
  appName: client.appName,
  webDir: '.output/public',
  server: client.serverUrl ? { url: client.serverUrl } : {},
  ios: {
    scheme: client.scheme,
    backgroundColor: client.backgroundColor,
    deploymentTarget: client.ios?.deploymentTarget || '16.0',
    contentInset: 'never',
  },
  android: {
    backgroundColor: client.backgroundColor,
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: client.backgroundColor,
      showSpinner: false,
      androidSpinnerStyle: 'small',
      splashFullScreen: true,
      splashImmersive: true,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    StatusBar: {
      style: 'Dark',
      backgroundColor: client.backgroundColor,
    },
  },
}

const outPath = join(root, 'capacitor.config.json')
writeFileSync(outPath, JSON.stringify(config, null, 2) + '\n')
console.log(`✅ capacitor.config.json generated for client: ${clientId}`)
