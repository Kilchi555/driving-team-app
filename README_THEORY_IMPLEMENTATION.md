# Theorielektion Pricing-Implementierung

## Übersicht
Diese Implementierung fügt eine neue Pricing-Regel für Theorielektionen hinzu, die immer CHF 85.- kosten, unabhängig von der Fahrkategorie.

## Schritte zur Implementierung

### 1. Datenbank-Update ausführen
Führe das SQL-Script `add_theory_pricing_rule.sql` in deiner Supabase-Datenbank aus:

```sql
-- In der Supabase SQL Editor ausführen
-- Oder über die Supabase CLI
supabase db push
```

### 2. Anwendung neu starten
Nach dem Datenbank-Update die Anwendung neu starten, damit die neuen Pricing-Regeln geladen werden.

## Was wurde implementiert?

### ✅ Neue Pricing-Regel
- **Regeltyp**: `theory`
- **Kategorie**: `THEORY`
- **Preis**: CHF 85.- (8500 Rappen)
- **Admin-Fee**: Keine
- **Dauer**: 45 Minuten (Standard)

### ✅ EventModal-Anpassungen
- Bei Auswahl von "Theorie" wird die **gewählte Fahrkategorie beibehalten** (z.B. 'B', 'A', 'BE')
- CategorySelector wird **immer angezeigt** (auch bei Theorielektionen für bessere Organisation)
- Info-Box zeigt den Standardpreis an
- Dauer wird automatisch auf 45 Minuten gesetzt
- **Preis bleibt bei CHF 85.-**, unabhängig von der gewählten Kategorie

### ✅ Pricing-Logik
- Theorielektionen verwenden immer den Standardpreis von CHF 85.-
- Keine Admin-Fees
- **Preis ist unabhängig von der gewählten Fahrkategorie**
- **Fahrkategorie wird für bessere Organisation beibehalten**

## Funktionsweise

1. **Benutzer wählt "Theorie"** im LessonTypeSelector
2. **EventModal setzt automatisch**:
   - `formData.type` bleibt die gewählte Fahrkategorie (z.B. 'B', 'A', 'BE')
   - `formData.duration_minutes = 45`
   - `formData.appointment_type = 'theory'`
3. **usePricing Composable** erkennt `appointment_type = 'theory'` und gibt CHF 85.- zurück
4. **PriceDisplay** zeigt den korrekten Preis an
5. **CategorySelector** bleibt sichtbar für bessere Organisation

## Testen

1. Neuen Termin erstellen
2. Schüler auswählen
3. "Theorie" als Terminart wählen
4. Überprüfen, dass:
   - **Kategorie bleibt die gewählte Fahrkategorie** (z.B. 'B', 'A', 'BE')
   - Preis CHF 85.- anzeigt
   - Dauer 45 Minuten ist
   - **CategorySelector sichtbar bleibt** (für bessere Organisation)
   - Info-Box angezeigt wird

## Wartung

### Neue Theorielektion-Preise hinzufügen
Falls sich der Preis ändert, einfach die bestehende Regel aktualisieren:

```sql
UPDATE pricing_rules 
SET price_per_minute_rappen = 9000  -- 90.00 CHF
WHERE rule_type = 'theory';
```

### Weitere spezielle Regeltypen
Das System kann leicht um weitere spezielle Regeltypen erweitert werden:
- `practical_exam` für praktische Prüfungen
- `special_training` für spezielle Trainings
- etc.

## Troubleshooting

### Preis wird nicht angezeigt
1. Überprüfe, ob die Datenbank-Regel korrekt eingefügt wurde
2. Prüfe die Browser-Konsole auf Fehler
3. Stelle sicher, dass `formData.type = 'THEORY'` gesetzt ist

### CategorySelector wird noch angezeigt
1. Überprüfe, ob `formData.appointment_type === 'theory'` korrekt gesetzt ist
2. Prüfe die Vue.js DevTools für den aktuellen State

### Preisberechnung funktioniert nicht
1. Überprüfe die `usePricing` Composable
2. Stelle sicher, dass der `categoryCode === 'THEORY'` Check funktioniert
3. Prüfe die Browser-Konsole auf Logs
