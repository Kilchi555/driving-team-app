# SARI Enrollment System - Zusammenfassung

## Überblick

Das neue SARI Enrollment System ermöglicht es Benutzer:innen, sich direkt über die öffentliche Webseite für SARI-verwaltete Kurse anzumelden und per Wallee zu bezahlen.

## Komponenten

### 1. Frontend - Enrollment Page (`pages/courses/enroll/[id].vue`)

#### SARI Course Flow:
- **Schritt 1: SARI Lookup**
  - Benutzer gibt FABERID (Ausweisnummer) und Geburtsdatum ein
  - System ruft Daten aus SARI ab via `/api/sari/lookup-customer`
  - Daten werden vorausgefüllt angezeigt

- **Schritt 2: Datenbestätigung**
  - System zeigt alle geladen Daten: Name, Email, Telefon, Adresse, etc.
  - E-Mail-Feld kann manuell eingegeben werden, falls nicht in SARI vorhanden
  - Benutzer bestätigt die Anmeldung

- **Schritt 3: Wallee Payment**
  - Benutzer wählt Zahlungsmethode: Kreditkarte, TWINT, PayPal
  - System erstellt Wallee Transaction via `/api/payment-gateway/create-transaction`
  - Benutzer wird zu Wallee Payment Page weitergeleitet

- **Schritt 4: Success Page**
  - Nach erfolgreichem Payment wird Benutzer zu `/courses/enrollment-success` weitergeleitet
  - System verarbeitet Anmeldung: 
    - Erstellt `course_participant`
    - Erstellt `course_registration`
    - Meldet in SARI an
    - Sendet Bestätigungsmail

#### Non-SARI Course Flow:
- Standard Email-Check Flow (existierend)
- Login oder Registration
- Keine Payment-Integration (existierend)

### 2. Backend APIs

#### `/api/sari/lookup-customer` (POST)
**Input:**
```json
{
  "faberid": "5401234567890",
  "birthdate": "1990-01-15",
  "tenantId": "uuid"
}
```

**Output:**
```json
{
  "success": true,
  "data": {
    "first_name": "Max",
    "last_name": "Mustermann",
    "email": "max@example.com",
    "phone": "+41791234567",
    "birthdate": "1990-01-15",
    "street": "Musterstrasse 42",
    "zip": "8000",
    "city": "Zürich"
  }
}
```

#### `/api/payment-gateway/create-transaction` (POST)
**Input:**
```json
{
  "orderId": "SARI-course-uuid-timestamp",
  "amount": 150,
  "currency": "CHF",
  "customerEmail": "max@example.com",
  "customerName": "Max Mustermann",
  "description": "Kurs: VKU Lachen",
  "successUrl": "http://localhost:3000/courses/enrollment-success?courseId=...",
  "failedUrl": "http://localhost:3000/courses/enroll/...",
  "userId": "anonymous",
  "tenantId": "uuid",
  "metadata": {
    "type": "SARI_COURSE_ENROLLMENT",
    "course_id": "uuid",
    "sari_course_id": "GROUP_...",
    "faberid": "5401234567890",
    "birthdate": "1990-01-15",
    "participant_data": {...}
  },
  "lineItems": [...]
}
```

**Output:**
```json
{
  "success": true,
  "provider": "wallee",
  "transactionId": "wallee_transaction_id",
  "paymentUrl": "https://wallee.com/checkout/..."
}
```

#### `/api/courses/enroll-complete` (POST)
**Input:**
```json
{
  "courseId": "uuid",
  "transactionId": "wallee_transaction_id",
  "isSARI": true
}
```

**Verarbeitet:**
1. Verifikation der Wallee Payment
2. Erstellung von `course_participant`
3. Erstellung von `course_registration`
4. SARI API Enrollment
5. Email Bestätigung versenden

### 3. Email Templates

Zwei verschiedene Email-Templates:

#### SARI Enrollment Confirmation
- Spezifisch für SARI-Kurse
- Zeigt Zahlungsbetrag
- Professional Design mit Gradient Header

#### Non-SARI Enrollment Confirmation
- Standard Enrollment Bestätigung
- Zeigt Kursleiter Information
- Gleiches Design

### 4. Database

#### `course_participants` Table
```sql
- id (UUID PRIMARY KEY)
- tenant_id (FK to tenants)
- user_id (FK to users, nullable)
- faberid (VARCHAR)
- first_name, last_name
- email, phone
- birthdate
- street, zip, city
- sari_synced (BOOLEAN)
- sari_synced_at (TIMESTAMPTZ)
- created_at, updated_at
```

#### `course_registrations` Table (Updated)
```sql
- id (UUID PRIMARY KEY)
- course_id (FK to courses)
- participant_id (FK to course_participants)
- status (VARCHAR)
- sari_synced (BOOLEAN)
- sari_synced_at (TIMESTAMPTZ)
```

#### `payments` Table
- Speichert Wallee Transactions
- Metadata enthält Participant Data und SARI Info

## Flow Diagramm

```
┌─────────────────────────────────┐
│ Kursmeldung Seite               │
│ /courses/enroll/[courseId]      │
└─────────────────────────────────┘
            ↓
    ┌──────────────────┐
    │ SARI Course?     │
    └──────────────────┘
         ↙         ↖
      Ja            Nein
      ↓              ↓
  ┌─────────┐   ┌──────────┐
  │SARI     │   │Standard  │
  │Lookup   │   │Email     │
  └─────────┘   └──────────┘
      ↓              ↓
  ┌─────────┐   ┌──────────┐
  │Confirm  │   │Login/    │
  │Data     │   │Register  │
  └─────────┘   └──────────┘
      ↓              ↓
  ┌─────────┐   ┌──────────┐
  │Wallee   │   │Complete  │
  │Payment  │   │(no pay)  │
  └─────────┘   └──────────┘
      ↓              ↓
  ┌─────────────────────────┐
  │ /courses/enrollment-    │
  │ success                 │
  └─────────────────────────┘
      ↓
  ┌─────────────────────────┐
  │ Process Enrollment:     │
  │ - Create Participant    │
  │ - Create Registration   │
  │ - Enroll in SARI        │
  │ - Send Email            │
  └─────────────────────────┘
```

## Sicherheit

- FABERID + Birthdate sind erforderlich für SARI Lookup
- Wallee Payment verification vor Enrollment
- SARI Enrollment mittels Tenant API Credentials
- Email wird verifiziert bevor Bestätigung versendet

## Wiederverwendung Bestehender Systeme

✅ **Wallee Payment System** - Nur Wallee (Stripe deaktiviert)
✅ **Resend Email Service** - Für Bestätigungsmails
✅ **Supabase Auth** - Für User Management (Non-SARI)
✅ **SARI Client** - Für SARI API Calls
✅ **Payment Provider Factory** - Für Tenant-spezifische Payment Config
✅ **SARISyncEngine** - Für SARI Integration

## Nächste Schritte

1. Testing des kompletten Flows
2. Webhook Setup für Wallee Payment Confirmations
3. Public Page SEO Optimierung
4. Mobile Responsive Design Testing
5. Error Handling & User Feedback Refinement

