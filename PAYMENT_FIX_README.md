# Payment System Fix - Driving Team App

## Problem
Beim Speichern eines Termins wurde kein Eintrag in der `payments` Tabelle erstellt.

## Lösung
1. **EventModal.vue wurde aktualisiert**: Nach dem Erstellen eines neuen Termins wird automatisch ein Payment-Eintrag mit Status "pending" erstellt.

2. **Supabase Types wurden erweitert**: Die `payments` Tabelle wurde zu den TypeScript-Definitionen hinzugefügt.

3. **SQL-Script erstellt**: `create_payments_table.sql` enthält die Tabellendefinition und RLS-Policies.

## Implementierung

### 1. Datenbank-Tabelle erstellen
Führe das SQL-Script in deiner Supabase-Datenbank aus:
```bash
# Entweder über die Supabase UI im SQL Editor
# oder über die Kommandozeile
```

### 2. Code-Änderungen
Die folgenden Dateien wurden geändert:
- `/components/EventModal.vue` - Automatische Payment-Erstellung beim Speichern
- `/types/supabase.ts` - TypeScript-Definitionen für die payments Tabelle

### 3. Funktionsweise
- Beim Erstellen eines neuen Termins wird automatisch ein Payment-Eintrag erstellt
- Der Payment hat initial den Status "pending" und payment_method "pending"
- Die Preise werden basierend auf Dauer und Preis pro Minute berechnet
- Eine Admin-Gebühr von 10% wird hinzugefügt (kann angepasst werden)
- Alle Beträge werden in Rappen gespeichert (CHF * 100)

### 4. Nächste Schritte
- [ ] Admin-Gebühr aus den Settings laden statt hardcoded 10%
- [ ] Discount-Berechnung in den Payment-Betrag einbeziehen
- [ ] UI für Payment-Übersicht erstellen
- [ ] Payment-Status-Updates implementieren

## Testing
1. Erstelle einen neuen Termin
2. Prüfe in der Supabase-Datenbank, ob ein Payment-Eintrag erstellt wurde
3. Verifiziere die korrekten Beträge und Metadaten