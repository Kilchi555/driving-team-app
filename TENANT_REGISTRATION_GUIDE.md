# Tenant-Registrierungssystem

## Übersicht
Komplettes System zur Registrierung neuer Fahrschulen (Tenants) mit mehrstufigem Prozess, Logo-Upload und automatischer Konfiguration.

## Komponenten

### 1. Landing Page (`/tenant-start`)
- **Marketing-Seite** für neue Fahrschulen
- **Feature-Übersicht** und Pricing
- **Demo-Links** zu bestehenden Tenants
- **Call-to-Action** zur Registrierung

### 2. Registrierungsformular (`/tenant-register`)
**Mehrstufiger Prozess:**

#### Schritt 1: Grunddaten
- Fahrschul-Name
- URL-Kennung (Slug)
- Kontakt-E-Mail
- Telefonnummer
- Adresse
- Lizenz-Nummer (optional)
- Geschäftstyp

#### Schritt 2: Branding
- Logo-Upload (optional, max. 2MB)
- Hauptfarbe (Primary Color)
- Zweitfarbe (Secondary Color)
- Live-Vorschau der Farben

#### Schritt 3: Bestätigung
- Zusammenfassung aller Daten
- AGB-Akzeptierung
- Endgültige Registrierung

### 3. Server-API (`/api/tenants/register`)
- **Multipart-Form-Data** Verarbeitung
- **Logo-Upload** zu Supabase Storage
- **Datenvalidierung** und Duplikats-Prüfung
- **Tenant-Erstellung** in Datenbank
- **Standard-Daten** kopieren (Kategorien, etc.)

## Features

### ✅ Validierungen
- **Slug-Eindeutigkeit**: Keine doppelten URL-Kennungen
- **E-Mail-Eindeutigkeit**: Keine doppelten Kontakt-E-Mails
- **Format-Prüfungen**: E-Mail, Telefon, Farben
- **Datei-Validierung**: Logo-Größe und Format

### ✅ Logo-Upload
- **Supabase Storage** Integration
- **Automatische Dateinamen** mit Timestamp
- **Fehlerbehandlung** mit Rollback
- **Format-Unterstützung**: JPG, PNG, GIF, WebP

### ✅ User Experience
- **Progress Indicator**: Zeigt aktuellen Schritt
- **Live-Vorschau**: Farben und Logo
- **Responsive Design**: Mobile-optimiert
- **Error Handling**: Benutzerfreundliche Fehlermeldungen

### ✅ Automatisierung
- **Slug-Generierung** aus Fahrschul-Name
- **Standard-Kategorien** kopieren
- **Trial-Account** automatisch aktiviert
- **Sofortige Verfügbarkeit** nach Registrierung

## URLs und Routing

### Neue Seiten
```
/tenant-start          → Landing Page für Registrierung
/tenant-register       → Mehrstufiges Registrierungsformular
```

### API Endpoints
```
POST /api/tenants/register → Tenant-Erstellung mit Logo-Upload
```

### Nach Registrierung
```
/auswahl?tenant=ihr-slug → Direkte Weiterleitung zur neuen Fahrschul-Seite
```

## Datenbank-Schema

### Erweiterte Tenants-Tabelle
```sql
-- Bereits vorhanden in database_migration_tenants.sql
- id (UUID)
- name (VARCHAR) - Fahrschul-Name
- slug (VARCHAR) - URL-Kennung
- domain (VARCHAR) - Custom Domain (optional)
- contact_email (VARCHAR) - Kontakt-E-Mail
- contact_phone (VARCHAR) - Telefonnummer
- address (TEXT) - Adresse
- license_number (VARCHAR) - Lizenz-Nummer
- business_type (VARCHAR) - Geschäftstyp
- logo_url (TEXT) - Logo-URL
- primary_color (VARCHAR) - Hauptfarbe
- secondary_color (VARCHAR) - Zweitfarbe
- is_active (BOOLEAN) - Aktiv-Status
- is_trial (BOOLEAN) - Trial-Account
- subscription_plan (VARCHAR) - Abo-Plan
- subscription_status (VARCHAR) - Abo-Status
```

### Storage-Struktur
```
public/
  tenant-logos/
    slug-logo-timestamp.jpg
    slug-logo-timestamp.png
    ...
```

## Deployment-Schritte

### 1. Supabase Storage einrichten
```sql
-- Storage Bucket "public" muss existieren
-- RLS Policies für public read access
```

### 2. Test-Daten erstellen (optional)
```sql
-- Führe create_test_tenants.sql aus für Demo-Tenants
\i create_test_tenants.sql
```

### 3. Navigation erweitern
```vue
<!-- In bestehenden Seiten Link zur Registrierung hinzufügen -->
<NuxtLink to="/tenant-start">Neue Fahrschule registrieren</NuxtLink>
```

## Testing

### 1. Manuelle Tests
1. Besuche `/tenant-start`
2. Klicke "Jetzt kostenlos starten"
3. Durchlaufe alle 3 Schritte
4. Teste mit und ohne Logo
5. Prüfe Validierungen
6. Teste finale Weiterleitung

### 2. Demo-URLs testen
- `/auswahl?tenant=alpenblick` (Blau/Grün)
- `/auswahl?tenant=stadtfahrschule` (Rot/Orange)
- `/auswahl?tenant=modern` (Lila/Smaragd)

### 3. Edge Cases
- Doppelte Slugs
- Doppelte E-Mails
- Ungültige Logos
- Zu große Dateien
- Netzwerkfehler

## Sicherheit

### Input-Validierung
- Server-seitige Validierung aller Felder
- SQL-Injection Schutz durch Parameterisierung
- XSS-Schutz durch Input-Sanitization

### File-Upload Sicherheit
- Dateityp-Validierung
- Größen-Limits (2MB)
- Sichere Dateinamen-Generierung
- Storage-Isolation pro Tenant

### RLS Policies
- Tenants nur für berechtigte User sichtbar
- Logo-URLs öffentlich lesbar
- Schreibzugriff nur für Besitzer

## Monitoring & Analytics

### Success Metrics
- Anzahl Registrierungen pro Tag/Woche
- Conversion Rate von Landing Page
- Abbruchrate pro Registrierungsschritt
- Logo-Upload-Rate

### Error Tracking
- Registrierungs-Fehler loggen
- Logo-Upload-Probleme tracken
- Validierungs-Fehler analysieren

## Erweiterungen (Future)

### 1. E-Mail-Bestätigung
- Bestätigungs-E-Mail nach Registrierung
- Account-Aktivierung per Link

### 2. Onboarding-Wizard
- Schritt-für-Schritt Einrichtung
- Fahrlehrer hinzufügen
- Erste Termine erstellen

### 3. Subscription Management
- Upgrade von Trial zu Paid
- Billing-Integration
- Usage-Tracking

### 4. Multi-Language
- Registrierung in verschiedenen Sprachen
- Tenant-spezifische Sprache

## Support & Dokumentation

### Für Endbenutzer
- Schritt-für-Schritt Anleitung
- FAQ zu häufigen Problemen
- Video-Tutorials

### Für Entwickler
- API-Dokumentation
- Code-Kommentare
- Test-Szenarien

---

**Das Tenant-Registrierungssystem ist produktionsbereit und kann sofort eingesetzt werden! 🚀**
