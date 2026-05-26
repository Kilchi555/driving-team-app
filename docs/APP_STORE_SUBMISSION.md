# Simy – App Store Submission Checklist

End-to-end Guide für die Erst-Submission der **Simy iOS App** (`ch.simy.app`).
Alle Schritte sollten der Reihe nach abgearbeitet werden. Bereits erledigte Punkte sind mit ✅ markiert.

---

## 1. Pre-Flight Checks (Code & Build)

### 1.1 In-App Account Deletion (Apple Guideline 5.1.1(v))
✅ Endpoint `POST /api/customer/delete-account`
✅ "Konto löschen" Button im Customer-Profil mit Bestätigungsdialog
✅ Anonymisiert PII, löscht Auth-Account, behält gesetzlich geforderte Buchhaltungsdaten

### 1.2 App Transport Security (ATS)
✅ `NSAllowsArbitraryLoads=true` ist nur für Live-Reload während Dev gesetzt
✅ Wird vor jedem Release-Build durch `fastlane/strip-ats.sh` automatisch entfernt
✅ Wird durch `fastlane/restore-ats.sh` nach dem Build wiederhergestellt

### 1.3 Universal Links (Wallee Payment Callback)
✅ `Associated Domains` Entitlement (`applinks:app.simy.ch`)
✅ AASA Datei wird ausgeliefert via `server/middleware/00.well-known.ts`
- [ ] **Nach Deploy testen**: `curl https://app.simy.ch/.well-known/apple-app-site-association`
   muss JSON zurückgeben (kein HTML)

### 1.4 Capability Aktivierung im Apple Developer Portal
Für die App-ID `ch.simy.app` müssen folgende Capabilities aktiv sein:
- [ ] Push Notifications
- [ ] Associated Domains
- [ ] Sign In with Apple (falls Apple Login geplant)

Nach Aktivierung: `bundle exec fastlane sync_certificates` ausführen,
um das Provisioning Profile zu regenerieren.

### 1.5 Encryption Compliance
✅ `ITSAppUsesNonExemptEncryption=false` in `Info.plist`
→ Apple stellt bei jeder Submission keine Verschlüsselungsfragen mehr.

### 1.6 Metadata
✅ DE + EN Description, Subtitle, Keywords, Release Notes
✅ Marketing/Privacy/Support URLs zeigen auf `www.simy.ch`

---

## 2. App Store Connect Konfiguration

### 2.1 App Information
| Feld | Wert |
|------|------|
| Bundle ID | `ch.simy.app` |
| SKU | `simy` |
| Primary Language | Deutsch (Schweiz) |
| Primary Category | Bildung (Education) |
| Secondary Category | Wirtschaft (Business) |
| Content Rights | Eigene Inhalte / nicht von Dritten |
| Age Rating | 4+ |

### 2.2 Pricing & Availability
- Price: **Free**
- Availability: **Schweiz**, **Deutschland**, **Liechtenstein**, **Österreich** (initial), später weltweit
- Pre-orders: Nein

### 2.3 App Privacy ("Datenschutz")
Die App sammelt folgende Daten – muss bei "App Privacy" in ASC angegeben werden:

| Datenkategorie | Verwendung | Verknüpft mit User | Tracking |
|----------------|------------|---------------------|----------|
| **Name** (Vor-/Nachname) | App-Funktionalität, Personalisierung | Ja | Nein |
| **E-Mail Adresse** | App-Funktionalität, Account, Kommunikation | Ja | Nein |
| **Telefonnummer** | Kommunikation, Notfall-Erreichbarkeit | Ja | Nein |
| **Adresse** (Strasse, PLZ, Ort) | Rechnungsstellung | Ja | Nein |
| **Geburtsdatum** | Mindestalter-Check (Führerschein) | Ja | Nein |
| **Foto-/Video** (Ausweis-Uploads) | Identitätsprüfung | Ja | Nein |
| **Zahlungsinformationen** | Wallee-Payment (von Wallee verarbeitet) | Ja | Nein |
| **Standort** (grob) | Bei Buchungs-Standort | Ja | Nein |
| **Benutzerinhalte** (Nachrichten) | Kommunikation mit Fahrlehrer | Ja | Nein |
| **Identifier** (User ID) | App-Funktionalität | Ja | Nein |
| **Diagnostics** (Crash Logs) | App-Funktionalität | Nein | Nein |

**Tracking**: NEIN (keine SKAdNetwork / IDFA Nutzung)

### 2.4 App Review Information
| Feld | Wert |
|------|------|
| Sign-in required | **Ja** |
| Demo Account Username | `apple-review@simy.ch` |
| Demo Account Password | `AppleReview2026!` (ggf. via `DEMO_PASSWORD` env überschreiben) |
| Contact Email | `support@simy.ch` |
| Contact Phone | (deine Nummer) |
| Notes für Reviewer | siehe Vorlage unten |

#### Reviewer Notes (Vorlage)
```
Hello App Review Team,

Simy is a B2B2C platform for driving schools in Switzerland. End users
(driving students) are invited by their driving school – self-registration
is not possible without an existing invitation.

For your review, we have created a demo account that auto-loads the
"Apple Review Fahrschule" tenant:

   URL:      https://app.simy.ch/apple-review
   Email:    apple-review@simy.ch
   Password: AppleReview2026!

This account contains mock data so you can fully test the app:
• 5 mock lessons (3 completed, 2 upcoming)
• 3 mock payments (2 paid, 1 open)
• A demo instructor and a demo location in Zürich

Key flows to test:
• Login → Customer Dashboard
• Book a lesson via "Fahrstunden buchen"
• View payment history under "Zahlungen"
• Account deletion under "Mein Profil" → "Konto löschen"

The Wallee payment integration opens an in-app browser (SFSafariViewController)
and returns to the app via Universal Link (app.simy.ch) after payment.

Thank you!
```

### 2.5 Demo Tenant Setup (automatisiert!)
✅ Setup-Script: `npm run demo:apple-review:setup`
   - Erstellt Tenant `apple-review`, Location, Admin, Instructor, Customer
   - Seedet 5 Appointments (3 completed, 2 booked) + 3 Payments
   - Idempotent – kann gefahrlos mehrfach ausgeführt werden
   - Resettet Demo-Passwort bei jedem Lauf
✅ Cleanup-Script: `npm run demo:apple-review:teardown`
   - Entfernt sämtliche Demo-Daten + Auth-User

Passwort überschreiben:
```bash
DEMO_PASSWORD='DeinNeuesPasswort2026!' npm run demo:apple-review:setup
```

---

## 3. Screenshots & Visual Assets

### 3.1 Erforderliche Screenshot-Sets (iOS)
Apple verlangt mindestens **ein** Set – wir nehmen das grösste:
| Device | Resolution | Anzahl |
|--------|-----------|--------|
| iPhone 6.9" (iPhone 16 Pro Max) | 1290 × 2796 | 3-10 |
| iPhone 6.5" (iPhone 11 Pro Max)  | 1284 × 2778 | optional |
| iPad Pro 12.9" (3. Gen oder neuer)| 2048 × 2732 | optional |

### 3.2 Empfohlene Screenshots (Reihenfolge wichtig!)
1. **Hero**: Login mit Tagline "Deine smarte Fahrschul-App"
2. **Dashboard**: Customer Dashboard mit nächstem Termin
3. **Booking**: Lektion-Buchungsflow
4. **Calendar**: Kalender-Sync Feature
5. **Progress**: Lernfortschritt / Bewertungen
6. **Payments**: Zahlungen & Guthaben

Tipp: Mit dem Simulator (`xcrun simctl io booted screenshot ~/Desktop/sim.png`)
direkt auf dem iPhone 16 Pro Max Simulator erstellen.

### 3.3 App Icon
✅ `clients/simy/icon.png` (1024×1024)
- [ ] Im Xcode unter `Assets.xcassets/AppIcon.appiconset` einbinden
   (bzw. `npx capacitor-assets generate --iconBackgroundColor '#7C3AED'`)

---

## 4. Build & Upload

### 4.1 Version & Build Number
- `clients/simy/config.json` → `version: "1.0.0"`
- Build-Nummer wird automatisch durch Fastlane (`%Y%m%d%H%M`) gesetzt

### 4.2 Upload via Fastlane
```bash
# 1. Sync certs (only first time or after capability changes)
CLIENT=simy bundle exec fastlane ios sync_certificates

# 2. Upload to TestFlight (recommended first)
CLIENT=simy DEPLOY_TARGET=testflight bundle exec fastlane ios deploy

# 3. After TestFlight Smoke-Test → Upload to App Store
CLIENT=simy DEPLOY_TARGET=appstore bundle exec fastlane ios deploy
```

Fastlane übernimmt automatisch:
- ATS-Exceptions strippen (`fastlane/strip-ats.sh`)
- Build + Upload + Restore von Info.plist

### 4.3 Manueller Review-Submit
Nach Upload erscheint der Build in ASC unter "iOS Builds".
- [ ] Build auswählen → "Submit for Review"
- [ ] Export Compliance: `No` (ITSAppUsesNonExemptEncryption=false)
- [ ] Phased Release: aktivieren (7-Tage Rollout)
- [ ] Auto-Release nach Approval: aktivieren

---

## 5. Häufige Rejection-Gründe (vermeiden!)

| Grund | Lösung |
|-------|--------|
| Account-Deletion fehlt | ✅ erledigt |
| HTTP statt HTTPS / ATS Exceptions | ✅ vor Release entfernt |
| Demo-Account funktioniert nicht | Demo-Tenant gut testen |
| Privacy Manifest fehlt | ✅ siehe `ios/App/App/PrivacyInfo.xcprivacy` |
| Crashes beim Start | Vor Submit auf physischem Gerät testen |
| Login-required ohne Demo Account | ✅ Demo-Account bereitgestellt |
| Universal Links funktionieren nicht | AASA nach Deploy testen |

---

## 6. Nach erfolgreicher App Store Freigabe

- [ ] Marketing-Update: simy.ch Landing-Page mit "Jetzt im App Store" Badge
- [ ] App Store Badge in `apps/website/components/Footer.vue` einbinden
- [ ] Erste Bewertungen sammeln (Freunde, Family, Beta-User)
- [ ] Crashlytics / Sentry Monitoring aktivieren
- [ ] Google Play submission starten (Android)
