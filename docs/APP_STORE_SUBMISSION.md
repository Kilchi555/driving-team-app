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
✅ Live-Test bestätigt: `https://app.simy.ch/.well-known/apple-app-site-association`
   liefert `HTTP 200 application/json` mit `appID: 25H29N3PDT.ch.simy.app`
   und `paths: ["/payment-callback*", "/customer-dashboard*", "/login*"]`

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

### 2.3 App Privacy ("Datenschutz") — exakte Antworten für ASC

Apple fragt in App Store Connect für jede Datenkategorie:
1. Sammeln wir das? (Yes/No)
2. Verwendungszwecke (Purposes)
3. Linked to user / Used for tracking?

#### Globale Antwort
> **Does your app use data for tracking?** → **NO**
>
> Wir nutzen kein SKAdNetwork, kein IDFA, keine Cross-App-Werbe-IDs,
> kein Drittanbieter-Tracking-SDK.

#### Datenkategorien

| ASC-Kategorie | Sammeln? | Purposes | Linked | Tracking |
|---------------|----------|----------|--------|----------|
| **Contact Info → Name** | Yes | App Functionality, Customer Support | Yes | No |
| **Contact Info → Email** | Yes | App Functionality, Customer Support, Account Mgmt | Yes | No |
| **Contact Info → Phone** | Yes | App Functionality, Customer Support | Yes | No |
| **Contact Info → Physical Address** | Yes | App Functionality (Rechnungen) | Yes | No |
| **Health & Fitness** | No | – | – | – |
| **Financial → Payment Info** | Yes (via Wallee – nicht persistent bei uns) | App Functionality | Yes | No |
| **Financial → Credit Info** | No | – | – | – |
| **Location → Precise** | No | – | – | – |
| **Location → Coarse** | Yes (Buchungs-Standort) | App Functionality | Yes | No |
| **Sensitive Info** | No | – | – | – |
| **Contacts** | No | – | – | – |
| **User Content → Photos/Videos** | Yes (Ausweis-Uploads) | App Functionality | Yes | No |
| **User Content → Other (Messages)** | Yes (Notizen) | App Functionality | Yes | No |
| **Browsing History** | No | – | – | – |
| **Search History** | No | – | – | – |
| **Identifiers → User ID** | Yes (Supabase UUID) | App Functionality, Analytics (own) | Yes | No |
| **Identifiers → Device ID** | No | – | – | – |
| **Purchases → Purchase History** | Yes | App Functionality | Yes | No |
| **Usage Data → Product Interaction** | Yes | Analytics (own), App Functionality | Yes | No |
| **Usage Data → Advertising Data** | No | – | – | – |
| **Diagnostics → Crash Data** | Yes (error_logs) | App Functionality, Analytics | No | No |
| **Diagnostics → Performance Data** | Yes (page_analytics) | Analytics | No | No |
| **Diagnostics → Other Diagnostic** | No | – | – | – |
| **Other → Sensitive User Info** | Yes (Geburtsdatum → Mindestalter-Check) | App Functionality | Yes | No |

### 2.4 App Review Information
| Feld | Wert |
|------|------|
| Sign-in required | **Ja** |
| Demo Account Username | `apple-review@simy.ch` |
| Demo Account Password | **Wird in App Store Connect direkt eingegeben** — NICHT im Repo committen (siehe 1Password "Simy → Apple Review demo accounts") |
| Contact Email | `support@simy.ch` |
| Contact Phone | (deine Nummer) |
| Notes für Reviewer | siehe Vorlage unten |

> ⚠️ **Passwort-Rotation 2026-05-27**: Das ursprüngliche Demo-Passwort
> wurde durch GitGuardian als public gemeldet und ist rotiert. Das neue
> Passwort wird ausschließlich in App Store Connect → "App Review
> Information → Notes" eingetragen und im Passwort-Manager gespeichert.
> Setup-Script verlangt jetzt zwingend `DEMO_PASSWORD` env var.

#### Reviewer Notes (Vorlage – DE/EN bilingual)

Beim Eintragen in App Store Connect **`<DEMO_PASSWORD>`** durch das aktuelle
Demo-Passwort aus dem Passwort-Manager ersetzen.

```
Hello App Review Team,

Simy is a B2B2C platform for driving schools in Switzerland.

IMPORTANT — How to access the demo tenant
==========================================
End users (driving students) are normally invited by their driving school —
self-registration without an invitation is intentionally not possible.
For your review we have pre-created a tenant called "Apple Review Fahrschule"
that is reachable via this URL:

   https://app.simy.ch/login?tenant=apple-review

The "?tenant=apple-review" parameter loads the demo school's branding
(purple Simy theme) and unlocks all features. WITHOUT this parameter the
app will load the default driving school's tenant which DOES NOT accept
the demo credentials below.

Demo accounts (all share the same password)
============================================
Password for all 3 accounts: <DEMO_PASSWORD>

• Student / Customer (primary login to review):
     apple-review@simy.ch
• Driving instructor / Staff:
     demo-instructor@simy.ch
• Driving school admin:
     demo-admin@simy.ch

The demo tenant contains seeded mock data so you can test every flow:
• Several mock lessons (past + upcoming)
• Mock payments in different states (paid / open)
• A demo instructor and a demo location

Key flows to verify
====================
1. Customer login → Customer Dashboard (purple branding visible)
2. Book a driving lesson under "Fahrstunden buchen" / "Book lesson"
3. View payment history under "Zahlungen"
4. ACCOUNT DELETION (Apple Guideline 5.1.1(v)):
   Profile (top-right) → "Konto löschen" → confirm by typing "LÖSCHEN"
   The account is anonymised, the auth user is deleted and you can no
   longer log in with the credentials. Legal bookkeeping data is retained
   as required by Swiss law.
5. (Optional) Login as the instructor or admin demo account to see the
   staff/admin views from the same tenant.

Payment integration
====================
The "Apple Review Fahrschule" tenant is configured for in-person CASH
payment ("Barzahlung vor Ort"). This is a real production option used by
some Swiss driving schools. Online payments via Wallee (credit card,
TWINT) are intentionally disabled for this demo tenant so reviewers do
not need to enter real card data.

For tenants that have Wallee enabled, payment opens via the in-app
SFSafariViewController and returns to the app through a Universal Link
(applinks:app.simy.ch) after a successful or aborted payment.

Privacy
========
The app does not use IDFA / SKAdNetwork / cross-app tracking. All
personal data is bound to the tenant the user belongs to and is removed
on account deletion (apart from legally required bookkeeping records).

Thank you for reviewing Simy!
```

**Hinweis Customer-Service**: Wenn der Reviewer doch Wallee testen will,
können wir kurzfristig `tenants.wallee_enabled=true` für `apple-review`
setzen und einen 0.01 CHF Test-Course freigeben. Standardmäßig bleibt es
auf Cash.

### 2.5 Demo Tenant Setup (automatisiert!)
✅ Setup-Script: `npm run demo:apple-review:setup`
   - Erstellt Tenant `apple-review`, Location, Admin, Instructor, Customer
   - Seedet 5 Appointments (3 completed, 2 booked) + 3 Payments
   - Idempotent – kann gefahrlos mehrfach ausgeführt werden
   - Resettet Demo-Passwort bei jedem Lauf
✅ Cleanup-Script: `npm run demo:apple-review:teardown`
   - Entfernt sämtliche Demo-Daten + Auth-User

Demo-Tenant initial einrichten / Passwort rotieren:
```bash
# Passwort ist Pflicht — kein Default mehr im Code
DEMO_PASSWORD='YourStrongPassword' npm run demo:apple-review:setup
```
Danach das Passwort in App Store Connect → "App Review Information → Notes"
einfügen und in 1Password unter "Simy → Apple Review demo accounts" ablegen.

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
