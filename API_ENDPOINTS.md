# API Endpoints - Driving Team App

**Total Endpoints:** 193

---

## 🔐 Authentication (15 endpoints)

### Login & Registration
- `POST /api/auth/login` - Benutzer-Login
- `POST /api/auth/register-client` - Kundenregistrierung
- `POST /api/auth/password-reset-request` - Passwort-Reset anfordern
- `POST /api/auth/validate-reset-token` - Reset-Token validieren
- `POST /api/auth/reset-password` - Passwort zurücksetzen

### MFA (Multi-Factor Authentication)
- `POST /api/auth/send-mfa-code` - MFA-Code senden
- `POST /api/auth/verify-mfa-login` - MFA-Login verifizieren
- `POST /api/auth/get-mfa-methods` - MFA-Methoden auflisten

### WebAuthn (Passkeys/Biometrie)
- `POST /api/auth/webauthn-registration-options` - WebAuthn Registrierung starten
- `POST /api/auth/webauthn-register` - WebAuthn Registrierung abschließen
- `GET /api/auth/webauthn-credentials` - WebAuthn Credentials abrufen
- `DELETE /api/auth/webauthn-credential/{id}` - WebAuthn Credential löschen
- `POST /api/auth/webauthn-assertion-options` - WebAuthn Login starten
- `POST /api/auth/webauthn-login-verify` - WebAuthn Login verifizieren
- `POST /api/auth/check-webauthn` - WebAuthn Unterstützung prüfen

### Document Upload
- `POST /api/auth/upload-document` - Dokument hochladen

---

## 👥 Customer APIs (6 endpoints) - **Neu!**

- `GET /api/customer/get-appointments` - Kundentermine mit Staff-Daten
- `GET /api/customer/get-pending-confirmations` - Termine zur Bestätigung ausstehend
- `GET /api/customer/get-payments` - Zahlungsübersicht
- `GET /api/customer/get-staff-names` - Fahrlehrerliste
- `POST /api/customer/manage-documents` - Dokumentenverwaltung
- `POST /api/customer/update-profile` - Profilupdate

---

## 📅 Appointments (8 endpoints)

- `POST /api/appointments/save` - Termin erstellen/bearbeiten
- `POST /api/appointments/confirm` - Termin bestätigen
- `POST /api/appointments/resend-confirmation` - Bestätigungsmail erneut senden
- `POST /api/appointments/cancel-customer` - Termin absagen (Kunde)
- `POST /api/appointments/handle-cancellation` - Abbruch-Logik
- `POST /api/appointments/adjust-duration` - Dauer anpassen

---

## 📆 Calendar (3 endpoints)

- `GET /api/calendar/get-appointments` - Kalender-Termine laden (mit Cache)
- `GET /api/calendar/ics.get` - iCalendar Export
- `POST /api/calendar/generate-token` - Zugangstoken generieren

---

## 💳 Payments (15+ endpoints)

### Payment Management
- `POST /api/payments/create` - Zahlung erstellen (alt)
- `POST /api/payments/create-payment` - Zahlung erstellen (neu)
- `GET /api/payments/list` - Zahlungsliste
- `POST /api/payments/status` - Zahlungsstatus
- `POST /api/payments/confirm-cash` - Bar-Zahlung bestätigen
- `POST /api/payments/convert-to-online` - Bar → Online konvertieren
- `POST /api/payments/reset-failed` - Fehlgeschlagene Zahlung zurücksetzen
- `POST /api/payments/process-immediate` - Sofort verarbeiten
- `POST /api/payments/settle-and-email` - Abrechnung + Email
- `POST /api/payments/receipt` - Quittung generieren

### Wallee Integration
- `POST /api/wallee/create-transaction` - Wallee-Transaktion erstellen
- `POST /api/wallee/authorize-payment` - Zahlung autorisieren
- `POST /api/wallee/save-payment-token` - Token speichern
- `POST /api/wallee/webhook` - Webhook-Callback
- `POST /api/wallee/webhook-payment` - Payment-Webhook

### Webhooks
- `POST /api/webhooks/wallee-refund` - Rückerstattungs-Webhook

---

## 👨‍🏫 Staff & Admin (25+ endpoints)

### Staff Management
- `POST /api/staff/register` - Staff registrieren
- `POST /api/staff/invite` - Staff einladen
- `POST /api/staff/invite-external-instructor` - Externer Instructor

### Admin User Management
- `POST /api/admin/create-user` - User erstellen
- `POST /api/admin/create-auth-user` - Auth-User erstellen
- `GET /api/admin/debug-user` - User debuggen
- `GET /api/admin/check-auth-user` - Auth-User prüfen
- `POST /api/admin/update-tenant-user` - Tenant-User updaten
- `POST /api/admin/update-user-assigned-staff` - Fahrlehrerschaft zuweisen
- `GET /api/admin/get-tenant-users` - Tenant-User auflisten
- `GET /api/admin/get-students` - Schüler auflisten
- `GET /api/admin/get-pending-appointments` - Ausstehende Termine

### Device Management (WebAuthn/Security)
- `POST /api/admin/create-test-device` - Test-Device erstellen
- `POST /api/admin/update-user-device` - Device updaten
- `POST /api/admin/remove-user-device` - Device entfernen
- `POST /api/admin/device-security` - Device-Sicherheit
- `POST /api/admin/device-security-handler` - Security-Handler

---

## 🛡️ Security & Error Tracking (10+ endpoints)

### Error Logging & Analytics
- `GET /api/admin/error-logs-debug` - Debug Error-Logs
- `GET /api/admin/error-logs` - Error-Logs anzeigen
- `POST /api/admin/error-group` - Error-Gruppen
- `POST /api/admin/error-update-status` - Status updaten
- `GET /api/admin/error-trends` - Error-Trends
- `GET /api/admin/rate-limit-logs` - Rate-Limit-Logs

### Security Settings
- `POST /api/security/block-ip` - IP blockieren
- `POST /api/security/save-settings` - Sicherheits-Settings speichern

### Rate Limiting
- `GET /api/admin/rate-limit-logs` - Rate-Limit-Logs

---

## 📧 Notifications & Communication (15+ endpoints)

### Email
- `POST /api/email/send-appointment-notification` - Terminerinnerung
- `POST /api/email/send-wallee-payment-link` - Zahlungslink
- `POST /api/admin/email-templates` - Email-Templates

### SMS
- `POST /api/sms/send` - SMS versenden
- `POST /api/sms/test-sender` - SMS-Test

### Reminders
- `POST /api/reminders/send-payment-confirmation` - Zahlungsbestätigung
- `POST /api/reminders/send-deletion-notification` - Lösch-Benachrichtigung
- `POST /api/cron/send-payment-reminders` - Payment-Reminders (Cron)

### Student Onboarding
- `POST /api/students/send-onboarding-email` - Onboarding-Email
- `POST /api/students/send-onboarding-sms` - Onboarding-SMS
- `POST /api/students/send-onboarding-reminder` - Onboarding-Reminder
- `POST /api/students/verify-onboarding-token` - Token verifizieren
- `POST /api/students/complete-onboarding` - Onboarding abschließen

---

## 📚 Booking & Reservations (4 endpoints)

- `POST /api/booking/reserve-slot` - Slot reservieren
- `POST /api/booking/create-appointment` - Termin aus Slot erstellen
- `POST /api/booking/cancel-reservation` - Reservation stornieren
- `POST /api/booking/get-availability-data` - Verfügbarkeitsdaten
- `POST /api/booking/get-user-payment-token` - Payment-Token abrufen

---

## 🏫 Courses & SARI Integration (15+ endpoints)

### Courses
- `POST /api/courses/enroll-complete` - Kurs-Anmeldung
- `POST /api/courses/enroll` - Kurs anmelden

### SARI (Schulverwaltungs-API)
- `POST /api/sari/sync-courses` - Kurse synchronisieren
- `GET /api/sari/sync-status` - Sync-Status
- `POST /api/sari/test-connection` - Verbindung testen
- `POST /api/sari/save-settings` - Settings speichern
- `POST /api/sari/enroll-student` - Student anmelden
- `POST /api/sari/unenroll-student` - Student abmelden
- `POST /api/sari/validate-student` - Student validieren
- `POST /api/sari/validate-enrollment` - Anmeldung validieren
- `POST /api/sari/lookup-customer` - Kunde suchen
- `POST /api/sari/sync-participants` - Teilnehmer syncen
- `POST /api/sari/test-participants` - Test-Teilnehmer

### Course Participants
- `POST /api/course-participants/create` - Teilnehmer erstellen

---

## 💰 Student Credits (2 endpoints)

- `POST /api/student-credits/request-withdrawal` - Auszahlung anfordern
- `POST /api/student-credits/process-withdrawal-wallee` - Via Wallee verarbeiten

---

## 🎫 Vouchers (4 endpoints)

- `POST /api/vouchers/create-after-purchase` - Nach Kauf erstellen
- `POST /api/vouchers/redeem` - Einlösen
- `POST /api/vouchers/download-pdf` - PDF herunterladen
- `POST /api/vouchers/send-email` - Per Email versenden

---

## 🏢 Tenant Management (3 endpoints)

- `POST /api/tenants/register` - Tenant registrieren
- `GET /api/tenants/by-slug` - Nach Slug laden
- `POST /api/tenants/update-branding` - Branding updaten

---

## 📄 Documents (3 endpoints)

- `POST /api/students/upload-document` - Dokument hochladen
- `GET /api/documents/list-user-documents` - Dokumente auflisten
- `POST /api/medical-certificate/upload` - Arztzeugnis hochladen
- `POST /api/medical-certificate/approve` - Arztzeugnis genehmigen
- `POST /api/medical-certificate/reject` - Arztzeugnis ablehnen

---

## 📊 Analytics & Imports (5+ endpoints)

- `POST /api/analytics/setup` - Analytics-Setup
- `GET /api/analytics/dashboard` - Dashboard-Daten
- `GET /api/imports/customers` - Kundendaten importieren
- `GET /api/imports/invoices` - Rechnungen importieren
- `POST /api/invoices/download` - Rechnung herunterladen

---

## 🗺️ Location & Geocoding (2 endpoints)

- `POST /api/geocoding/resolve-plz` - PLZ auflösen
- `POST /api/pickup/check-distance` - Entfernung prüfen

---

## 🔗 External Integrations (5+ endpoints)

### Calendars
- `POST /api/external-calendars/sync-ics` - iCalendar synchronisieren
- `POST /api/cron/sync-external-calendars` - Sync via Cron

### Accounto (Buchhaltung)
- `GET /api/accounto/test-connection` - Test-Verbindung
- `GET /api/accounto/debug-env` - Debug-Umgebung
- `POST /api/accounto/create-invoice` - Rechnung erstellen

### Payment Gateway
- `POST /api/payment-gateway/create-transaction` - Transaktion erstellen
- `POST /api/payment-gateway/webhook` - Webhook

---

## ⚙️ Admin & Maintenance (25+ endpoints)

### Testing & Debugging
- `GET /api/admin/test` - Test-Endpoint
- `GET /api/debug/auth-test` - Auth-Test
- `GET /api/debug/decode-key` - Key dekodieren
- `POST /api/debug/check-payment` - Payment-Debug
- `POST /api/debug/check-credit-transaction` - Credit-Debug
- `GET /api/debug/tenants` - Tenant-Debug
- `GET /api/debug/test-search` - Search-Test

### Database & RLS Maintenance
- `POST /api/admin/execute-sql` - SQL ausführen
- `POST /api/admin/fix-missing-payment-tokens` - Fehlende Tokens fixen
- `POST /api/admin/fix-tenants-rls` - Tenant RLS fixen
- `POST /api/admin/fix-user-devices-rls` - Device RLS fixen
- `POST /api/admin/create-user-devices-table` - Devices-Table erstellen
- `POST /api/admin/create-user-devices-table-simple` - Einfache Version
- `POST /api/admin/test-device-storage` - Device-Storage testen

### Migration & Sync
- `POST /api/admin/migrate-missing-student-credits` - Credits migrieren
- `POST /api/admin/repair-locations` - Locations reparieren
- `POST /api/admin/sync-wallee-payment` - Wallee-Sync (einzeln)
- `POST /api/admin/sync-all-wallee-payments` - Wallee-Sync (alle)
- `POST /api/admin/create-driving-team-tenant` - Driving Team Tenant erstellen

### Cron Jobs
- `GET /api/admin/cron-status` - Cron-Status
- `POST /api/cron/process-automatic-payments` - Auto-Zahlungen
- `POST /api/cron/cleanup-booking-reservations` - Reservierungen bereinigen
- `POST /api/cron/cleanup-expired-reservations` - Abgelaufene bereinigen
- `POST /api/cron/sync-sari-courses` - SARI-Kurse sync

### Email Configuration
- `GET /api/admin/test-email-config` - Email-Config testen
- `GET /api/admin/test-smtp-config` - SMTP testen
- `GET /api/admin/diagnose-email` - Email diagnostizieren

### Device & WebAuthn
- `POST /api/admin/send-device-verification` - Device-Verification senden
- `POST /api/mfa/webauthn-register-start` - WebAuthn Registration starten
- `POST /api/mfa/webauthn-register-complete` - WebAuthn Registration fertig
- `GET /api/admin/check-transaction-token` - Transaction-Token prüfen
- `GET /api/admin/check-user-devices-rls` - Device-RLS prüfen

### License & Permissions
- `POST /api/admin/upload-license` - Lizenz hochladen

### Billing
- `POST /api/billing-address/create` - Rechnungsadresse erstellen

---

## 🧪 Mock & Testing (2 endpoints)

- `POST /api/mock/create-transaction` - Mock-Transaktion (Test)

---

## 🚀 General (2 endpoints)

- `POST /api/upgrade` - Plan upgraden

---

## 📊 Summary

| Kategorie | Anzahl |
|-----------|--------|
| Authentication | 15 |
| Customer APIs | 6 |
| Appointments | 8 |
| Calendar | 3 |
| Payments | 20+ |
| Staff/Admin | 25+ |
| Security | 10+ |
| Notifications | 15+ |
| Booking | 4 |
| Courses/SARI | 15+ |
| Student Credits | 2 |
| Vouchers | 4 |
| Tenant Management | 3 |
| Documents | 5 |
| Analytics | 5+ |
| Location | 2 |
| External Integrations | 5+ |
| Admin/Maintenance | 25+ |
| Testing | 10+ |
| **Total** | **~193** |

---

## 🔒 Security Notes

✅ **All endpoints require:**
- Authentication (JWT token) - außer öffentliche Endpoints
- Rate Limiting (30-100 requests/minute)
- Input Validation
- Authorization checks (RLS + Backend)
- Error logging/monitoring

✅ **Customer APIs use:**
- Service Role to bypass RLS
- Server-side authorization
- Rate limiting per IP
- Authorization header validation

---

## 🎯 Recent Additions (This Session)

Diese 6 neuen Endpoints wurden zur Behebung von RLS-Relationen-Problemen hinzugefügt:

1. `GET /api/customer/get-appointments` - Kundentermine mit Staff-Daten
2. `GET /api/customer/get-pending-confirmations` - Bestätigungsmodale
3. `GET /api/customer/get-payments` - Zahlungsübersicht  
4. `GET /api/customer/get-staff-names` - Fahrlehrerliste
5. `GET /api/calendar/get-appointments` - Kalender-Termine mit Cache
6. `GET /api/admin/get-pending-appointments` - Pendenzen-Modal

**Grund:** RLS blockiert Foreign Key Relations zu `users` Table, deshalb werden APIs mit Service Role verwendet um Daten zu fetchen.

---

*Zuletzt aktualisiert: 2. Januar 2026*

