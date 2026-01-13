# 🔗 SARI Integration - Anforderungsanalyse & Action Plan

## ✅ WAS WIR HABEN:

### API Credentials (Kyberna bestätigt):
- ✅ Username: `API_DrivingTeamZuerich`
- ✅ Client ID: `18_ldj4gwmhh1i123ws0kur3ggkorro12s122o4kiekszrbdg55hh`
- ✅ Client Secret: `qrygfdertab97kogwrrsc078hgfdw48oowg9946c1m2n3h4i7H`
- ✅ Endpunkte: Version 1.3 sind aktuell
- ✅ Test-Umgebung: Vorhanden (älterer Stand als Live)
- ✅ Rate Limits: Fair-Usage (keine festen Limits, aber im Rahmen halten)

### Dokumentation:
- ✅ API v1.3 Dokumentation verfügbar
- ⚠️ Aktualisierte Version kommt später

---

## ❌ WAS NOCH FEHLT:

### 1. 🚀 API Integration Implementation
**KRITISCH - Muss gebaut werden:**

```typescript
// 1. OAuth2 Authentication Flow für SARI
// - Token Request/Refresh
// - Token Storage & Rotation
// - Error Handling

// 2. API Wrapper/Client
// - Basis HTTP Client
// - Request/Response Handling
// - Error Mapping

// 3. Sync Funktionalität für:
  ☐ Kursdaten (Courses)
    - Kurs-ID, Name, Datum, Uhrzeit
    - Maximal Teilnehmer, Preis
    - Ort, Instruktor
    
  ☐ Kundendaten (Customers)
    - Persönliche Daten
    - Anschrift
    - Kontaktinfos
    
  ☐ Anmeldungen (Registrations)
    - Kurs + Kunde Verknüpfung
    - Status (Pending, Confirmed, Cancelled)
    - Zahlung Status
    
  ☐ Kurs Status (Course Status)
    - Verfügbare Plätze
    - Status (offen, voll, cancelled)
    - Änderungshistorie

// 4. Bidirektionale Sync
  - Initial Sync (Load all data)
  - Incremental Sync (nur Änderungen)
  - Conflict Resolution
  - Error Recovery
```

### 2. 📊 Datenbank-Tabellen
**Neue Tabellen für SARI Daten:**

```sql
-- SARI Synchronisierung
CREATE TABLE sari_sync_log (
  id UUID PRIMARY KEY,
  entity_type VARCHAR, -- 'course', 'customer', 'registration'
  entity_id VARCHAR,
  action VARCHAR, -- 'sync_from_sari', 'push_to_sari'
  status VARCHAR, -- 'success', 'failed', 'pending'
  error_message TEXT,
  synced_at TIMESTAMP,
  next_retry TIMESTAMP
);

-- SARI Kurs-Mapping
CREATE TABLE sari_courses (
  id UUID PRIMARY KEY,
  sari_course_id VARCHAR UNIQUE,
  driving_team_course_id UUID REFERENCES courses(id),
  sari_data JSONB,
  last_synced_at TIMESTAMP,
  sync_status VARCHAR
);

-- SARI Kunden-Mapping
CREATE TABLE sari_customers (
  id UUID PRIMARY KEY,
  sari_customer_id VARCHAR UNIQUE,
  driving_team_user_id UUID REFERENCES users(id),
  sari_data JSONB,
  last_synced_at TIMESTAMP,
  sync_status VARCHAR
);

-- SARI Anmeldungen
CREATE TABLE sari_registrations (
  id UUID PRIMARY KEY,
  sari_registration_id VARCHAR UNIQUE,
  sari_course_id VARCHAR,
  sari_customer_id VARCHAR,
  driving_team_appointment_id UUID,
  status VARCHAR,
  sari_data JSONB,
  last_synced_at TIMESTAMP
);
```

### 3. 🔄 Sync Engine
**Backend Logik:**

```typescript
// server/api/sari/sync.post.ts - Main Sync Endpoint

interface SARISyncOptions {
  syncType: 'full' | 'incremental'
  entities: ('courses' | 'customers' | 'registrations')[]
  forceResync: boolean
}

// Funktionen:
- getSARIToken() - OAuth2 Flow
- refreshSARIToken() - Token Refresh
- syncSARICourses() - Download Kurse
- syncSARICustomers() - Download Kunden
- syncSARIRegistrations() - Download Anmeldungen
- pushToSARI() - Upload Änderungen
- handleSyncConflict() - Konflikt-Lösung
- logSyncActivity() - Audit Trail
```

### 4. 🎯 Webhook Handling (für Zukunft)
**Kyberna plant Webhooks - vorbereiten:**

```typescript
// server/api/webhooks/sari.post.ts
// Wird später implementiert für:
- course.updated
- customer.updated
- registration.created
- registration.cancelled
- registration.status_changed
```

### 5. ⚙️ Nuxt Integration
**Frontend/UI für Sync:**

```vue
// pages/admin/sari-sync.vue
- Sync Status Dashboard
- Manual Sync Trigger
- Sync History Log
- Error Report
- Mapping Management
- Test Connection
```

### 6. 🧪 Testumgebung Setup
**Muss konfiguriert werden:**

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  runtimeConfig: {
    sari: {
      apiUrl: process.env.SARI_API_URL, // https://test.kyberna.ch oder live
      clientId: process.env.SARI_CLIENT_ID,
      clientSecret: process.env.SARI_CLIENT_SECRET,
      username: process.env.SARI_USERNAME,
      environment: process.env.SARI_ENV // 'test' oder 'production'
    }
  }
})
```

---

## 📋 ANFORDERUNGEN ZUSAMMENFASSUNG:

### DATEN ZU SYNCHRONISIEREN:

1. **Kurse (Courses)**
   - Kurs-ID, Name, Beschreibung
   - Start Datum/Zeit, Dauer
   - Preis, Max Teilnehmer
   - Ort/Standort
   - Instruktor/Lehrer
   - Status (aktiv, cancelled, archived)

2. **Kunden (Customers)**
   - Vorname, Nachname
   - Email, Telefon
   - Adresse
   - Geburtsdatum
   - Kategorie/Fahrzeugklasse

3. **Anmeldungen (Registrations)**
   - Kurs-ID
   - Kunden-ID
   - Anmeldedatum
   - Status (pending, confirmed, cancelled)
   - Zahlung Status
   - Notizen

4. **Kurs Status**
   - Verfügbare Plätze
   - Gesamtstatus
   - Änderungen/Historie

---

## 🚀 IMPLEMENTATION ROADMAP:

### Phase 1: Foundation (Woche 1-2)
- [ ] SARI API Client implementieren
- [ ] OAuth2 Authentication
- [ ] Datenbank-Tabellen erstellen
- [ ] Basis Sync Engine

### Phase 2: Core Sync (Woche 3-4)
- [ ] Course Sync
- [ ] Customer Sync
- [ ] Registration Sync
- [ ] Conflict Resolution

### Phase 3: UI & Monitoring (Woche 5)
- [ ] Admin Dashboard
- [ ] Sync Status Page
- [ ] Error Reporting
- [ ] Manual Trigger

### Phase 4: Testing & Optimization (Woche 6)
- [ ] Test in Test-Umgebung
- [ ] Performance Optimierung
- [ ] Error Recovery
- [ ] Documentation

### Phase 5: Webhooks (Später)
- [ ] Webhook Support vorbereiten
- [ ] Event Listeners
- [ ] Real-time Sync

---

## 🔐 SECURITY CHECKLIST:

- [ ] Credentials in Environment Variables (NICHT im Code!)
- [ ] Token Refresh automatisieren
- [ ] Rate Limits implementieren (Fair-Usage)
- [ ] Error Logs ohne sensitive Daten
- [ ] API Secret Rotation vorbereiten
- [ ] Audit Trail für alle Syncs

---

## 📞 NÄCHSTE SCHRITTE:

1. **Mit Kyberna klären:**
   - [ ] Genaue Endpunkt-Dokumentation v1.3 anfragen
   - [ ] Beispiel-Responses für alle Endpoints
   - [ ] Test-Daten für VKU/PGS Kurse
   - [ ] Webhook-Timeline erfragen

2. **Setup:**
   - [ ] Test-Umgebung Zugang aktivieren
   - [ ] Test-Credentials generieren
   - [ ] API-Calls dokumentieren

3. **Entwicklung:**
   - [ ] SARI API Client bauen
   - [ ] Sync-Engine implementieren
   - [ ] Test-Suite schreiben

---

## 💡 DESIGN CONSIDERATIONS:

**Fragen für Kyberna klären:**

1. **Eindeutige IDs:**
   - Wie identifizieren wir Kurse eindeutig?
   - Gibt es stable IDs?

2. **Updates:**
   - Welche Felder können wir ändern?
   - Nur Änderungen pushen oder komplette Replace?

3. **Duplikate:**
   - Was wenn ein Kurs/Kunde in SARI schon existiert?
   - Merge oder Skip?

4. **Zeitstempel:**
   - Sind `last_modified` Timestamps verfügbar?
   - Für Incremental Sync notwendig!

5. **Rate Limits Detail:**
   - Wie viele Calls planst du pro Minute?
   - Batch-Requests möglich?

---

## 📊 ESTIMATED EFFORT:

- API Client: 2-3 Tage
- Sync Engine: 3-4 Tage
- UI Dashboard: 2 Tage
- Testing: 2 Tage
- **TOTAL: ~2 Wochen**

---

## PRIORITÄT:

🔴 **CRITICAL:** Klär mit Kyberna zuerst ab!
- Exakte Dokumentation
- Test-Daten
- Eindeutige Felder

🟡 **HIGH:** Starten nach:
- SARI API Client
- Datenbank Setup
- Initial Sync

🟢 **MEDIUM:** Später:
- UI Dashboard
- Webhooks
- Optimierung

---

**Sollen wir starten mit der SARI API Client Implementation?**

