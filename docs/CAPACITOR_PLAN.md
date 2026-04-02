# Capacitor Mobile App – Implementierungsplan

> **Ziel:** Die bestehende Nuxt 3 SPA (`/pages/`) als native iOS & Android App verpacken.  
> **Nicht betroffen:** Die Marketing-Website (`apps/website/`) bleibt als Webseite auf Vercel.

**Architektur-Vorteil:** Die Haupt-App läuft bereits mit `ssr: false` (SPA-Modus) – das ist die ideale Voraussetzung für Capacitor. Kein Umbau der Grundarchitektur nötig.

---

## Status-Übersicht

| Phase | Titel | Status |
|-------|-------|--------|
| 0 | Voraussetzungen & Umgebung | ⬜ Offen |
| 1 | Capacitor Installation & Init | ⬜ Offen |
| 2 | Nuxt Build-Konfiguration | ⬜ Offen |
| 3 | iOS Setup (Xcode) | ⬜ Offen |
| 4 | Android Setup (Android Studio) | ⬜ Offen |
| 5 | Supabase Auth – Deep Links | ⬜ Offen |
| 6 | Stripe Payments – Mobile Handling | ⬜ Offen |
| 7 | Native Features (Push, Biometrie) | ⬜ Offen |
| 8 | App Icons & Splash Screen | ⬜ Offen |
| 9 | App Store Submission (iOS) | ⬜ Offen |
| 10 | Play Store Submission (Android) | ⬜ Offen |
| 11 | Updates & CI/CD | ⬜ Offen |

---

## Phase 0 – Voraussetzungen & Umgebung

### 0.1 Accounts & Lizenzen
- [ ] **Apple Developer Account** – https://developer.apple.com/enroll/ (99 USD/Jahr, 1–2 Tage Aktivierung)
- [ ] **Google Play Console Account** – https://play.google.com/console (25 USD einmalig)
- [ ] App-ID / Bundle-ID festlegen: `ch.drivingteam.app`

### 0.2 Lokale Tools
- [ ] **Xcode** installieren (Mac App Store, kostenlos, ~15 GB)  
  ```bash
  xcode-select --install   # Command Line Tools
  # Dann Xcode aus dem Mac App Store installieren
  sudo xcodebuild -license accept
  ```
- [ ] **Android Studio** installieren – https://developer.android.com/studio  
  Nach der Installation: SDK Manager → Android 14 (API 34) installieren
- [ ] **CocoaPods** installieren (für iOS Dependencies):  
  ```bash
  sudo gem install cocoapods
  pod --version  # Sollte ≥ 1.14 sein
  ```
- [ ] **Java JDK 17** installieren (für Android Gradle):  
  ```bash
  brew install openjdk@17
  echo 'export JAVA_HOME=$(brew --prefix openjdk@17)' >> ~/.zshrc
  ```

### 0.3 Verifikation
```bash
node --version   # Sollte ≥ 18 sein (aktuell v22 ✅)
xcodebuild -version
java --version
pod --version
```

---

## Phase 1 – Capacitor Installation & Init

> Alle Befehle im **Root des Projekts** ausführen (nicht in `apps/website/`)

### 1.1 Packages installieren
```bash
npm install @capacitor/core @capacitor/cli
npm install @capacitor/ios @capacitor/android
```

### 1.2 Capacitor initialisieren
```bash
npx cap init "Driving Team" "ch.drivingteam.app" --web-dir dist
```

### 1.3 `capacitor.config.ts` erstellen
Eine `capacitor.config.ts` im Projekt-Root anlegen:

```typescript
import { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'ch.drivingteam.app',
  appName: 'Driving Team',
  webDir: 'dist',
  server: {
    // Nur für lokale Entwicklung – URL eintragen, dann hot reload möglich
    // url: 'http://192.168.x.x:3000',
    // cleartext: true,
  },
  ios: {
    scheme: 'drivingteam',          // Für Deep Links: drivingteam://
    backgroundColor: '#019ee5',
  },
  android: {
    backgroundColor: '#019ee5',
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#019ee5',
      showSpinner: false,
    },
  },
}

export default config
```

### 1.4 Native Projekte hinzufügen
```bash
npx cap add ios
npx cap add android
```

### 1.5 `.gitignore` updaten
```
# Capacitor
ios/App/Pods/
ios/App/App.xcworkspace/
android/.gradle/
android/app/build/
```

---

## Phase 2 – Nuxt Build-Konfiguration

> Ziel: `nuxt generate` produziert einen statischen `dist/` Ordner, den Capacitor lädt.

### 2.1 `nuxt.config.ts` anpassen

Folgende Anpassungen sind nötig (Hauptapp, **nicht** `apps/website/`):

```typescript
export default defineNuxtConfig({
  ssr: false,  // Bereits gesetzt ✅

  // Capacitor lädt Dateien über file://, daher kein absoluter Basis-Pfad nötig
  app: {
    baseURL: '/',
    // Kein cdnURL setzen – Capacitor served lokal
  },

  nitro: {
    preset: 'static',  // Statischer Build für Capacitor
  },
})
```

### 2.2 Build & Sync Workflow
```bash
# 1. Statischen Build erstellen
nuxt generate

# 2. Build in native Projekte syncen
npx cap sync

# 3. iOS in Xcode öffnen
npx cap open ios

# 4. Android in Android Studio öffnen
npx cap open android
```

**Tipp:** Diesen Workflow nach jeder Code-Änderung durchführen:
```bash
nuxt generate && npx cap sync
```

---

## Phase 3 – iOS Setup (Xcode)

### 3.1 Xcode Projekt-Einstellungen
- [ ] Xcode öffnen: `npx cap open ios`
- [ ] **Signing & Capabilities:**
  - Team → Apple Developer Account auswählen
  - Bundle Identifier: `ch.drivingteam.app`
  - Automatically manage signing: ✅ Ein
- [ ] **Deployment Target:** iOS 16.0 (empfohlen – für Push Notifications auf iOS)
- [ ] **Display Name:** "Driving Team"

### 3.2 Info.plist Einträge (wird von Capacitor auto-befüllt)
Manuell prüfen/ergänzen:
```xml
<!-- Deep Link URL Scheme -->
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>drivingteam</string>
    </array>
  </dict>
</array>

<!-- Kamera (falls gewünscht für Führerschein-Upload) -->
<key>NSCameraUsageDescription</key>
<string>Um Dokumente für deine Fahrschule hochzuladen</string>

<!-- Biometrie (Face ID) -->
<key>NSFaceIDUsageDescription</key>
<string>Für schnellere und sichere Anmeldung</string>
```

### 3.3 Auf physischem Gerät testen
- [ ] iPhone per USB verbinden
- [ ] In Xcode: Zielgerät auswählen → Run (▶)
- [ ] Erstes Mal: Auf dem iPhone unter Einstellungen → Allgemein → VPN & Geräteverwaltung → Developer-App vertrauen

---

## Phase 4 – Android Setup (Android Studio)

### 4.1 Android Studio öffnen
```bash
npx cap open android
```

### 4.2 Gradle Sync & Build
- [ ] Gradle Sync abwarten (Auto-Popup)
- [ ] `app/build.gradle` prüfen:
  - `applicationId "ch.drivingteam.app"`
  - `minSdkVersion 22`
  - `targetSdkVersion 34`

### 4.3 `AndroidManifest.xml` – Deep Links
```xml
<intent-filter android:autoVerify="true">
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="drivingteam" />
</intent-filter>
```

### 4.4 Auf physischem Gerät testen
- [ ] Android-Gerät per USB verbinden
- [ ] USB-Debugging im Entwicklermodus aktivieren
- [ ] In Android Studio: Run (▶)

---

## Phase 5 – Supabase Auth – Deep Links

> **Problem:** Supabase OAuth (Magic Link, Google Login) öffnet nach dem Login eine Redirect-URL im Browser. In der nativen App muss diese Redirect-URL zurück in die App führen.

### 5.1 URL-Schema in Supabase konfigurieren
Supabase Dashboard → Authentication → URL Configuration:

```
# Redirect URLs hinzufügen:
drivingteam://login-callback
drivingteam://password-reset
```

### 5.2 Capacitor App Plugin installieren
```bash
npm install @capacitor/app
```

### 5.3 Deep Link Handler in Nuxt (Plugin)
`plugins/capacitor-deeplinks.client.ts` erstellen:

```typescript
import { App } from '@capacitor/app'

export default defineNuxtPlugin(() => {
  App.addListener('appUrlOpen', ({ url }) => {
    const router = useRouter()
    // drivingteam://login-callback?access_token=...&refresh_token=...
    if (url.startsWith('drivingteam://')) {
      const path = url.replace('drivingteam:/', '')
      router.push(path)
    }
  })
})
```

### 5.4 Supabase Client – Redirect URL setzen
In der Supabase-Auth-Konfiguration die korrekte Redirect URL für Mobile setzen:

```typescript
// Erkennen ob wir in der nativen App sind
const isNative = Capacitor.isNativePlatform()

const redirectTo = isNative
  ? 'drivingteam://login-callback'
  : `${window.location.origin}/auth/callback`

await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: { redirectTo }
})
```

---

## Phase 6 – Stripe Payments – Mobile Handling

> **Problem:** Stripe Checkout öffnet eine externe URL. In der nativen App funktioniert das nicht direkt.

### Option A (Empfohlen): Stripe in WebView (Browser Plugin)
```bash
npm install @capacitor/browser
```

```typescript
import { Browser } from '@capacitor/browser'

// Stripe Checkout in einem In-App-Browser öffnen
await Browser.open({
  url: stripeCheckoutUrl,
  windowName: '_self',
})
```

### Option B: Stripe Elements (Vollständig in-App)
Stripe Elements direkt in die Nuxt-Komponente einbauen → keine externe Weiterleitung nötig. Aufwändiger, aber bessere UX.

### 6.1 Return URL für Stripe
Stripe Dashboard → Webhooks & Return URLs:
```
drivingteam://payment-success
drivingteam://payment-cancel
```

---

## Phase 7 – Native Features (Push, Biometrie)

### 7.1 Push Notifications
```bash
npm install @capacitor/push-notifications
```

**iOS:** Apple Developer → Certificates → Push Notification Certificate erstellen  
**Android:** Firebase Console → Cloud Messaging → `google-services.json` nach `android/app/` kopieren

```typescript
// composables/usePushNotifications.ts
import { PushNotifications } from '@capacitor/push-notifications'

export async function registerPushNotifications() {
  const permission = await PushNotifications.requestPermissions()
  if (permission.receive === 'granted') {
    await PushNotifications.register()
  }

  PushNotifications.addListener('registration', ({ value: token }) => {
    // Token an Supabase/Backend senden und beim User speichern
    savePushToken(token)
  })

  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    // Notification empfangen während App offen
    console.log('Notification:', notification)
  })
}
```

**Sinnvolle Push Notifications für Driving Team:**
- Fahrstundenbestätigung
- Prüfungserinnerung (24h vorher)
- Prüfungsergebnis
- Zahlungsbestätigung
- Neue Nachricht vom Fahrlehrer

### 7.2 Biometrie (Face ID / Fingerprint) – optional
```bash
npm install capacitor-biometric-auth
```

```typescript
import { BiometricAuth } from 'capacitor-biometric-auth'

async function loginWithBiometrics() {
  const result = await BiometricAuth.authenticate({
    reason: 'Bitte authentifiziere dich für Driving Team',
    cancelTitle: 'Abbrechen',
  })
  if (result.isAuthenticated) {
    // Session aus SecureStorage laden
  }
}
```

### 7.3 SecureStorage für Tokens
```bash
npm install @capacitor/preferences
```
Supabase Session-Tokens sicher in nativer Keychain/Keystore speichern (statt LocalStorage).

---

## Phase 8 – App Icons & Splash Screen

### 8.1 Assets vorbereiten
Benötigt werden:
- **Icon:** 1024×1024 px PNG (kein Transparenzkanal für iOS)
- **Splash Screen:** 2732×2732 px PNG (zentriertes Logo auf `#019ee5` Hintergrund)

### 8.2 capacitor-assets Tool verwenden
```bash
npm install -D @capacitor/assets

# Icons und Splash Screens automatisch generieren lassen
npx capacitor-assets generate --assetPath assets/icon.png --assetPath assets/splash.png
```

Dies generiert automatisch alle nötigen Größen für iOS und Android.

---

## Phase 9 – App Store Submission (iOS)

### 9.1 Vorbereitung
- [ ] Apple Developer Account aktiv (99 USD/Jahr)
- [ ] In **App Store Connect** (https://appstoreconnect.apple.com) neue App anlegen:
  - Bundle ID: `ch.drivingteam.app`
  - Name: "Driving Team"
  - Kategorie: Education oder Productivity
- [ ] **Screenshots** erstellen (iPhone 6.7", 6.5", iPad 12.9")
- [ ] **App Store Beschreibung** auf Deutsch & Englisch
- [ ] **Datenschutzerklärung URL** (bereits vorhanden: `drivingteam.ch/datenschutz`)

### 9.2 Release Build erstellen
In Xcode:
- [ ] Scheme: **Release** auswählen
- [ ] Product → Archive
- [ ] Distribute App → App Store Connect → Upload

### 9.3 Review-Prozess
- Wartezeit: 1–3 Tage (oft weniger)
- Häufige Ablehnungsgründe: Fehlende Datenschutzerklärung, fehlende NSUsageDescription-Strings

---

## Phase 10 – Play Store Submission (Android)

### 10.1 Vorbereitung
- [ ] Google Play Console Account aktiv (25 USD einmalig)
- [ ] Neue App anlegen: "Driving Team"
- [ ] **Keystore** erstellen (einmalig, sicher aufbewahren!):
  ```bash
  keytool -genkey -v -keystore driving-team-release.keystore \
    -alias driving-team -keyalg RSA -keysize 2048 -validity 10000
  ```
  ⚠️ **Den Keystore niemals verlieren – ohne ihn können keine Updates veröffentlicht werden!**

### 10.2 Release Build erstellen
In Android Studio:
- [ ] Build → Generate Signed Bundle/APK → Android App Bundle (AAB)
- [ ] Mit dem Keystore signieren
- [ ] `.aab` Datei generieren

### 10.3 Play Store Eintrag
- [ ] Screenshots (Telefon, Tablet)
- [ ] Beschreibung DE & EN
- [ ] Datenschutzerklärung URL

### 10.4 Review-Prozess
- Erstmalige Überprüfung: 3–7 Tage
- Updates: meist innerhalb von Stunden

---

## Phase 11 – Updates & CI/CD

### 11.1 Standard-Update-Workflow
```bash
# 1. Code-Änderungen machen
# 2. Build erstellen
nuxt generate

# 3. In native Projekte synchronisieren
npx cap sync

# 4a. iOS: Xcode öffnen, archivieren, hochladen
npx cap open ios

# 4b. Android: Android Studio öffnen, AAB bauen
npx cap open android
```

### 11.2 Live Updates (optional) – Capacitor Live Updates
Für JavaScript/CSS Änderungen ohne App Store Review:
```bash
npm install @capacitor/live-updates
```
Kleinere Updates (kein nativer Code) können direkt over-the-air geliefert werden.

### 11.3 Versionierung
In `capacitor.config.ts` und `package.json` synchron halten.  
Konvention: `MAJOR.MINOR.PATCH` (z.B. `1.0.0`)

---

## Wichtige Entscheidungen (vor Start klären)

| Entscheidung | Optionen | Empfehlung |
|---|---|---|
| Welche Seiten in der App? | Nur Haupt-App (`/pages/`) | Nur Haupt-App – Website bleibt auf Vercel |
| Supabase Login-Methode | Email/PW, Magic Link, OAuth | Email/PW einfachste für Mobile |
| Stripe Handling | Browser-Plugin vs. Stripe Elements | Browser-Plugin (schneller) |
| Push Notifications | Sofort oder später | Phase 7 kann später kommen |
| Biometrie | Sofort oder später | Optional, später |
| Live Updates | Ja / Nein | Empfohlen für schnelle Bugfixes |

---

## Zeitschätzung

| Phase | Aufwand |
|-------|---------|
| 0 – Voraussetzungen | 2–4h (inkl. Downloads) |
| 1+2 – Capacitor Init + Build | 2–3h |
| 3 – iOS Setup | 3–5h |
| 4 – Android Setup | 2–3h |
| 5 – Supabase Deep Links | 2–4h |
| 6 – Stripe Mobile | 2–4h |
| 7 – Push Notifications | 4–6h |
| 8 – Icons & Splash | 1–2h |
| 9 – App Store Submit | 2–3h (+ Wartezeit) |
| 10 – Play Store Submit | 2–3h (+ Wartezeit) |
| **Gesamt** | **~3–4 Tage Arbeit** |

---

*Letzte Aktualisierung: März 2026*
