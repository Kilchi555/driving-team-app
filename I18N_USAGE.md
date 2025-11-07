# 🌍 i18n Usage Guide

## Quick Start

### 1. In Vue Templates

```vue
<template>
  <div>
    <!-- Einfache Übersetzung -->
    <h1>{{ $t('receipt.title') }}</h1>
    
    <!-- Mit Parametern -->
    <p>{{ $t('receipt.footer', { email: 'info@example.com' }) }}</p>
    
    <!-- In Attributen -->
    <button :title="$t('common.save')">
      {{ $t('common.save') }}
    </button>
  </div>
</template>
```

### 2. In Script Setup

```vue
<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t, locale, setLocale } = useI18n()

// Übersetzung verwenden
const title = t('receipt.title')

// Sprache ändern
setLocale('en')
</script>
```

### 3. Automatische Sprache

Die User-Sprache wird automatisch beim Login geladen via `plugins/i18n.client.ts`.

### 4. User-Sprache setzen

```typescript
// In einem Component oder Composable
const supabase = getSupabase()
await supabase
  .from('users')
  .update({ language: 'en' })
  .eq('id', userId)

// Sprache sofort aktualisieren
const { setLocale } = useI18n()
setLocale('en')
```

## Verfügbare Übersetzungs-Schlüssel

### Event Types
- `eventType.lesson` → "Fahrlektion" / "Driving Lesson" / etc.
- `eventType.theory` → "Theorielektion" / "Theory Lesson" / etc.
- `eventType.exam` → "Fahrprüfung" / "Driving Test" / etc.
- `eventType.WarmUp` → "WarmUp"

### Status
- `status.scheduled` → "Geplant" / "Scheduled" / etc.
- `status.confirmed` → "Bestätigt" / "Confirmed" / etc.
- `status.cancelled` → "Storniert" / "Cancelled" / etc.
- `status.completed` → "Abgeschlossen" / "Completed" / etc.
- `status.pending_confirmation` → "Bestätigung ausstehend" / "Pending Confirmation" / etc.

### Receipt
- `receipt.title` → "Zahlungsquittung" / "Payment Receipt" / etc.
- `receipt.date` → "Quittungsdatum" / "Receipt Date" / etc.
- `receipt.customer` → "Kunde" / "Customer" / etc.
- `receipt.paymentInfo` → "Zahlungsinformationen" / "Payment Information" / etc.
- `receipt.baseAmount` → "Grundbetrag" / "Base Amount" / etc.
- `receipt.totalAmount` → "Gesamtbetrag" / "Total Amount" / etc.
- `receipt.footer` → Mit Parameter `{ email }`

### Common
- `common.save` → "Speichern" / "Save" / etc.
- `common.cancel` → "Abbrechen" / "Cancel" / etc.
- `common.delete` → "Löschen" / "Delete" / etc.
- `common.edit` → "Bearbeiten" / "Edit" / etc.
- `common.back` → "Zurück" / "Back" / etc.
- `common.confirm` → "Bestätigen" / "Confirm" / etc.

## Unterstützte Sprachen

- Deutsch (`de`) - Standard
- Englisch (`en`)
- Albanisch (`sq`)
- Italienisch (`it`)
- Spanisch (`es`)
- Französisch (`fr`)
- Kroatisch (`hr`)
- Serbisch (`sr`)
- Bosnisch (`bs`)
- Türkisch (`tr`)
- Russisch (`ru`)

## Neue Übersetzungen hinzufügen

1. Öffne alle Dateien in `locales/*.json`
2. Füge den neuen Schlüssel in allen Sprachen hinzu
3. Beispiel:
```json
{
  "newSection": {
    "newKey": "Deutscher Text"
  }
}
```

4. Nutze dann: `{{ $t('newSection.newKey') }}`

