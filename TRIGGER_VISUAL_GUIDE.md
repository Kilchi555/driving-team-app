# 🔍 TRIGGER ÜBERSICHT - VISUAL

## Kategorisierung

### ✅ SICHERE TRIGGER (20 Stück) - KEEP THEM ALL

```
┌─ UPDATED_AT TIMESTAMP TRIGGER (15x) ─────────────────────────┐
│ Funktion: Setzt automatisch updated_at = NOW()               │
│ Risiko: ✅ KEIN RISIKO                                       │
│ Nutzen: ⭐⭐⭐⭐⭐ SEHR WICHTIG                              │
│                                                               │
│ Betroffene Tabellen:                                          │
│  • appointment_discounts                                      │
│  • cancellation_reasons                                       │
│  • cash_registers                                             │
│  • courses, vehicles, rooms                                   │
│  • external_calendars                                         │
│  • general_resource_bookings                                  │
│  • general_resources                                          │
│  • invited_customers                                          │
│  • password_reset_tokens                                      │
│  • reglements                                                 │
│  • staff_invitations                                          │
│  • staff_working_hours                                        │
│  • user_devices                                               │
└────────────────────────────────────────────────────────────────┘

┌─ STORAGE TRIGGER (5x) ────────────────────────────────────────┐
│ Funktion: Verwalten Dateispeicher-Hierarchie                 │
│ Risiko: ✅ KEIN RISIKO (Supabase intern)                     │
│ Nutzen: ⭐⭐⭐⭐⭐ NOTWENDIG FÜR FILE-STORAGE              │
│                                                               │
│  • delete_prefix_hierarchy_trigger                            │
│  • objects_insert_prefix_trigger                              │
│  • objects_update_level_trigger                               │
│  • objects_update_prefix_trigger                              │
│  • prefixes_insert_trigger                                    │
└────────────────────────────────────────────────────────────────┘
```

---

### ⚠️ KOMPLEXE TRIGGER (3 Stück) - ÜBERPRÜFUNG NOTWENDIG

```
┌─ CASH SYSTEM TRIGGER ─────────────────────────────────────────┐
│ Funktion: Verwalten Kassenstand und Auszahlungen             │
│ Risiko: ⚠️ MITTELHOCH (könnten sich überschneiden)          │
│ Status: ❓ ÜBERPRÜFUNG NOTWENDIG                             │
│                                                               │
│ 1️⃣ trigger_update_cash_balance()                             │
│    └─ Wann: Nach INSERT/UPDATE/DELETE cash_transactions      │
│    └─ Was: update_cash_balance(instructor_id)                │
│    └─ Problem: Könnte langsam sein bei vielen Transaktionen  │
│                                                               │
│ 2️⃣ trigger_update_cash_balance_from_movements()              │
│    └─ Wann: Nach INSERT auf cash_movements                   │
│    └─ Was: update_cash_balance(instructor_id)                │
│    └─ Problem: ⚠️ DUPLIKAT? Macht das gleiche wie #1?       │
│                                                               │
│ 3️⃣ trigger_cash_withdrawal()                                 │
│    └─ Wann: Wenn status='confirmed' auf cash_withdrawals     │
│    └─ Was: withdraw_cash_transaction()                       │
│    └─ Problem: Automatische Auszahlungen - prüfe Logik       │
└────────────────────────────────────────────────────────────────┘
```

---

## 🎯 DEINE AUFGABE

Beantworte diese Fragen:

```
❓ Frage 1: Nutzt du noch das Cash-Register-System?
   └─ [] JA - Ich brauche die Trigger
   └─ [] NEIN - Das ist legacy code

❓ Frage 2: Sind cash_transactions und cash_movements unterschiedlich?
   └─ [] JA - Verschiedene Zwecke
   └─ [] NEIN - Das gleiche, trigger_2 ist Duplikat

❓ Frage 3: Brauchst du automatische Cash-Auszahlungen?
   └─ [] JA - trigger_cash_withdrawal() ist notwendig
   └─ [] NEIN - Das ist auch legacy
```

---

## 📊 STATISTIK

| Kategorie | Anzahl | Status | Aktion |
|-----------|--------|--------|--------|
| Updated_at Trigger | 15 | ✅ OK | KEEP ALL |
| Storage Trigger | 5 | ✅ OK | KEEP ALL |
| Cash Trigger | 3 | ⚠️ CHECK | ENTFERNEN ODER KEEP? |
| **TOTAL** | **23** | - | - |

---

## ⚡ SCHNELLE REFERENZ

### Was ist harmlos?
```sql
-- ✅ Alle Trigger die nur updated_at setzen
-- ✅ Alle Storage Trigger (Supabase)
```

### Was könnte Probleme machen?
```sql
-- ⚠️ Cash Balance Updates (könnten sich triggern)
-- ⚠️ Automatische Auszahlungen (SidEffects)
```

### Was sollte ich löschen?
```sql
-- Antworte auf die 3 Fragen oben - dann sagen wir dir!
```

---

## 🚀 NÄCHSTE SCHRITTE

1. ✅ Lies die 3 Fragen oben
2. ❓ Antworte mit JA/NEIN
3. 🔧 Ich erstelle dir ein Cleanup-Script
4. 🎉 Fertig!

