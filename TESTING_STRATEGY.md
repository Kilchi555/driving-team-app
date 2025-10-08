# 🧪 Comprehensive Testing Strategy - Driving Team App

## 📋 Testing Overview

Diese Strategie deckt alle kritischen Funktionen der Multi-Tenant Fahrschul-App ab, bevor wir auf Vercel deployen.

### 🎯 Test-Ziele:
- ✅ Alle Core-Features funktional
- ✅ Multi-Tenant System robust
- ✅ Payment Integration stabil
- ✅ File Uploads funktionieren
- ✅ Performance akzeptabel
- ✅ Alle User-Rollen korrekt

---

## 🏗️ 1. Setup - Lokale Test-Umgebung

### **Schritt 1: Dependencies & Environment**
```bash
# 1. Dependencies installieren
npm install

# 2. Environment Variables prüfen
cp .env.example .env  # Falls vorhanden
# Oder manuell erstellen:
touch .env
```

### **Erforderliche Environment Variables für Testing:**
```bash
# Supabase (Cloud - bereits konfiguriert)
SUPABASE_URL=https://unyjaetebnaexaflpyoc.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=service_role_key_hier

# Payment Testing (Wallee Test-Mode)
WALLEE_SPACE_ID=test_space_id
WALLEE_APPLICATION_USER_ID=test_user_id
WALLEE_SECRET_KEY=test_secret_key
WALLEE_USER_ID=test_user_id

# Accounto (Test-Mode oder Mock)
ACCOUNTO_API_KEY=test_api_key
ACCOUNTO_BASE_URL=https://api.accounto.ch

# Google Maps (für Standorte)
VITE_GOOGLE_MAPS_API_KEY=your_test_api_key
```

### **Schritt 2: Server starten**
```bash
npm run dev
# Server läuft auf http://localhost:3000
```

---

## 🧪 2. Test-Plan nach Priorität

### **Phase 1: Grundfunktionen (Critical Path)**

#### **Test 1.1: App lädt & DB-Verbindung**
- [ ] App startet ohne Fehler (`npm run dev`)
- [ ] Hauptseite lädt (http://localhost:3000)
- [ ] Console-Logs zeigen Supabase-Verbindung
- [ ] Keine kritischen JS-Errors in Browser Console

**Test-Commands:**
```bash
# Browser öffnen
open http://localhost:3000

# Console Logs prüfen:
# ✅ "🔗 Initializing Supabase client with URL"
# ❌ "❌ Missing Supabase configuration"
```

#### **Test 1.2: Tenant-System Basis**
- [ ] Hauptseite zeigt Tenant-Auswahl/Landing Page
- [ ] `/login/test-tenant` lädt (auch wenn Tenant nicht existiert)
- [ ] Error-Handling für unbekannte Tenants

#### **Test 1.3: Admin-Zugang**
- [ ] Admin-Login funktioniert (falls bereits Admin-User existiert)
- [ ] Admin-Dashboard lädt
- [ ] Tenant-Verwaltung erreichbar

---

### **Phase 2: Tenant-Management (High Priority)**

#### **Test 2.1: Tenant Registration**
**Endpoint:** `POST /api/tenants/register`

**Test-Data:**
```json
{
  "name": "Test Fahrschule",
  "slug": "test-fahrschule",
  "contact_person_first_name": "Max",
  "contact_person_last_name": "Mustermann", 
  "contact_email": "test@example.com",
  "contact_phone": "+41 78 123 45 67",
  "street": "Teststrasse",
  "streetNr": "123",
  "zip": "8000",
  "city": "Zürich",
  "business_type": "driving_school",
  "primary_color": "#3B82F6",
  "secondary_color": "#10B981"
}
```

**Tests:**
- [ ] Tenant wird erfolgreich erstellt
- [ ] Kundennummer wird generiert (SM-YYMMDD-XXX Format)
- [ ] Standard-Kategorien werden kopiert
- [ ] Tenant erscheint in Datenbank

#### **Test 2.2: Tenant Login & Branding**
- [ ] Login-Seite lädt mit Tenant-Branding
- [ ] Farben werden korrekt angezeigt
- [ ] Logo-Upload und -Anzeige funktioniert
- [ ] Unbekannte Tenant-Slugs zeigen Fehler

#### **Test 2.3: Logo Upload**
- [ ] Logo-Upload bei Tenant-Registration
- [ ] Logo wird in Supabase Storage gespeichert
- [ ] Logo wird korrekt angezeigt
- [ ] Verschiedene Dateiformate (JPG, PNG)

---

### **Phase 3: User Management & Authentication**

#### **Test 3.1: User Registration (verschiedene Rollen)**

**Customer Registration:**
- [ ] Schüler kann sich registrieren
- [ ] E-Mail-Validierung funktioniert
- [ ] Passwort-Anforderungen werden geprüft
- [ ] Benutzer wird korrekt Tenant zugewiesen

**Staff Registration (via Admin):**
- [ ] Admin kann Staff-User erstellen
- [ ] Staff-User erhält korrekte Berechtigungen
- [ ] Staff kann sich anmelden

**Test-Flow:**
```bash
# 1. Tenant erstellen
# 2. Admin-User für Tenant erstellen (via SQL oder API)
# 3. Staff-User über Admin-Interface erstellen
# 4. Customer über Registration-UI registrieren
```

#### **Test 3.2: Login-Flow für alle Rollen**
- [ ] **Admin-Login**: Weiterleitung zu `/admin`
- [ ] **Staff-Login**: Weiterleitung zu `/dashboard`
- [ ] **Customer-Login**: Weiterleitung zu `/customer`
- [ ] Session-Persistenz funktioniert
- [ ] Logout funktioniert korrekt

#### **Test 3.3: Role-Based Access**
- [ ] Admin kann alles sehen
- [ ] Staff sieht nur eigene Tenant-Daten
- [ ] Customer sieht nur eigene Daten
- [ ] Middleware blockiert unerlaubte Zugriffe

---

### **Phase 4: Booking & Calendar System**

#### **Test 4.1: Appointment Creation**
- [ ] Staff kann Termine erstellen
- [ ] Kalender-View funktioniert
- [ ] Termine werden korrekt gespeichert
- [ ] Schüler-Zuweisung funktioniert

#### **Test 4.2: Customer Booking**
- [ ] Customer kann verfügbare Termine sehen
- [ ] Buchungsprozess funktioniert
- [ ] Bestätigungen werden gesendet
- [ ] Termine erscheinen in beiden Kalendern

#### **Test 4.3: Availability Management**
- [ ] Staff kann Verfügbarkeiten setzen
- [ ] Blocked Times funktionieren
- [ ] Overlapping-Validation funktioniert

---

### **Phase 5: Payment Integration**

#### **Test 5.1: Wallee Integration**

**API-Tests:**
```bash
# 1. Credentials-Test
curl http://localhost:3000/api/wallee/simple-test

# 2. Permissions-Test  
curl http://localhost:3000/api/wallee/check-permissions

# 3. Test-Transaction erstellen
curl -X POST http://localhost:3000/api/wallee/create-transaction-test
```

**UI-Tests:**
- [ ] Payment-Form lädt korrekt
- [ ] Test-Kreditkarten funktionieren
- [ ] Payment-Redirect funktioniert
- [ ] Status-Updates kommen an

#### **Test 5.2: Payment Flow End-to-End**
- [ ] Customer bucht kostenpflichtigen Termin
- [ ] Payment-Page öffnet sich
- [ ] Zahlung wird verarbeitet
- [ ] Termin wird bestätigt
- [ ] Rechnung wird erstellt

---

### **Phase 6: File Upload System**

#### **Test 6.1: Supabase Storage**
- [ ] Storage Bucket erreichbar
- [ ] Upload-Permissions korrekt
- [ ] File-Größen-Limits funktionieren

#### **Test 6.2: Document Uploads**
- [ ] Führerschein-Upload (Schüler-Registration)
- [ ] Profilbilder
- [ ] Kursmaterialien
- [ ] Verschiedene Dateiformate

---

### **Phase 7: Invoice & Accounto Integration**

#### **Test 7.1: Accounto Connection**
```bash
# API-Verbindung testen
curl http://localhost:3000/api/accounto/test-connection

# Environment Variables prüfen
curl http://localhost:3000/api/accounto/debug-env
```

#### **Test 7.2: Invoice Generation**
- [ ] Rechnung wird nach Zahlung erstellt
- [ ] PDF-Download funktioniert
- [ ] Accounto erhält Rechnung
- [ ] Kunden-Daten werden korrekt übertragen

---

### **Phase 8: Course Management**

#### **Test 8.1: Course Creation**
- [ ] Admin kann Kurse erstellen
- [ ] Kurskategorien funktionieren
- [ ] Preise werden korrekt gesetzt

#### **Test 8.2: Course Enrollment**
- [ ] Schüler können sich einschreiben
- [ ] Wartelisten funktionieren
- [ ] Session-Management funktioniert

---

## 🚀 3. Testing Commands & Scripts

### **Automated Tests (falls vorhanden)**
```bash
# Unit Tests (falls konfiguriert)
npm run test

# E2E Tests (falls konfiguriert)  
npm run test:e2e

# Linting
npm run lint

# Build Test
npm run build
```

### **API Testing mit curl**
```bash
# Health Check
curl http://localhost:3000/api/debug/auth-test

# Tenant by Slug
curl http://localhost:3000/api/tenants/by-slug?slug=test-fahrschule

# Features Check
curl http://localhost:3000/api/features/list
```

---

## 📊 4. Test Data Setup

### **SQL Scripts für Test-Daten:**
```sql
-- Test-Tenant erstellen
INSERT INTO tenants (
  id, name, slug, contact_email, 
  primary_color, secondary_color,
  is_active, is_trial
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Test Fahrschule', 
  'test-fahrschule',
  'test@example.com',
  '#3B82F6',
  '#10B981', 
  true,
  true
);

-- Test-Admin User erstellen
INSERT INTO users (
  id, tenant_id, email, role, 
  first_name, last_name, is_active
) VALUES (
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'admin@test-fahrschule.com',
  'admin',
  'Test',
  'Admin',
  true
);
```

---

## 📋 5. Test Checklist & Report Template

### **Kritische Tests (Must Pass):**
- [ ] App startet ohne Fehler
- [ ] Supabase-Verbindung funktioniert
- [ ] Tenant-Registration funktioniert
- [ ] Login für alle Rollen funktioniert
- [ ] File-Upload funktioniert
- [ ] Payment-API erreichbar (Test-Mode)
- [ ] Accounto-API erreichbar (Test-Mode)

### **Wichtige Tests (Should Pass):**
- [ ] Buchungssystem funktioniert
- [ ] Kalender-Integration funktioniert
- [ ] Rechnungserstellung funktioniert
- [ ] E-Mail-Versand funktioniert
- [ ] Mobile-Responsiveness OK
- [ ] Performance unter 3s Loading

### **Nice-to-Have Tests (Could Pass):**
- [ ] Alle Edge-Cases abgedeckt
- [ ] Perfect Mobile Experience
- [ ] All Payment-Methods funktionieren
- [ ] Advanced Features (Courses, Analytics)

---

## 🐛 6. Bug Tracking Template

```markdown
## Bug Report: [Titel]

**Severity:** Critical/High/Medium/Low
**Component:** Auth/Tenant/Payment/etc.
**Steps to Reproduce:**
1. Step 1
2. Step 2
3. Step 3

**Expected Behavior:** [was sollte passieren]
**Actual Behavior:** [was passiert tatsächlich]
**Console Errors:** [falls vorhanden]
**Screenshot:** [falls relevant]
**Environment:** Local Dev/Browser/Device
**Fix Priority:** [vor Deployment/nach Deployment]
```

---

## ⚡ 7. Performance Benchmarks

### **Loading Times (Target):**
- Initial Load: < 3 Sekunden
- Login: < 2 Sekunden  
- Page Navigation: < 1 Sekunde
- API Calls: < 500ms
- File Uploads: < 5 Sekunden (1MB)

### **Tools:**
```bash
# Lighthouse (Performance Score)
npm install -g lighthouse
lighthouse http://localhost:3000 --view

# Bundle Analyzer (falls konfiguriert)
npm run analyze
```

---

## 🎯 Testing Timeline

### **Tag 1: Setup & Grundfunktionen**
- Environment Setup
- App Start & DB Connection
- Basic Navigation
- Admin Access

### **Tag 2: Tenant & User Management** 
- Tenant Registration
- User Creation (alle Rollen)
- Login-Flows
- Basic CRUD Operations

### **Tag 3: Core Business Logic**
- Booking System
- Calendar Integration
- Payment Integration (Test-Mode)
- File Uploads

### **Tag 4: Advanced Features**
- Invoice Generation
- Course Management
- Performance Testing
- Bug Fixes

### **Tag 5: Final Review**
- End-to-End Tests
- Documentation Update
- Deployment Preparation

---

**🚀 Nach erfolgreichem Testing sind wir bereit für Vercel Deployment!**