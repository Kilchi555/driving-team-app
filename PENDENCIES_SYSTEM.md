# Admin Pendenzen Management System

## Übersicht

Das Pendenzen-System ermöglicht es Admins, Aufgaben und Pendenzen zentral auf dem Admin Dashboard zu verwalten.

## Funktionalitäten

### Status
- **Pendent** - Aufgabe steht an
- **Überfällig** - Fälligkeitsdatum ist vorbei
- **In Bearbeitung** - Aktiv bearbeitet
- **Abgeschlossen** - Fertig
- **Gelöscht** - Soft Delete

### Prioritäten
- **Niedrig** - Kann warten
- **Mittel** - Normal (Default)
- **Hoch** - Wichtig
- **Kritisch** - Sofort erledigen

### Kategorien
- **System** - Systembezogene Tasks
- **Zahlung** - Payment/Billing
- **Marketing** - Marketing Tasks
- **Personal** - HR/Personal
- **Buchung** - Booking/Terminverwaltung
- **Sonstiges** - Andere

### Wiederholungen
- **Keine** - Einmalige Aufgabe (Default)
- **Täglich** - Jeden Tag wiederholen
- **Wöchentlich** - Jede Woche wiederholen
- **Monatlich** - Jeden Monat wiederholen
- **Jährlich** - Jedes Jahr wiederholen

Jede Wiederholung kann mit einem Enddatum begrenzt werden.

## Verwendung

### Dashboard
Die Pendenzen-Komponente wird oben auf `/admin` angezeigt mit:
- Statusübersicht (4 Widgets: Pendent, Überfällig, In Bearbeitung, Abgeschlossen)
- Filterung nach Status
- Quick-View der Aufgaben mit Prioritätsanzeigeauf der ganzen Breite

### Neue Pendenz erstellen
1. Klick auf "+ Neue Pendenz" Button
2. Folgende Felder ausfüllen:
   - **Titel** (erforderlich)
   - **Beschreibung** (optional)
   - **Priorität** (default: Mittel)
   - **Kategorie** (default: Sonstiges)
   - **Status** (default: Pendent)
   - **Fällig am** (erforderlich) - Datum und Zeit
   - **Wiederholung** (default: Keine)
   - **Wiederholung endet am** (optional, nur wenn Wiederholung aktiv)
   - **Notizen** (optional)
3. Speichern

### Status wechseln
- Klick auf die Pendenz
- Klick auf den "Wechseln" Button um zum nächsten Status zu gehen
- Automatische Statusübergänge: Pendent → In Bearbeitung → Abgeschlossen → Pendent

### Pendenzen bearbeiten
1. Klick auf die Pendenz um Details zu öffnen
2. Änderungen vornehmen
3. Speichern

### Pendenzen löschen
1. Pendenzen öffnen
2. Klick auf "Löschen" Button
3. Bestätigung erforderlich
- Nutzt Soft Delete (deleted_at wird gesetzt)

## Automatisierung

### Überfällig markieren
Der Cron Job `update-overdue` aktualisiert automatisch alle pendent oder in_bearbeitung Tasks, deren Fälligkeitsdatum überschritten ist:

```
GET /api/admin/pendencies/update-overdue
```

### Wiederholende Aufgaben
Nach dem Abschließen einer wiederholenden Aufgabe wird automatisch die nächste Instanz erstellt:

```
POST /api/admin/pendencies/handle-recurrence
Body: { "pendencyId": "uuid" }
```

## Datenbank

Tabelle: `pendencies`

```sql
Columns:
- id (UUID)
- tenant_id (UUID)
- title (VARCHAR 255)
- description (TEXT)
- status (VARCHAR 50)
- priority (VARCHAR 50)
- category (VARCHAR 100)
- due_date (TIMESTAMP WITH TIME ZONE)
- assigned_to (UUID)
- recurrence_type (VARCHAR 50)
- recurrence_end_date (TIMESTAMP WITH TIME ZONE)
- created_at (TIMESTAMP WITH TIME ZONE)
- created_by (UUID)
- updated_at (TIMESTAMP WITH TIME ZONE)
- completed_at (TIMESTAMP WITH TIME ZONE)
- deleted_at (TIMESTAMP WITH TIME ZONE)
- tags (JSONB)
- attachments (JSONB)
- notes (TEXT)
```

## Composable: `usePendencies()`

```typescript
const {
  // State
  pendencies,
  isLoading,
  error,
  
  // Computed
  pendentCount,
  overdueCount,
  inProgressCount,
  completedCount,
  sortedPendencies,
  
  // Methods
  loadPendencies(tenantId),
  createPendency(pendency),
  updatePendency(id, updates),
  changeStatus(id, newStatus),
  deletePendency(id),
  handleRecurrence(pendency),
  getOverduePendencies(),
  updateOverdueStatus(tenantId)
} = usePendencies()
```

## Sicherheit

- Row Level Security (RLS) enabled
- Admins können nur ihre Tenant-Pendenzen sehen/bearbeiten
- Soft Delete statt Hard Delete

## Zukünftige Erweiterungen

- Kanban-View für Status-Visualisierung
- Email-Benachrichtigungen für überfällige Tasks
- Zuordnung an spezifische Admins
- Sub-Tasks/Checklisten
- Anhänge/Dateiupload
- Activity Log für Änderungen
- Export zu CSV/PDF
- Kalender-Integration

