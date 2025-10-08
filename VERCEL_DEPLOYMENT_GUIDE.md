# 🚀 Vercel Deployment Guide - Driving Team App

## 📋 Übersicht

Diese Anleitung beschreibt alle Voraussetzungen und Schritte für das Deployment der Multi-Tenant Fahrschul-App auf Vercel.

### ✅ Was die App bietet:
- **Multi-Tenant System**: Jede Fahrschule hat eine eigene Subdomain/URL (z.B. `yourapp.vercel.app/login/musterfahrschule`)
- **Terminbuchung & Kalender**: Vollständiges Buchungssystem für Fahrstunden
- **Schülerverwaltung**: Registrierung, Profile, Dokumentenverwaltung
- **Zahlungssystem**: Integration mit Wallee und Stripe
- **Rechnungserstellung**: Automatische Rechnungen über Accounto
- **Kursmanagement**: Theorie- und Praxiskurse

---

## 🔧 1. Erforderliche Environment Variables

### 🗄️ **Supabase (Datenbank & Storage)**
```bash
# Erforderlich - Cloud Supabase
SUPABASE_URL=https://unyjaetebnaexaflpyoc.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 💳 **Wallee (Hauptzahlungsanbieter)**
```bash
# Erforderlich für Zahlungen
WALLEE_SPACE_ID=123456
WALLEE_APPLICATION_USER_ID=789012
WALLEE_SECRET_KEY=your_wallee_secret_key
WALLEE_USER_ID=345678  # Für Public API
```

### 💰 **Stripe (Alternative Zahlungen)**
```bash
# Optional - Falls Stripe als Backup gewünscht
STRIPE_SECRET_KEY=sk_test_... oder sk_live_...
STRIPE_PUBLIC_KEY=pk_test_... oder pk_live_...
```

### 🧾 **Accounto (Rechnungserstellung)**
```bash
# Erforderlich für automatische Rechnungen
ACCOUNTO_API_KEY=your_accounto_api_key
ACCOUNTO_BASE_URL=https://api.accounto.ch
```

### 🗺️ **Google Maps (Standorte & Navigation)**
```bash
# Erforderlich für Standortverwaltung
VITE_GOOGLE_MAPS_API_KEY=AIzaSy...
```

---

## 🚀 2. Vercel Deployment Setup

### **Schritt 1: Repository vorbereiten**
```bash
# 1. Repository klonen
git clone <repository-url>
cd driving-team-app

# 2. Dependencies installieren
npm install

# 3. Build testen (lokal)
npm run build
```

### **Schritt 2: Vercel Projekt erstellen**
```bash
# Option A: Via Vercel CLI
npm i -g vercel
vercel

# Option B: Via Vercel Dashboard
# 1. Gehe zu https://vercel.com/dashboard
# 2. "New Project" klicken
# 3. Repository auswählen
# 4. Framework: "Nuxt.js" auswählen
```

### **Schritt 3: Environment Variables in Vercel setzen**

**Via Vercel Dashboard:**
1. Projekt auswählen → Settings → Environment Variables
2. Alle oben genannten Variables hinzufügen
3. Für **Production**, **Preview** und **Development** setzen

**Via CLI:**
```bash
# Alle Environment Variables setzen
vercel env add SUPABASE_URL
vercel env add SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add WALLEE_SPACE_ID
vercel env add WALLEE_APPLICATION_USER_ID
vercel env add WALLEE_SECRET_KEY
vercel env add WALLEE_USER_ID
vercel env add ACCOUNTO_API_KEY
vercel env add ACCOUNTO_BASE_URL
vercel env add VITE_GOOGLE_MAPS_API_KEY
```

### **Schritt 4: Build Configuration**

`vercel.json` erstellen (falls nicht vorhanden):
```json
{
  "builds": [
    {
      "src": "nuxt.config.ts",
      "use": "@nuxtjs/vercel-builder"
    }
  ],
  "routes": [
    {
      "src": "/login/(.*)",
      "dest": "/login/[tenant]"
    },
    {
      "src": "/(.*)",
      "dest": "/"
    }
  ]
}
```

---

## 🌐 3. Domain & Multi-Tenant Setup

### **URL-Struktur:**
- **Hauptseite**: `yourapp.vercel.app` (Firmenauswahl)
- **Tenant-Login**: `yourapp.vercel.app/login/[tenant-slug]`
- **Tenant-Dashboard**: Nach Login automatische Weiterleitung

### **Custom Domain (Optional):**
```bash
# Beispiel: simy.ch
# 1. Domain in Vercel hinzufügen
vercel domains add simy.ch

# 2. DNS Records setzen:
# A Record: @ → 76.76.19.61
# CNAME: www → cname.vercel-dns.com
```

### **Tenant-URLs Beispiele:**
- `simy.ch/login/musterfahrschule`
- `simy.ch/login/fahrlehrermeier`
- `simy.ch/login/driving-academy`

---

## 🗄️ 4. Supabase Database Setup

### **Bestehende Cloud-Datenbank verwenden:**
Die App ist bereits für die existierende Supabase-Instanz konfiguriert:
- **URL**: `https://unyjaetebnaexaflpyoc.supabase.co`
- **Tabellen**: Bereits erstellt und konfiguriert
- **RLS Policies**: Bereits implementiert

### **Storage Setup überprüfen:**
```sql -- In Supabase SQL Editor ausführen
-- 1. Storage Bucket für Logos prüfen
SELECT * FROM storage.buckets WHERE name = 'public';

-- 2. Storage Policies prüfen
SELECT * FROM storage.policies WHERE bucket_id = 'public';
```

### **Test-Tenant erstellen:**
```sql
-- Über die App-API:
POST /api/tenants/register
{
  "name": "Test Fahrschule",
  "slug": "test-fahrschule",
  "contact_email": "test@example.com",
  // ... weitere Felder
}
```

---

## 💳 5. Payment Provider Setup

### **Wallee Configuration (Hauptsystem):**
1. **Wallee Account**: https://app-wallee.com/
2. **Space ID**: Aus Wallee Dashboard kopieren
3. **Application User**: API → Application Users → Neuen User erstellen
4. **Permissions**: Transaction Read/Write, Payment Method Read

**Test-Transaktion:**
```bash
curl https://yourapp.vercel.app/api/wallee/check-permissions
```

### **Stripe Setup (Optional):**
1. **Stripe Dashboard**: https://dashboard.stripe.com/
2. **API Keys**: Entwickler → API-Schlüssel
3. **Webhooks**: Falls benötigt

---

## 🧾 6. Accounto Integration Setup

### **Accounto API Setup:**
1. **Account**: https://app.accounto.ch/
2. **API Key**: Einstellungen → API → Neuen Schlüssel erstellen
3. **Permissions**: Customers: Read/Write, Invoices: Read/Write

**Test-Verbindung:**
```bash
curl https://yourapp.vercel.app/api/accounto/test-connection
```

---

## 🗺️ 7. Google Maps API Setup

### **Google Cloud Console:**
1. **Projekt erstellen**: https://console.cloud.google.com/
2. **APIs aktivieren**:
   - Maps JavaScript API
   - Places API
   - Geocoding API
3. **API Key erstellen**:
   - Credentials → API Key erstellen
   - **Einschränkungen**: Nur HTTP-Referrer (*.vercel.app/*)

---

## 🧪 8. Testing Setup für Fahrlehrer

### **Test-Umgebung erstellen:**

**1. Test-Tenant registrieren:**
```bash
# Via App UI oder API
POST https://yourapp.vercel.app/api/tenants/register
{
  "name": "Demo Fahrschule",
  "slug": "demo",
  "contact_email": "demo@yourcompany.com",
  "contact_person_first_name": "Max",
  "contact_person_last_name": "Mustermann",
  "contact_phone": "+41 78 123 45 67",
  "street": "Musterstrasse",
  "streetNr": "123",
  "zip": "8000",
  "city": "Zürich",
  "business_type": "driving_school",
  "primary_color": "#3B82F6",
  "secondary_color": "#10B981"
}
```

**2. Test-User erstellen:**
```bash
# Fahrlehrer-Account
POST https://yourapp.vercel.app/api/admin/create-user
{
  "email": "fahrlehrer@demo.com",
  "role": "staff",
  "tenant_id": "demo-tenant-id",
  "first_name": "Test",
  "last_name": "Fahrlehrer"
}

# Schüler-Account
# Via Registration UI: yourapp.vercel.app/register?tenant=demo
```

**3. Demo-Daten anlegen:**
- Kategorien (A1, B, C, etc.)
- Preise und Pakete
- Verfügbarkeiten
- Test-Termine

### **Zugangsdaten für Fahrlehrer:**
```
URL: https://yourapp.vercel.app/login/demo
E-Mail: fahrlehrer@demo.com
Passwort: [beim User-Setup gesetzt]

Features zum Testen:
✅ Kalenderverwaltung
✅ Schülerregistrierung
✅ Terminbuchungen
✅ Zahlungsabwicklung
✅ Rechnungserstellung
✅ Kursverwaltung
```

---

## 🔍 9. Deployment-Checkliste

### **Pre-Deployment:**
- [ ] Alle Environment Variables gesetzt
- [ ] Supabase Database erreichbar
- [ ] Storage Bucket konfiguriert
- [ ] Wallee API-Zugang getestet
- [ ] Accounto API-Zugang getestet
- [ ] Google Maps API aktiviert
- [ ] lokaler Build erfolgreich (`npm run build`)

### **Post-Deployment:**
- [ ] App lädt ohne Fehler
- [ ] Login mit Test-Tenant funktioniert
- [ ] Tenant-Registration funktioniert
- [ ] File-Upload (Logo) funktioniert
- [ ] Payment-Flow funktioniert
- [ ] Rechnung wird erstellt
- [ ] E-Mail-Versand funktioniert (falls konfiguriert)

### **Performance-Check:**
```bash
# Lighthouse-Score prüfen
npm install -g lighthouse
lighthouse https://yourapp.vercel.app --view

# Core Web Vitals
# Target: LCP < 2.5s, FID < 100ms, CLS < 0.1
```

---

## 🐛 10. Troubleshooting

### **Häufige Probleme:**

**1. Build Fehler:**
```bash
# TypeScript Fehler ignorieren (temporär)
# In nuxt.config.ts:
typescript: {
  typeCheck: false
}
```

**2. Environment Variables nicht verfügbar:**
```bash
# Vercel Dashboard → Settings → Environment Variables
# Sicherstellen: Production, Preview, Development alle gesetzt
# Neu-Deployment triggern
```

**3. Supabase RLS Policies:**
```sql
-- 406 Not Acceptable Fehler
-- RLS Policies für authenticated users prüfen:
SELECT * FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('appointments', 'users', 'tenants');
```

**4. Multi-Tenant Routing:**
```javascript
// middleware/auth.ts prüfen
// Tenant-Context korrekt geladen?
console.log('Current tenant:', currentTenant.value)
```

**5. Payment Integration:**
```bash
# Wallee Test-Modus verwenden:
WALLEE_SPACE_ID=test_space_id
# Live-Keys erst nach erfolgreichem Test
```

---

## 📞 11. Support & Wartung

### **Logs & Monitoring:**
```bash
# Vercel Function Logs
vercel logs

# Supabase Logs
# Dashboard → Logs → API/Auth/Realtime
```

### **Updates:**
```bash
# Dependencies aktualisieren
npm update

# Sicherheitsupdates
npm audit fix

# Deployment
git push origin main  # Auto-Deploy via Vercel
```

### **Backup Strategy:**
- **Database**: Supabase automatische Backups
- **Files**: Supabase Storage Redundancy
- **Code**: Git Repository + Vercel History

---

## 🎯 12. Go-Live Checkliste

### **Vor dem Live-Gang:**
- [ ] **Domain-Setup**: Custom Domain konfiguriert
- [ ] **SSL**: HTTPS funktioniert
- [ ] **Environment**: Production-Keys gesetzt
- [ ] **Performance**: Loading < 3 Sekunden
- [ ] **Mobile**: Responsive Design getestet
- [ ] **Security**: CORS & Headers konfiguriert
- [ ] **Analytics**: Tracking implementiert (falls gewünscht)
- [ ] **Legal**: Datenschutz & Impressum verlinkt

### **Nach dem Go-Live:**
- [ ] **Monitoring**: Error-Tracking aktiviert
- [ ] **Backups**: Regelmäßige Backups verifiziert
- [ ] **Updates**: Update-Prozess dokumentiert
- [ ] **Support**: Help-Desk oder Dokumentation bereitgestellt
- [ ] **Training**: Fahrlehrer geschult

---

## 📧 Kontakt

Bei Fragen zum Deployment:
- **Repository Issues**: GitHub Issues erstellen
- **Vercel Support**: https://vercel.com/support
- **Supabase Support**: https://supabase.com/support

---

**🎉 Viel Erfolg mit dem Deployment!**

Die App ist darauf ausgelegt, mehrere Fahrschulen gleichzeitig zu bedienen. Jede Fahrschule erhält ihre eigene URL und kann unabhängig arbeiten, während alle die gleiche technische Infrastruktur nutzen.