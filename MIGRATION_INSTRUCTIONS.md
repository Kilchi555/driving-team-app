# Migration Instructions: Swiss Exam Locations

## Schritt 1: Spalten zur locations Tabelle hinzufügen

Führen Sie zuerst diese Migration aus, um die notwendigen Spalten hinzuzufügen:

```sql
-- Führen Sie add_location_columns.sql aus
```

Diese Migration fügt folgende Spalten hinzu:
- `city` (VARCHAR(100))
- `canton` (VARCHAR(10)) 
- `postal_code` (VARCHAR(10))
- `updated_at` (TIMESTAMP WITH TIME ZONE)

## Schritt 2: Schweizer Prüfungsstandorte hinzufügen

Nach der ersten Migration führen Sie diese aus:

```sql
-- Führen Sie add_swiss_exam_locations.sql aus
```

Diese Migration fügt alle wichtigen Schweizer Prüfungsstandorte hinzu.

## Schritt 3: Testen

1. Öffnen Sie die Staff Settings
2. Klicken Sie auf "Prüfungsstandorte"
3. Testen Sie die neue Suchfunktion
4. Fügen Sie Standorte hinzu und entfernen Sie sie

## Was wurde implementiert:

### Neue Komponente: ExamLocationSearchDropdown.vue
- Intelligente Suche nach Prüfungsstandorten
- Echtzeit-Filterung
- Keyboard-Navigation
- Ein-Klick-Hinzufügen/Entfernen

### Aktualisierte StaffSettings.vue
- Integration der neuen Dropdown-Komponente
- Verbesserte UX
- Anzeige der ausgewählten Standorte

### Datenbank-Migrationen
- `add_location_columns.sql`: Fügt fehlende Spalten hinzu
- `add_swiss_exam_locations.sql`: Fügt alle Schweizer Prüfungsstandorte hinzu

## Hinweise:

- Die Adresse enthält jetzt alle Informationen (Strasse, PLZ, Stadt)
- Die Suche funktioniert über Name und Adresse
- Alle Standorte sind tenant-spezifisch gefiltert
- Die Komponente ist vollständig responsiv

## Bei Problemen:

1. Überprüfen Sie, ob beide SQL-Migrationen erfolgreich ausgeführt wurden
2. Prüfen Sie die Browser-Konsole auf Fehler
3. Stellen Sie sicher, dass der Benutzer die richtige tenant_id hat
