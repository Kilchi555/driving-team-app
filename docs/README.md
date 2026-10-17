# Driving Team App - Complete Documentation

Diese Dokumentation bietet einen umfassenden Überblick über die gesamte Driving Team App mit allen Funktionen, Zusammenhängen, Datenbanktabellen und Policies.

## Engineering Runbooks

Focused ops/dev runbooks (intent, contracts, pitfalls, codepaths). Prefer these over root markdown reports for day-to-day work.

| Topic | Doc |
|-------|-----|
| Passkey lockout recovery | [PASSKEY_RECOVERY.md](./PASSKEY_RECOVERY.md) |
| Client session cache / HMR | [SESSION_PERSISTENCE.md](./SESSION_PERSISTENCE.md) |
| Wallee stuck/pending recovery | [WALLEE_PAYMENT_RECOVERY.md](./WALLEE_PAYMENT_RECOVERY.md) |
| Google Ads server-side conversions | [SERVER_SIDE_CONVERSION_SETUP.md](./SERVER_SIDE_CONVERSION_SETUP.md) |
| FCM push + reminder queue | [FCM_PUSH_NOTIFICATIONS.md](./FCM_PUSH_NOTIFICATIONS.md) |
| Durable appointment confirmations | [APPOINTMENT_CONFIRMATIONS.md](./APPOINTMENT_CONFIRMATIONS.md) |
| Auto category waitlist placeholders | [AUTO_CATEGORY_WAITLISTS.md](./AUTO_CATEGORY_WAITLISTS.md) |
| Android / Play packaging (incl. Firebase client) | [ANDROID_PLAY_SUBMISSION.md](./ANDROID_PLAY_SUBMISSION.md) |

## 📋 CSV-Dateien

### 1. **APP_DOCUMENTATION.csv**
Hauptdokumentation aller Features, Komponenten, APIs und Dienste der Anwendung.

**Spalten:**
- `Type` - Art des Elements (FEATURE, API, COMPONENT, COMPOSABLE, UTILITY, STORE, etc.)
- `Name` - Name des Elements
- `Description` - Kurze Beschreibung
- `Dependencies` - Abhängigkeiten zu anderen Komponenten
- `Key Features` - Hauptmerkmale
- `Module` - Zugehöriges Modul
- `Status` - Aktueller Status (Active, In Development, etc.)

**Wichtige Bereiche:**
- 15+ Features (Multi-Tenant, Appointments, Payments, Courses, Auth, etc.)
- 35+ API-Kategorien
- 25+ Vue Components
- 8 Composables
- 6+ Utilities
- 2 Pinia Stores
- 4 Layouts
- 4 Sprachen (de, en, fr, it)

---

### 2. **DATABASE_TABLES.csv**
Detaillierte Dokumentation aller Datenbanktabellen mit Struktur und RLS-Policies.

**Spalten:**
- `Table` - Tabellenname
- `Purpose` - Zweck der Tabelle
- `Key Columns` - Wichtige Spalten
- `RLS Policy` - Row-Level Security Policy Beschreibung
- `Related Tables` - Verbundene Tabellen
- `Foreign Keys` - Fremdschlüsselbeziehungen
- `Records Type` - Beziehungstyp (1-N, 1-1, etc.)

**Tabellen nach Kategorie:**
- **Multi-Tenant** (3 Tabellen): tenants, tenant_settings, tenant_assets
- **Authentifizierung** (13 Tabellen): users, webauthn_credentials, MFA, login tracking
- **Appointments** (8 Tabellen): appointments, locations, working hours, availability
- **Payments** (7 Tabellen): payments, payment_reminders, audit logs, invoices
- **Courses** (8 Tabellen): courses, enrollments, sessions, participants
- **Students** (5 Tabellen): credits, documents, evaluations
- **Cancellations** (3 Tabellen): policies, reasons, rules
- **Integration** (3 Tabellen): SARI sync, mappings, logs
- **Messaging** (5 Tabellen): SMS logs, templates, reminders, queue
- **Analytics** (6 Tabellen): audit logs, error logs, webhooks, metrics

**Insgesamt: 77 Tabellen**

---

### 3. **RLS_POLICIES.csv**
Detaillierte Row-Level Security Policies für Datenschutz und Zugriffskontrolle.

**Spalten:**
- `Table` - Tabellenname
- `Policy Name` - Name der Policy
- `Policy Type` - Typ (SELECT, INSERT, UPDATE, DELETE)
- `Roles` - Betroffene Rollen (super_admin, admin, staff, customer, anon, service_role)
- `Condition` - SQL-Bedingung der Policy
- `Access Level` - Art des Zugriffs (READ, WRITE, CREATE, DELETE)
- `Notes` - Anmerkungen

**Rollen-Hierarchie:**
1. **super_admin** - Cross-tenant Vollzugriff
2. **tenant_admin** - Voller Zugriff auf Tenant
3. **admin** - Admin-Funktionen innerhalb Tenant
4. **staff** - Mitarbeiter mit eingeschränktem Zugriff
5. **customer** - Kunden mit Selbstzugriff
6. **anon** - Öffentlicher Zugriff (begrenzt)
7. **service_role** - Backend-Operationen (umgeht RLS)

**Hauptzugriffsmuster:**
- Tenant-Isolation: `tenant_id IN (SELECT tenant_id FROM users WHERE auth_user_id = auth.uid())`
- Selbstzugriff: `auth_user_id = auth.uid()` oder `user_id = auth.uid()`
- Public Read: `active = true` oder `available = true`

**Insgesamt: 110+ Policies**

---

### 4. **API_ENDPOINTS.csv**
Dokumentation aller 170+ API-Endpoints mit Parametern und Abhängigkeiten.

**Spalten:**
- `Endpoint` - API-Pfad
- `Method` - HTTP-Methode (GET, POST, DELETE)
- `Purpose` - Zweck des Endpoints
- `Authentication` - Erforderliche Authentifizierung
- `Input Parameters` - Eingabeparameter
- `Output` - Rückgabedaten
- `Related Tables` - Betroffene Tabellen
- `Module` - API-Modul
- `Status` - Status

**API-Module:**
- **Auth** (10 Endpoints) - Authentifizierung und WebAuthn
- **Appointments** (6 Endpoints) - Terminverwaltung
- **Payments** (15 Endpoints) - Zahlungsabwicklung
- **Wallee** (4 Endpoints) - Wallee Payment Provider
- **Booking** (9 Endpoints) - Öffentliches Buchungssystem
- **Staff** (25 Endpoints) - Mitarbeiterverwaltung
- **Courses** (2 Endpoints) - Kursenverwaltung
- **SARI** (8 Endpoints) - SARI-Integration
- **Admin** (8 Endpoints) - Admin-Funktionen
- **Calendar** (4 Endpoints) - Kalendarintegration
- **Cancellations** (6 Endpoints) - Stornierungsverwaltung
- **Invoices** (7 Endpoints) - Rechnungsverwaltung
- **Pricing** (2 Endpoints) - Preisberechnung
- **Cron** (6 Endpoints) - Geplante Aufträge

**Insgesamt: 170+ Endpoints**

---

### 5. **DATA_FLOWS.csv**
Dokumentation wichtiger Datenflüsse und Geschäftsprozesse der Anwendung.

**Spalten:**
- `Flow Name` - Name des Datenflusses
- `Process Description` - Beschreibung des Prozesses
- `Participants` - Beteiligte Systeme/Rollen
- `Key Tables` - Betroffene Tabellen
- `Steps` - Detaillierte Schritte
- `Trigger` - Was löst den Prozess aus
- `Outcome` - Ergebnis des Prozesses
- `Dependencies` - Abhängigkeiten

**Dokumentierte Flows (25+):**
1. **Authentifizierung:** User Registration, Login, WebAuthn, MFA
2. **Buchung:** Appointment Creation, Availability Recalculation
3. **Zahlungen:** Payment Processing, Payment Reminders, Cash Management
4. **Kurse:** Course Enrollment, SARI Sync, Student Enrollment
5. **Verwaltung:** Invoice Generation, Evaluations, Document Upload
6. **Sicherheit:** Role-Based Access, Rate Limiting, IP Blocking
7. **Integration:** External Calendar Sync, SMS Reminders, Wallee Webhooks

---

## 🏗️ App-Architektur

### Frontend
- **Framework:** Nuxt 3 (Vue 3)
- **UI Library:** Nuxt UI + Tailwind CSS
- **State Management:** Pinia
- **Calendar:** FullCalendar
- **PDF:** jsPDF
- **Internationalization:** i18n (de, en, fr, it)

### Backend
- **Runtime:** Node.js (Nitro)
- **Database:** PostgreSQL via Supabase
- **Auth:** Supabase Auth + WebAuthn
- **Session:** JWT + Cookies

### External Services
- **Payments:** Wallee, Stripe
- **Email:** Resend
- **SMS:** Twilio
- **Course Management:** SARI API
- **Storage:** Supabase Storage

---

## 🔐 Sicherheitsfeatures

### Authentifizierung
- ✅ Password-basierte Authentifizierung
- ✅ WebAuthn/Passkeys (Biometrie + Hardware Keys)
- ✅ Multi-Factor Authentication (MFA)
- ✅ Backup Codes
- ✅ Password Reset via Email

### Zugriffskontrolle
- ✅ Row-Level Security (RLS) auf allen Tabellen
- ✅ Rollen-basierte Zugriffskontrolle (RBAC)
- ✅ Tenant-Isolation
- ✅ Benutzer-spezifische Datenansichten

### Audit & Logging
- ✅ Vollständiger Audit Trail aller Änderungen
- ✅ Error Logging mit Stack Traces
- ✅ Webhook Logging
- ✅ Rate Limiting
- ✅ Login Attempt Tracking
- ✅ IP Blocking

---

## 💳 Zahlungssystem

### Zahlungsanbieter
- **Wallee** (primär für CH/EU)
- **Stripe** (Fallback, PayPal)
- **TWINT** (über Wallee/Stripe)

### Zahlungsmethoden
- Online: Wallee, Stripe, TWINT
- Offline: Cash, Invoice, Student Credits
- Banküberweisung: Über Invoices

### Zahlungsprozess
1. Zahlungsanforderung
2. Payment Record erstellen
3. Zahlungs-Gateway aufrufen
4. Webhook empfangen
5. Status aktualisieren
6. Bestätigungsemail senden
7. Multi-stage Reminders bei ausstehend

---

## 📚 Kursverwaltung

### Kurstypen
- **VKU** (Verkehrskunde) - SARI synchronisiert
- **PGS** (Zusatzkurse) - SARI synchronisiert
- **Private** - Eigene Kurse

### Ablauf
1. Kurs erstellen/aus SARI synchronisieren
2. Kurssession planen
3. Studenten einschreiben
4. Zahlung verarbeiten
5. Teilnehmerdaten zu SARI synchronisieren
6. Anwesenheit/Ergebnisse erfassen

---

## 📊 Wichtige Konzepte

### Multi-Tenancy
- Separate Tenant-Datenbereiche
- Tenant-spezifische Einstellungen
- Branding pro Tenant
- Isolation via RLS

### Verfügbarkeitsberechnung
- Mitarbeiterstunden definieren
- Externe Kalender synchronisieren
- Slots pre-berechnen
- Konflikte auflösen
- Asynchrone Queue-Verarbeitung

### Zahlungserinnerungen
- 3-stufiges Erinnerungssystem (1, 3, 7 Tage)
- Email + SMS Optionen
- Vorlagen mit Variablen
- Retry-Logik bei Fehlern

### SARI-Integration
- Kurs-Synchronisation (täglich)
- Studenten-Enroll/Unenroll
- FABERID Mapping
- Fehlerbehandlung + Logging

---

## 🔄 Häufige Workflows

### Neuer Kunde bucht Unterricht
1. Public Booking Page aufrufen
2. Kategorie + Daten auswählen
3. Verfügbare Slots anzeigen (pre-computed)
4. Slot reservieren (temp. Lock)
5. Kundendaten eingeben
6. Zahlung verarbeiten (Wallee/Cash)
7. Termin erstellen
8. Bestätigungsemail versenden

### Mitarbeiter erstellt Termin
1. Mitarbeiter-Dashboard öffnen
2. Neuen Termin erstellen
3. Daten eingeben (Kunde, Zeit, Ort)
4. Verfügbarkeit prüfen
5. Preis berechnen
6. Zahlung einleiten
7. Termin speichern
8. Verfügbarkeitsslots aktualisieren

### Admin verwaltet Zahlungen
1. Zahlungsliste öffnen (optional: Filter)
2. Zahlungsdetails prüfen
3. Status aktualisieren (bei Cash-Zahlungen)
4. Erinnerungen manuell versenden
5. Rechnungen erstellen
6. Quittungen exportieren (PDF)

---

## 📖 CSV-Struktur Zusammenfassung

| Datei | Tabellen | Zeilen | Zweck |
|-------|----------|--------|-------|
| APP_DOCUMENTATION.csv | N/A | 65+ | Feature/API Überblick |
| DATABASE_TABLES.csv | 77 | 90+ | Tabellenstruktur + RLS |
| RLS_POLICIES.csv | 77 | 110+ | Sicherheitspolicies |
| API_ENDPOINTS.csv | N/A | 170+ | API Referenz |
| DATA_FLOWS.csv | N/A | 25+ | Geschäftsprozesse |

**Gesamt: 590+ Zeilen dokumentierter Information**

---

## 🚀 Verwendung dieser Dokumentation

### Für neue Entwickler
1. Lesen Sie APP_DOCUMENTATION.csv für Features-Überblick
2. Lesen Sie API_ENDPOINTS.csv für verfügbare Endpoints
3. Lesen Sie DATA_FLOWS.csv für Geschäftsprozesse verstehen

### Für Backend-Arbeit
1. DATABASE_TABLES.csv für Tabellenstruktur
2. RLS_POLICIES.csv für Sicherheitspolicies
3. DATA_FLOWS.csv für Datenflussmuster

### Für Frontend-Arbeit
1. APP_DOCUMENTATION.csv für Components/Composables
2. API_ENDPOINTS.csv für API Integration
3. DATA_FLOWS.csv für UX-Flows

### Für QA/Testing
1. DATA_FLOWS.csv für Testfälle
2. API_ENDPOINTS.csv für API Tests
3. RLS_POLICIES.csv für Sicherheitstests

---

## 📝 Wartung dieser Dokumentation

Bei Änderungen am System:
- API-Änderungen → Aktualisieren Sie API_ENDPOINTS.csv
- Tabellenänderungen → Aktualisieren Sie DATABASE_TABLES.csv
- Policy-Änderungen → Aktualisieren Sie RLS_POLICIES.csv
- Feature-Änderungen → Aktualisieren Sie APP_DOCUMENTATION.csv
- Prozess-Änderungen → Aktualisieren Sie DATA_FLOWS.csv

---

**Dokumentation erstellt:** 2026-02-26  
**Aktuelle App-Version:** Production-Ready  
**Technologie Stack:** Nuxt 3 + Supabase + Wallee
