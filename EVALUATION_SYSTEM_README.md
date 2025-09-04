# Flexibles Bewertungssystem - Admin Guide

## Übersicht

Das neue Bewertungssystem ist **vollständig admin-konfigurierbar** und verwendet eine **vereinfachte Datenbankstruktur** mit nur **3 Tabellen** statt der vorherigen komplexen Struktur.

## 🗄️ Datenbankstruktur

### 1. `evaluation_categories` - Bewertungskategorien
```sql
- id: UUID (Primary Key)
- name: VARCHAR(255) - "Vorschulung", "Grundschulung", "Manöver"
- description: TEXT - Beschreibung der Kategorie
- color: VARCHAR(7) - Hex-Farbe für UI (#3B82F6)
- display_order: INTEGER - Reihenfolge der Anzeige (1, 2, 3...)
- driving_categories: TEXT[] - Array: ['A'], ['B'], ['A', 'B']
- is_active: BOOLEAN - Kategorie aktiv/inaktiv
```

### 2. `evaluation_criteria` - Bewertungskriterien
```sql
- id: UUID (Primary Key)
- category_id: UUID (Foreign Key zu evaluation_categories)
- name: VARCHAR(255) - "Blicksystematik", "Rückwärtsparkieren"
- description: TEXT - Beschreibung des Kriteriums
- display_order: INTEGER - Reihenfolge innerhalb der Kategorie
- is_required: BOOLEAN - Pflichtkriterium ja/nein
- is_active: BOOLEAN - Kriterium aktiv/inaktiv
```

### 3. `evaluation_scale` - Bewertungsskala
```sql
- id: UUID (Primary Key)
- rating: INTEGER - 1, 2, 3, 4, 5, 6
- label: VARCHAR(100) - "Besprochen", "Geübt", "Ungenügend"
- description: TEXT - Beschreibung der Bewertung
- color: VARCHAR(7) - Hex-Farbe für UI
- is_active: BOOLEAN - Bewertung aktiv/inaktiv
```

## 🚀 Installation

### 1. Datenbank-Migration ausführen
```bash
# Führe die Migration in Supabase aus
# Datei: database_migration_evaluation_system.sql
```

### 2. Admin-Interface aufrufen
```
/admin/evaluation-system
```

## 📋 Admin-Funktionen

### Kategorien verwalten
- ✅ **Kategorien erstellen** (Vorschulung, Grundschulung, etc.)
- ✅ **Farben zuweisen** (für UI-Darstellung)
- ✅ **Fahrkategorien zuordnen** (A, B, oder beide)
- ✅ **Reihenfolge festlegen** (display_order)

### Kriterien verwalten
- ✅ **Kriterien erstellen** (Blicksystematik, Rückwärtsparkieren, etc.)
- ✅ **Kategorien zuordnen** (welche Kategorie gehört zu welchem Kriterium)
- ✅ **Pflichtkriterien markieren** (muss bewertet werden)
- ✅ **Reihenfolge festlegen** (innerhalb der Kategorie)

### Bewertungsskala anpassen
- ✅ **Bewertungen ändern** (1-6, "Besprochen" bis "Prüfungsreif")
- ✅ **Farben anpassen** (für UI-Darstellung)
- ✅ **Beschreibungen hinzufügen**

## 🎯 Vorteile der neuen Struktur

### Vorher (kompliziert):
- ❌ **3 Tabellen** mit komplexen Joins
- ❌ **2 verschiedene `display_order`** Felder
- ❌ **Schwierig zu verstehen** und zu warten
- ❌ **Viel Code** für einfache Operationen

### Jetzt (einfach):
- ✅ **3 Tabellen** mit klaren Beziehungen
- ✅ **1 `display_order`** pro Tabelle
- ✅ **Einfach zu verstehen** und zu warten
- ✅ **Weniger Code** für bessere Performance

## 🔧 Technische Details

### View für einfache Abfragen
```sql
CREATE VIEW v_evaluation_matrix AS
SELECT 
  ec.id as category_id,
  ec.name as category_name,
  ec.color as category_color,
  ec.display_order as category_order,
  ec.driving_categories,
  cr.id as criteria_id,
  cr.name as criteria_name,
  cr.description as criteria_description,
  cr.display_order as criteria_order,
  cr.is_required,
  cr.is_active
FROM evaluation_categories ec
JOIN evaluation_criteria cr ON cr.category_id = ec.id
WHERE ec.is_active = true AND cr.is_active = true
ORDER BY ec.display_order, cr.display_order;
```

### Beispiel-Abfrage für Kategorie A
```sql
SELECT * FROM v_evaluation_matrix 
WHERE 'A' = ANY(driving_categories)
ORDER BY category_order, criteria_order;
```

## 📱 Verwendung in der App

### 1. Kriterien laden
```typescript
const { data: criteria } = await supabase
  .from('v_evaluation_matrix')
  .select('*')
  .contains('driving_categories', ['A'])
  .order('category_order, criteria_order')
```

### 2. Bewertungsskala laden
```typescript
const { data: scale } = await supabase
  .from('evaluation_scale')
  .select('*')
  .order('rating')
```

### 3. Bewertungen speichern
```typescript
const notesToInsert = selectedCriteria.map(criteriaId => ({
  appointment_id: appointment.id,
  evaluation_criteria_id: criteriaId,
  criteria_rating: rating,
  criteria_note: note
}))

await supabase
  .from('notes')
  .upsert(notesToInsert, { onConflict: 'appointment_id,evaluation_criteria_id' })
```

## 🎨 UI-Features

### Gruppierte Anzeige
- **Kategorien als Überschriften** (farbig hervorgehoben)
- **Kriterien gruppiert** nach Kategorien
- **Suchfunktion** über alle Kriterien
- **Drag & Drop** für Reihenfolge (optional)

### Bewertungsinterface
- **Farbige Bewertungsbuttons** (1-6)
- **Dynamische Farben** aus der Datenbank
- **Notizen pro Kriterium**
- **Pflichtkriterien-Markierung**

## 🔄 Migration von der alten Struktur

### Automatische Migration
Die `database_migration_evaluation_system.sql` enthält:
- ✅ **Neue Tabellen** erstellen
- ✅ **Beispieldaten** einfügen
- ✅ **View** für einfache Abfragen
- ✅ **RLS Policies** für Sicherheit

### Manuelle Anpassungen
- 🔄 **Code anpassen** für neue Struktur
- 🔄 **Admin-Interface** testen
- 🔄 **Bestehende Bewertungen** migrieren (falls nötig)

## 🛠️ Troubleshooting

### Häufige Probleme

#### 1. "Keine Kriterien gefunden"
- ✅ Prüfe `driving_categories` Array in `evaluation_categories`
- ✅ Prüfe `is_active = true` in beiden Tabellen
- ✅ Prüfe View `v_evaluation_matrix`

#### 2. "Falsche Reihenfolge"
- ✅ Prüfe `display_order` in beiden Tabellen
- ✅ Prüfe View-Sortierung

#### 3. "Farben werden nicht angezeigt"
- ✅ Prüfe Hex-Format (#RRGGBB)
- ✅ Prüfe CSS-Klassen in der UI

## 📞 Support

Bei Fragen oder Problemen:
1. **Admin-Interface** testen unter `/admin/evaluation-system`
2. **Datenbank-Logs** in Supabase prüfen
3. **Browser-Console** für JavaScript-Fehler

---

**Das neue System ist viel einfacher zu verstehen und zu warten! 🎉**
