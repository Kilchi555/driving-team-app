import { CapacitorConfig } from '@capacitor/cli'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Which client are we building? Defaults to driving-team for local dev.
const clientId = process.env.CLIENT || 'driving-team'

const configPath = join(__dirname, `clients/${clientId}/config.json`)
const client = JSON.parse(readFileSync(configPath, 'utf-8'))

const config: CapacitorConfig = {
  appId: client.bundleId,
  appName: client.appName,
  webDir: 'dist',

  server: {
    // Uncomment for local hot-reload during development:
    // url: 'http://192.168.x.x:3000',
    // cleartext: true,
  },

  ios: {
    scheme: client.scheme,
    backgroundColor: client.backgroundColor,
    deploymentTarget: client.ios?.deploymentTarget || '16.0',
    contentInset: 'automatic',
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
      style: 'Light',
      backgroundColor: client.backgroundColor,
    },
  },
}

export default config
