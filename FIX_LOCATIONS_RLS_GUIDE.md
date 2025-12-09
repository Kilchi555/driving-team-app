# RLS Policy Fix für Locations Table

## Problem
Clients (Studenten/Schüler) konnten keine Pickup-Locations erstellen, da die RLS-Policy nur Admins und Staff erlaubte, in die `locations` Tabelle zu schreiben.

## Fehler
```
Code: 42501
Message: "new row violates row-level security policy for table 'locations'"
```

## Lösung
Die neue RLS-Policy erlaubt jetzt:

1. **SELECT** - Alle Benutzer können Locations ihres Tenants sehen
2. **INSERT** - 
   - Admins/Staff: können alle Location-Typen erstellen (standard, exam, classroom, staff)
   - Clients: können Pickup-Locations für sich selbst erstellen
3. **UPDATE** - 
   - Admins/Staff: können alle Locations aktualisieren
   - Clients: können ihre eigenen Pickup-Locations aktualisieren
4. **DELETE** - 
   - Admins/Staff: können alle Locations löschen
   - Clients: können ihre eigenen Pickup-Locations löschen

## Implementation Steps

### 1. Führe das SQL-Script in Supabase aus

Gehe zu:
```
Supabase Dashboard → Datenbank → SQL Editor
```

Kopiere den Inhalt von `fix_locations_rls_for_clients.sql` und führe das Script aus.

### 2. Verifiziere die Policies

Nach Ausführung solltest du 4 neue Policies sehen:
- `locations_select_policy`
- `locations_insert_policy`
- `locations_update_policy`
- `locations_delete_policy`

### 3. Teste die Funktionalität

1. Melde dich als Student/Client an
2. Versuche eine neue Adresse beim Standort zu speichern
3. Es sollte jetzt funktionieren!

## Zugriff auf die SQL-Datei

Die SQL-Datei befindet sich hier:
```
/Users/pascalkilchenmann/driving-team-app/fix_locations_rls_for_clients.sql
```

Du kannst sie auch direkt in Supabase SQL Editor kopieren oder über das Supabase CLI ausführen:
```bash
supabase db execute < fix_locations_rls_for_clients.sql
```

## Wichtige Notizen

- Die neuen Policies bewahren die Tenant-Isolation - Clients können nur Locations ihres eigenen Tenants erstellen
- Pickup-Locations sind automatisch mit `user_id` verbunden, daher können Clients nur ihre eigenen bearbeiten
- Admins/Staff haben weiterhin vollständigen Zugriff auf alle Locations

