# White-Label App System — Setup Guide

> **Ziel:** Jede Fahrschule bekommt ihre eigene gebrandete App im App Store und Google Play — vollständig automatisiert nach einmaliger Einrichtung.

---

## Architektur-Übersicht

```
clients/
  driving-team/          ← Deine eigene App (Referenz)
    config.json          ← App-Konfiguration
    icon.png             ← 1024×1024px App-Icon
    splash.png           ← 2732×2732px Splash Screen (optional)

  alpenblick/            ← White-Label Kunde 1
    config.json
    icon.png
    splash.png

.github/workflows/
  build-ios.yml          ← iOS-Build-Pipeline (Matrix über alle Clients)
  build-android.yml      ← Android-Build-Pipeline

fastlane/
  Fastfile               ← iOS Build + TestFlight/AppStore Upload
  Appfile                ← Credential-Konfiguration

scripts/
  build-client.sh        ← Lokaler Build (Entwicklung)
  generate-icons.mjs     ← Icon/Splash-Generierung aus logo.png
  bump-version.sh        ← Version bumpen + Git-Tag erstellen

server/api/whitelabel/
  create-app.post.ts     ← API: Neue App anlegen + Build triggern
```

---

## Einmalige Einrichtung (ca. 1 Tag)

### 1. Apple Developer Account vorbereiten

```bash
# App Store Connect API Key erstellen (kein 2FA in CI nötig!)
# → https://appstoreconnect.apple.com/access/api
# → "Keys" → "+ New" → "Admin" Rolle
# → Key-ID notieren, .p8-Datei herunterladen
```

### 2. Fastlane Match Repo erstellen

```bash
# Privates GitHub-Repo für Zertifikate erstellen: z.B. "simy-certificates"
# Dann Match initialisieren:
fastlane match init
# → Git URL eingeben: https://github.com/Kilchi555/simy-certificates.git
# → Passwort wählen (MATCH_PASSWORD) → sicher speichern!
```

### 3. Erste Zertifikate erstellen

```bash
CLIENT=driving-team fastlane ios sync_certificates
# → Erstellt iOS Distribution Certificate + Provisioning Profile
# → Speichert verschlüsselt im Match-Repo
```

### 4. App Store Connect: Erste App anlegen

```bash
# Automatisch via Fastlane:
CLIENT=driving-team fastlane ios create_app

# ODER manuell:
# → https://appstoreconnect.apple.com → "My Apps" → "+"
# → Bundle ID: ch.drivingteam.app
# → Name: Driving Team
```

### 5. Google Play: Service Account erstellen

```bash
# → Google Play Console → Setup → API access
# → Link to Google Cloud Project
# → Create Service Account → Grant "Release manager" role
# → Download JSON key → Wird zu GOOGLE_PLAY_JSON_KEY Secret
```

### 6. Android Keystore erstellen (einmalig pro Client)

```bash
# Für driving-team:
keytool -genkey -v \
  -keystore driving-team-release.keystore \
  -alias driving-team \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -storepass DEIN_PASSWORT \
  -keypass DEIN_KEY_PASSWORT \
  -dname "CN=Driving Team, OU=Mobile, O=Simy, L=Zurich, S=ZH, C=CH"

# Base64 für GitHub Secret:
base64 -i driving-team-release.keystore | tr -d '\n'
# → Wird zu KEYSTORE_BASE64_DRIVING_TEAM
```

---

## GitHub Secrets einrichten

Unter: `https://github.com/Kilchi555/driving-team-app/settings/secrets/actions`

### Shared Secrets (einmalig, für alle Clients)

| Secret Name | Wert | Beschreibung |
|---|---|---|
| `APPLE_TEAM_ID` | `XXXXXXXXXX` | 10-stellige Apple Team ID |
| `APPLE_API_KEY_ID` | `XXXXXXXXXX` | App Store Connect API Key ID |
| `APPLE_API_ISSUER_ID` | `XXXXXXXX-XXXX-...` | App Store Connect Issuer UUID |
| `APPLE_API_KEY_CONTENT` | base64(.p8) | `base64 -i AuthKey_*.p8 \| tr -d '\n'` |
| `MATCH_GIT_URL` | `https://github.com/...` | URL des Certificate-Repos |
| `MATCH_PASSWORD` | `****` | Verschlüsselungspasswort für Match |
| `MATCH_GIT_TOKEN` | `ghp_...` | GitHub PAT mit Repo-Zugriff auf Match-Repo |
| `GOOGLE_PLAY_JSON_KEY` | `{...}` | Google Service Account JSON (minified) |
| `SUPABASE_URL` | `https://...supabase.co` | Supabase Project URL |
| `SUPABASE_ANON_KEY` | `eyJ...` | Supabase Anon Key |
| `GITHUB_PAT` | `ghp_...` | PAT für workflow_dispatch aus der API |

### Per-Client Secrets (Android Keystore)

Namenskonvention: `KEYSTORE_BASE64_<CLIENT_SLUG_UPPERCASE>` (Bindestriche → Unterstriche)

| Secret Name | Beispiel | Beschreibung |
|---|---|---|
| `KEYSTORE_BASE64_DRIVING_TEAM` | base64(keystore) | Keystore-Datei als Base64 |
| `KEYSTORE_PASSWORD_DRIVING_TEAM` | `****` | Keystore-Passwort |
| `KEYSTORE_KEY_PASSWORD_DRIVING_TEAM` | `****` | Key-Passwort |
| `KEYSTORE_BASE64_ALPENBLICK` | base64(keystore) | Keystore für Alpenblick |
| `KEYSTORE_PASSWORD_ALPENBLICK` | `****` | |
| `KEYSTORE_KEY_PASSWORD_ALPENBLICK` | `****` | |

---

## Neue Fahrschule hinzufügen

### Schritt 1: Client-Ordner erstellen

```bash
# Config aus Template kopieren:
cp -r clients/_template clients/alpenblick

# Config anpassen:
# clients/alpenblick/config.json
{
  "clientId": "alpenblick",
  "appName": "Fahrschule Alpenblick",
  "bundleId": "ch.alpenblick.app",
  "tenantSlug": "alpenblick",
  "tier": "whitelabel",
  "primaryColor": "#1a3a6e",
  ...
}

# Logo einfügen (1024×1024px PNG):
cp /pfad/zum/logo.png clients/alpenblick/icon.png
```

### Schritt 2: Zertifikat erstellen

```bash
CLIENT=alpenblick fastlane ios sync_certificates
# → Erstellt App ID ch.alpenblick.app in Developer Portal
# → Erstellt Provisioning Profile
# → Speichert in Match-Repo
```

### Schritt 3: App Store Connect Eintrag

```bash
CLIENT=alpenblick fastlane ios create_app
```

### Schritt 4: Android Keystore erstellen + Secrets hinzufügen

```bash
keytool -genkey -v -keystore alpenblick.keystore -alias alpenblick ...
# → KEYSTORE_BASE64_ALPENBLICK Secret in GitHub hinzufügen
```

### Schritt 5: Build triggern

```bash
# Via GitHub Actions UI:
# Actions → "Build White-Label iOS App" → Run workflow → client: alpenblick

# ODER via Simy Admin Panel → "App erstellen" Button
# ODER via API:
curl -X POST https://simy.ch/api/whitelabel/create-app \
  -H "Authorization: Bearer TOKEN" \
  -d '{"tenantId": "TENANT_UUID"}'
```

**Resultat:**
- iOS: In ~20 Min auf TestFlight, nach Apple Review (1–3 Tage) im App Store
- Android: Sofort im internen Play Store Track

---

## Lokale Entwicklung

```bash
# Single client bauen und lokal testen:
./scripts/build-client.sh driving-team

# iOS in Xcode öffnen:
npx cap open ios

# Android in Android Studio öffnen:
npx cap open android

# Version bumpen (patch/minor/major):
./scripts/bump-version.sh patch
# → Bumpt package.json + alle client configs + erstellt Git-Tag
# → Tag-Push triggert automatisch alle CI/CD-Builds
```

---

## Automatischer Zero-Touch Flow (via Simy Admin)

```
1. Admin-Seite: Fahrschule klickt "White-Label App aktivieren"
2. Formular: Schulname, Logo-Upload, Primärfarbe, Beschreibung
3. POST /api/whitelabel/create-app
   → Speichert Config in Supabase (app_configs)
   → Triggert GitHub Actions via workflow_dispatch API
4. GitHub Actions:
   → Liest Config aus Supabase
   → Baut App mit Schulen-Branding
   → iOS → TestFlight (sofort)
   → Android → Play Store internal (sofort)
5. Apple Review: 1–3 Tage (automatisch, kein Eingriff nötig)
6. E-Mail an Fahrschule: "Deine App ist jetzt live!"
```

**Dein Aufwand nach einmaliger Einrichtung: 0 Minuten pro Schule**

---

## Supabase: app_configs Tabelle

```sql
CREATE TABLE app_configs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid REFERENCES tenants(id) UNIQUE,
  client_id       text NOT NULL,
  config          jsonb NOT NULL,
  build_status    text DEFAULT 'pending',
  -- pending | building | testflight | live | failed
  build_triggered_at  timestamptz,
  ios_live_at         timestamptz,
  android_live_at     timestamptz,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- RLS: nur Platform-Admins
ALTER TABLE app_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "platform_admin_only" ON app_configs
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

---

## Troubleshooting

**"No provisioning profile found"**
```bash
CLIENT=alpenblick fastlane ios sync_certificates
# → Erzwingt neues Profil im Match-Repo
```

**"Bundle ID already exists"**
→ App Store Connect → deinen Account → die App bereits manuell angelegt? Dann `create_app` überspringen.

**Build schlägt fehl (GitHub Actions)**
→ Actions Tab → fehlgeschlagenen Run → Logs lesen
→ Häufigste Ursache: Fehlendes GitHub Secret

**Apple Review: App abgelehnt**
→ Typische Gründe: Fehlende Datenschutzerklärung-URL, fehlende NSUsageDescription
→ In `clients/{client}/config.json`: `privacyPolicyUrl` muss erreichbar sein

---

*Letzte Aktualisierung: Mai 2026*
