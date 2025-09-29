# Supabase Storage Setup für Tenant-Logos

## Problem
Der SQL-Befehl `INSERT INTO storage.policies` funktioniert nicht, da Storage-Policies in Supabase über das Dashboard verwaltet werden.

## Lösung: Manuelle Konfiguration im Supabase Dashboard

### 1. Storage Bucket erstellen

1. **Supabase Dashboard öffnen**: https://supabase.com/dashboard
2. **Projekt auswählen**: Ihr driving-team-app Projekt
3. **Storage navigieren**: Linke Sidebar → Storage
4. **Bucket erstellen** (falls "public" nicht existiert):
   - Klick auf "Create Bucket"
   - Name: `public`
   - ✅ Public bucket (für öffentlichen Lesezugriff)
   - Klick auf "Create bucket"

### 2. Storage Policies einrichten

1. **Policies navigieren**: Storage → Settings → Policies
2. **Folgende 3 Policies erstellen**:

#### Policy 1: Public Read Access
```
Name: Public read access for logos
Operation: SELECT
Target roles: public
Policy definition: true
```

#### Policy 2: Authenticated Upload
```
Name: Authenticated users can upload
Operation: INSERT  
Target roles: authenticated
Policy definition: true
```

#### Policy 3: Authenticated Delete
```
Name: Authenticated users can delete
Operation: DELETE
Target roles: authenticated  
Policy definition: true
```

### 3. Bucket-Einstellungen (Optional)

1. **Bucket auswählen**: Klick auf "public" Bucket
2. **Settings**: 
   - File size limit: 2MB (2097152 bytes)
   - Allowed MIME types: `image/jpeg, image/jpg, image/png, image/gif, image/webp`

## Alternative: SQL-Konfiguration (falls verfügbar)

```sql
-- Nur ausführen wenn storage Schema verfügbar ist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'public', 
  'public', 
  true, 
  2097152, -- 2MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
```

## Testen

### 1. Upload-Test
1. Besuche: `http://localhost:3000/tenant-register`
2. Durchlaufe Registrierung bis Schritt 2 (Branding)
3. Lade ein Test-Logo hoch
4. Prüfe ob Upload erfolgreich ist

### 2. Storage-Verifikation
1. **Supabase Dashboard**: Storage → public
2. **Ordner prüfen**: `tenant-logos/` sollte existieren
3. **Datei prüfen**: Hochgeladenes Logo sollte sichtbar sein
4. **URL testen**: Öffentliche URL sollte das Bild anzeigen

## Troubleshooting

### Fehler: "Upload failed"
- ✅ Prüfe ob "public" Bucket existiert
- ✅ Prüfe ob Bucket auf "public" gesetzt ist
- ✅ Prüfe Storage Policies (besonders INSERT für authenticated)

### Fehler: "Logo not visible"
- ✅ Prüfe SELECT Policy für public
- ✅ Prüfe ob Bucket public ist
- ✅ Teste URL direkt im Browser

### Fehler: "Permission denied"
- ✅ Prüfe ob User authentifiziert ist
- ✅ Prüfe Storage Policies für authenticated
- ✅ Browser-Console auf Fehler prüfen

## Ordner-Struktur

Nach erfolgreicher Konfiguration:

```
Storage/
  public/
    tenant-logos/
      deine-fahrschule-logo-1234567890.jpg
      alpenblick-logo-1234567891.png
      stadtfahrschule-logo-1234567892.webp
      ...
```

## Sicherheit

### Was ist öffentlich zugänglich?
- ✅ Alle Dateien im "public" Bucket
- ✅ Logo-URLs sind öffentlich aufrufbar
- ❌ Kein direkter Zugriff auf andere Buckets

### Wer kann hochladen?
- ✅ Nur authentifizierte User
- ✅ Upload-Größe begrenzt (2MB)
- ✅ Nur erlaubte Dateiformate

### Datenschutz
- Logos sind öffentlich sichtbar (gewollt für Branding)
- Dateinamen enthalten keine persönlichen Daten
- Automatische Cleanup-Mechanismen vorhanden

---

**Nach dieser Konfiguration sollte das Logo-Upload-System vollständig funktionieren! 🚀**
