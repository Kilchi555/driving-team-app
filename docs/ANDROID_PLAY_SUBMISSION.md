# Simy – Google Play Submission Checklist

End-to-end Guide für die Erst-Submission der **Simy Android App** (`ch.simy.app`).
iOS-Pendant: [`APP_STORE_SUBMISSION.md`](./APP_STORE_SUBMISSION.md).

Technisch: Capacitor 8 WebView-Shell um die Nuxt-SPA (`serverUrl` → `https://app.simy.ch/login`).

---

## Status-Übersicht

| Bereich | Status |
|---------|--------|
| Capacitor Android Projekt | ✅ vorhanden |
| Icons / Splash | ✅ `clients/simy/icon.png` + Generator |
| Signed AAB CI Pipeline | ✅ `.github/workflows/build-android.yml` |
| App Links Intent-Filters | ✅ Manifest + Patch-Script |
| `assetlinks.json` Endpoint | ⚠️ live, Fingerprints noch leer |
| Play Console Listing | ⬜ offen |
| Screenshots / Feature Graphic | ⬜ offen |
| Data safety / Content rating | ⬜ offen |
| Internal-Track Upload + Gerätetest | ⬜ offen |
| Production Review Submit | ⬜ offen |

---

## 1. Pre-Flight Checks (Code & Build)

### 1.1 Package & Version
| Feld | Wert |
|------|------|
| Application ID | `ch.simy.app` |
| Version Name | `clients/simy/config.json` → `version` (aktuell `1.0.1`) |
| Version Code | CI setzt `github.run_number` |
| minSdk / targetSdk | 24 / 36 (`android/variables.gradle`) |

### 1.2 Account Deletion (Play Policy)
✅ Endpoint `POST /api/customer/delete-account`
✅ "Konto löschen" im Customer-Profil
✅ Blockiert Löschung bei offenen Forderungen (HTTP 409) — Details: `docs/CUSTOMER_ACCOUNT_DELETION.md`

Google verlangt dasselbe wie Apple, wenn Accounts erstellt werden können.

### 1.3 Android App Links (Payment Callback)
✅ Intent-Filters in `android/app/src/main/AndroidManifest.xml`
✅ Patch nach `cap sync`: `scripts/patch-android-deeplinks.mjs`
✅ Endpoint `https://app.simy.ch/.well-known/assetlinks.json`
- [ ] SHA-256 Fingerprints eintragen (siehe §1.4)
- [ ] Verifizieren: [Google Statement List Generator](https://developers.google.com/digital-asset-links/tools/generator)

Paths (analog iOS AASA):
- `/payment-callback*`
- `/customer-dashboard*`
- `/login*`

Custom Scheme: `simy://` (Fallback, kein autoVerify)

### 1.4 SHA-256 Fingerprints setzen

Play App Signing liefert **zwei** relevante Zertifikate — beide in `assetlinks.json` eintragen:

1. **App signing key** (Play Console → App → Setup → App integrity → App signing)
2. **Upload key** (dasselbe Screen → Upload key certificate)

Lokal vom Upload-Keystore:

```bash
./scripts/android-cert-fingerprint.sh /path/to/simy.keystore simy
# Passwort eingeben → SHA-256 mit Doppelpunkten ausgeben
```

Dann als Vercel/Server Env setzen (kommagetrennt, mehrere erlaubt):

```bash
ANDROID_CERT_SHA256="AB:CD:...:EF,12:34:...:56"
```

Deploy → prüfen:

```bash
curl -s https://app.simy.ch/.well-known/assetlinks.json | jq .
```

`sha256_cert_fingerprints` darf **nicht** mehr `[]` sein.

### 1.5 Firebase / Push
✅ `google-services.json` lokal für `ch.simy.app` (Firebase Projekt `simy-app`)
✅ CI injiziert via Secret `FIREBASE_CONFIGS`
✅ Client-Registrierung: `plugins/push.client.ts`
- [ ] `FIREBASE_PROJECT_ID` + `FIREBASE_SERVICE_ACCOUNT` auf dem Server für Outbound-Push
- [ ] Smoke-Test: Token landet in `push_tokens`, Test-Notification empfangen

### 1.6 Passkeys
Passkeys sind auf Native bewusst deaktiviert, bis App Links + Fingerprints verifiziert sind
(`pages/login.vue`). Für v1 OK — Login via Email/Passwort + Biometrie.

---

## 2. Google Play Console – einmalig

### 2.1 Developer Account
- [ ] Play Console Account aktiv (25 USD einmalig)
- [ ] App erstellen: **Simy**, Package name **`ch.simy.app`** (danach unveränderbar!)

### 2.2 API Access für CI
- [ ] Play Console → Setup → API access → Service Account verknüpfen
- [ ] Rolle mindestens **Release manager**
- [ ] JSON Key → GitHub Secret `GOOGLE_PLAY_JSON_KEY`

### 2.3 App signing
- [ ] Beim ersten AAB-Upload Play App Signing aktivieren (Google-managed key empfohlen)
- [ ] App-signing SHA-256 kopieren → §1.4

### 2.4 GitHub Secrets (Check)

| Secret | Zweck |
|--------|--------|
| `GOOGLE_PLAY_JSON_KEY` | Play API Upload |
| `KEYSTORES_JSON` | `{ "simy": { "b64": "...", "pass": "..." } }` |
| `FIREBASE_CONFIGS` | `{ "simy": "<base64 google-services.json>" }` |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` | Nuxt generate in CI |
| `SIMY_GITHUB_PAT` | Keystore-Secret auto-persist |

---

## 3. Store Listing

### 3.1 Texte (bereits im Repo)

| Feld | Quelle |
|------|--------|
| Name DE/EN | `clients/simy/metadata/*/name.txt` + `config.json` |
| Kurzbeschreibung | `subtitle` (max. 80 Zeichen in Play) |
| Vollbeschreibung | `metadata/*/description.txt` |
| What's new | `clients/simy/whatsnew/whatsnew-*` |
| Privacy | `https://simy.ch/datenschutz` |
| Support | `https://simy.ch/kontakt` |
| Marketing | `https://simy.ch` |

### 3.2 Visuelle Assets (noch erstellen)

| Asset | Spec | Status |
|-------|------|--------|
| App Icon | 512×512 PNG | aus `clients/simy/icon.png` ableiten |
| Feature Graphic | **1024×500** PNG | ⬜ Pflicht |
| Phone Screenshots | min. 2, max. 8 | ⬜ Pflicht |
| 7" / 10" Tablet | optional | ⬜ |
| TV / Wear | nicht nötig | – |

Empfohlene Screenshot-Reihenfolge (wie iOS):
1. Login / Hero
2. Customer Dashboard
3. Lektion buchen
4. Kalender
5. Zahlungen / Guthaben

Tipp: Emulator `Pixel 6` / `Pixel 8 Pro` → Android Studio Device Manager → Screenshot.

### 3.3 Kategorisierung & Kontakt
| Feld | Empfehlung |
|------|------------|
| App-Kategorie | Bildung / Education (oder Business) |
| Tags | Fahrschule, Terminbuchung, Lernen |
| E-Mail | `support@simy.ch` |
| Website | `https://simy.ch` |
| Länder | CH, DE, AT, LI (initial) |
| Preis | Kostenlos |

---

## 4. Policy-Formulare (Play Console)

### 4.1 Data safety
Vorlage aus iOS Privacy (`APP_STORE_SUBMISSION.md` §2.3) übernehmen:

| Daten | Gesammelt? | Zweck |
|-------|------------|-------|
| Name, Email, Phone, Address | Ja | App-Funktionalität, Support |
| Photos (Ausweis-Uploads) | Ja | App-Funktionalität |
| User ID | Ja | App-Funktionalität, eigene Analytics |
| Purchase history | Ja | App-Funktionalität |
| Approx. location | Ja (Buchungs-Standort) | App-Funktionalität |
| Crash / Performance | Ja | Stabilität |
| Advertising ID / Tracking | **Nein** | – |

- Data encrypted in transit? **Yes** (HTTPS)
- Users can request deletion? **Yes** (In-App + Support)

### 4.2 Content rating
IARC-Fragebogen in der Console ausfüllen (keine Gewalt/Gambling → niedrige Rating).

### 4.3 Target audience & News apps
- Zielgruppe: 18+ bzw. Fahrschüler ab ~17 (Schweiz) — ehrlich angeben
- News-App? **Nein**

### 4.4 Government apps / Financial features
- Government? **Nein**
- Financial features: In-App Käufe? **Nein** (Abos laufen webseitig / Stripe für Schulen; Schüler zahlen via Wallee im Browser)

---

## 5. Reviewer Access

Demo-Tenant existiert bereits für Apple Review — wiederverwenden:

```bash
DEMO_PASSWORD='YourStrongPassword' npm run demo:apple-review:setup
```

| Feld | Wert |
|------|------|
| Login-URL Hinweis | App öffnet `https://app.simy.ch/login?tenant=apple-review` |
| Student | `apple-review@simy.ch` |
| Instructor | `demo-instructor@simy.ch` |
| Admin | `demo-admin@simy.ch` |
| Passwort | nur in Play Console + 1Password, **nicht** committen |

### Reviewer Notes (Vorlage)

```
Hello Play Review Team,

Simy is a B2B2C platform for driving schools in Switzerland.

IMPORTANT — Demo tenant access
==============================
Self-registration without invitation is intentionally disabled.
Open the app; if the login screen does not show the purple "Apple Review"
branding, append ?tenant=apple-review by using the deep link:

  https://app.simy.ch/login?tenant=apple-review

Demo accounts (same password for all):
Password: <DEMO_PASSWORD>

• Student:    apple-review@simy.ch
• Instructor: demo-instructor@simy.ch
• Admin:      demo-admin@simy.ch

Seeded data: lessons, payments (cash), instructor, location.

Key flows
=========
1. Student login → Customer Dashboard
2. Book a lesson
3. View payments
4. Account deletion: Profile → "Konto löschen" → type LÖSCHEN

Payments for this demo tenant are CASH only (no real card entry).
Online payments (Wallee) return via Android App Links to app.simy.ch.

Thank you!
```

---

## 6. Build & Upload

### 6.1 Internal Track (empfohlen zuerst)

GitHub → Actions → **Build White-Label Android App** → Run workflow:

| Input | Wert |
|-------|------|
| client | `simy` |
| track | `internal` |

CI macht: Nuxt generate → cap sync → Deeplink-Patch → Icons → Keystore → `bundleRelease` → AAB Artifact → Play Upload.

### 6.2 Lokal (ohne Upload)

```bash
CLIENT=simy npm run app:build
npx cap open android
# Android Studio → Build → Generate Signed Bundle / APK
```

Fingerprint vom lokalen Keystore:

```bash
./scripts/android-cert-fingerprint.sh ./simy-release.keystore simy
```

### 6.3 Gerätetest vor Review
- [ ] Kaltstart → Login-Screen (kein weisser Hang)
- [ ] Login Student (`apple-review`)
- [ ] Dashboard lädt, Branding sichtbar
- [ ] Lektion buchen
- [ ] Biometrie (optional)
- [ ] Push-Permission Dialog (Android 13+)
- [ ] PDF öffnen (Rechnung) via In-App-Browser
- [ ] Konto löschen Flow (danach Demo neu seedern!)
- [ ] App Link: `adb shell am start -a android.intent.action.VIEW -d "https://app.simy.ch/login?tenant=apple-review" ch.simy.app`

### 6.4 Promote → Review
1. Internal testing smoke-test grün
2. Closed testing (mind. 12 Tester / 14 Tage) — **oder** wenn Account neu: Google erlaubt manchmal Direct-to-Production mit Einschränkungen; aktuell oft Closed Testing Pflicht für Personal Accounts
3. Production → **Send for review**
4. Phased rollout 20% → 100%

---

## 7. Häufige Rejection-Gründe

| Grund | Mitigation |
|-------|------------|
| Login ohne Demo-Zugang | Reviewer Notes + `?tenant=apple-review` |
| Broken App Link / Payment return | Fingerprints in assetlinks + autoVerify |
| Data safety unvollständig / falsch | §4.1 ehrlich ausfüllen |
| Fehlende Screenshots / Feature Graphic | §3.2 |
| Crash beim Start (kein google-services) | `FIREBASE_CONFIGS` Secret prüfen |
| WebView-only ohne Mehrwert | Biometrie, Push, Deep Links, native Browser erwähnen |
| Privacy Policy 404 | `https://simy.ch/datenschutz` live halten |
| Permissions ohne Begründung | Nur nötige Permissions; Push-Permission zur Laufzeit |

---

## 8. Nach Freigabe

- [ ] simy.ch Landing: „Jetzt bei Google Play“ Badge
- [ ] Footer / Download-Section updaten
- [ ] Monitoring (Play Vitals / Sentry)
- [ ] Outbound-Push fertigstellen (Cron / Reminders)
- [ ] Passkeys auf Android aktivieren (nach verifizierten App Links)
- [ ] White-Label `driving-team` (`ch.drivingteam.app`) nachziehen

---

## Quick-Reference Commands

```bash
# Config + Sync + Deeplinks
CLIENT=simy node scripts/gen-cap-config.mjs
CLIENT=simy npx cap sync android
CLIENT=simy node scripts/patch-android-deeplinks.mjs

# Fingerprint
./scripts/android-cert-fingerprint.sh ./client.keystore simy

# Assetlinks live prüfen
curl -s https://app.simy.ch/.well-known/assetlinks.json | jq .

# App Link auf Gerät testen
adb shell am start -a android.intent.action.VIEW \
  -d "https://app.simy.ch/payment-callback?status=success" ch.simy.app
```
