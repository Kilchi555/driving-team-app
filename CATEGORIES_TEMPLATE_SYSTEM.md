# Categories Template System

## Übersicht

Das Categories Template System ermöglicht es, Standard-Kategorien als Templates zu definieren, die dann für neue Tenants automatisch kopiert werden können.

## Funktionsweise

### 1. Standard-Templates (tenant_id = NULL)
- Categories mit `tenant_id = NULL` sind Standard-Templates
- Diese enthalten die grundlegenden Fahrkategorien (B, A, BE, etc.)
- Werden als Vorlage für neue Tenants verwendet

### 2. Tenant-spezifische Categories (tenant_id = UUID)
- Categories mit einer spezifischen `tenant_id` gehören zu einem bestimmten Tenant
- Können individuell angepasst werden
- Überschreiben die Standard-Templates für diesen Tenant

## SQL-Dateien

### `create_standard_categories_templates.sql`
- Erstellt Standard-Templates aus bestehenden Categories
- Kopiert alle tenant-spezifischen Categories als Templates (ohne tenant_id)
- Fügt wichtige Standard-Kategorien hinzu, falls noch keine existieren

**Ausführen in Supabase:**
```sql
-- Führen Sie diese Datei in Supabase aus, um Standard-Templates zu erstellen
```

### `copy_standard_categories_to_tenant.sql`
- Kopiert Standard-Templates für einen neuen Tenant
- Ersetzen Sie `TENANT_ID_HIER` mit der tatsächlichen Tenant-ID

**Verwendung:**
```sql
-- 1. Ersetzen Sie TENANT_ID_HIER mit der tatsächlichen Tenant-ID
-- 2. Führen Sie das Script in Supabase aus
```

## API-Endpunkt

### `POST /api/tenants/copy-default-categories`
Kopiert Standard-Kategorien für einen Tenant.

**Request:**
```json
{
  "tenant_id": "uuid-des-tenants"
}
```

**Response:**
```json
{
  "success": true,
  "tenant": {
    "id": "uuid",
    "name": "Tenant Name"
  },
  "categories_copied": 9,
  "categories": [...]
}
```

## Vue-Komponente

### `CopyDefaultCategoriesModal.vue`
Eine Modal-Komponente, um Standard-Kategorien über die UI zu kopieren.

**Verwendung:**
```vue
<CopyDefaultCategoriesModal
  :is-open="showCopyModal"
  :tenant-id="selectedTenant.id"
  :tenant-name="selectedTenant.name"
  @close="showCopyModal = false"
  @success="onCategoriesCopied"
/>
```

## Standard-Kategorien

Die folgenden Standard-Kategorien werden automatisch erstellt:

| Code | Name | Beschreibung | Farben | Lektionen |
|------|------|--------------|--------|-----------|
| B | Personenwagen | Führerschein für Personenwagen bis 3.5t | Blau | 45, 60, 90, 120, 180 |
| A | Motorrad | Führerschein für Motorräder | Rot | 45, 60, 90 |
| BE | Personenwagen mit Anhänger | Führerschein für Personenwagen mit Anhänger | Grün | 45, 60, 90, 120, 180 |
| BPT | Beruflicher Personentransport | Führerschein für Taxi, Mietwagen, etc. | Orange | 45, 60, 90, 120, 180 |
| C1D1 | Lastwagen bis 7.5t | Führerschein für Lastwagen bis 7.5t | Lila | 45, 60, 90, 120, 180, 240 |
| C | Lastwagen | Führerschein für Lastwagen über 7.5t | Pink | 45, 60, 90, 120, 180, 240 |
| CE | Lastwagen mit Anhänger | Führerschein für Lastwagen mit Anhänger | Cyan | 45, 60, 90, 120, 180, 240 |
| D | Bus | Führerschein für Busse | Lime | 45, 60, 90, 120, 180, 240, 300 |
| Motorboot | Motorboot | Führerschein für Motorboote | Orange | 45, 60, 90, 120, 180 |

## Workflow für neue Tenants

1. **Tenant erstellen** - Neuer Tenant wird in der Datenbank angelegt
2. **Standard-Kategorien kopieren** - Verwenden Sie eine der folgenden Methoden:
   - SQL-Script: `copy_standard_categories_to_tenant.sql`
   - API-Aufruf: `POST /api/tenants/copy-default-categories`
   - UI-Komponente: `CopyDefaultCategoriesModal.vue`
3. **Anpassungen** - Tenant kann die kopierten Kategorien individuell anpassen

## Datenbankstruktur

```sql
CREATE TABLE categories (
  id bigint PRIMARY KEY,
  created_at timestamp with time zone DEFAULT now(),
  name text,
  description text,
  code character varying NOT NULL,
  color character varying DEFAULT '',
  is_active boolean DEFAULT true,
  exam_duration_minutes integer DEFAULT 180,
  lesson_duration_minutes integer[] DEFAULT '{45}',
  theory_durations integer DEFAULT 45,
  tenant_id uuid NULL,  -- NULL = Standard-Template, UUID = Tenant-spezifisch
  CONSTRAINT categories_code_key UNIQUE (code),
  CONSTRAINT categories_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE
);
```

## Vorteile

- **Konsistenz**: Alle Tenants starten mit den gleichen Standard-Kategorien
- **Flexibilität**: Jeder Tenant kann seine Kategorien individuell anpassen
- **Wartbarkeit**: Standard-Kategorien werden zentral verwaltet
- **Effizienz**: Automatische Kopierung statt manueller Eingabe
