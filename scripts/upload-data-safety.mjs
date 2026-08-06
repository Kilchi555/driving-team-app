#!/usr/bin/env node
/**
 * Upload clients/simy/store/data-safety.csv to Google Play via Android Publisher API.
 *
 * Usage:
 *   GOOGLE_PLAY_JSON_KEY="$(cat path/to/key.json)" node scripts/upload-data-safety.mjs
 *   # or
 *   GOOGLE_PLAY_JSON_KEY_FILE=./play-key.json node scripts/upload-data-safety.mjs
 */
import { google } from 'googleapis'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const csvPath = join(__dirname, '../clients/simy/store/data-safety.csv')
const packageName = process.env.PACKAGE_NAME || 'ch.simy.app'

const keyJson = process.env.GOOGLE_PLAY_JSON_KEY
  ? JSON.parse(process.env.GOOGLE_PLAY_JSON_KEY)
  : JSON.parse(readFileSync(process.env.GOOGLE_PLAY_JSON_KEY_FILE || '', 'utf8'))

const auth = new google.auth.GoogleAuth({
  credentials: keyJson,
  scopes: ['https://www.googleapis.com/auth/androidpublisher'],
})
const androidpublisher = google.androidpublisher({ version: 'v3', auth })
const safetyLabels = readFileSync(csvPath, 'utf8')

console.log(`Uploading Data Safety CSV for ${packageName} (${safetyLabels.length} chars)…`)
await androidpublisher.applications.dataSafety({
  packageName,
  requestBody: { safetyLabels },
})
console.log('✅ Data Safety declaration uploaded. Check Play Console → App-Inhalt → Datensicherheit.')
