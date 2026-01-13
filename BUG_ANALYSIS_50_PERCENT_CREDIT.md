# BUG ANALYSE: 50% Credit Bug bei Cancellation

## Das Problem

Ein Customer hat eine Absage und plötzlich sind 50% des Lektionspreises (`4750 Rappen = CHF 47.50`) auf sein Guthaben gerechnet worden.

Das Payment Record zeigt:
```json
{
  "lesson_price_rappen": 21500,
  "total_amount_rappen": 21500,
  "credit_used_rappen": 4750,  ← 50% des Lektionspreises (9500)!
  "payment_status": "cancelled"
}
```

## Root Cause gefunden!

Die `credit_used_rappen` Wert wird NICHT von der Cancellation Logic berechnet.
Er ist bereits VORHER im Payment Record gespeichert!

Das heißt: **Irgendwer/etwas setzt diesen Wert beim Payment CREATE auf 50% des Lektionspreises - obwohl der Customer KEIN Credit verwendet hat!**

## Orte wo credit_used_rappen verwendet wird:

1. **EventModal.vue Line 1239**
   - Setzt `credit_used_rappen` wenn Credit benutzt wird
   - NUR wenn useStudentCredits erfolgreich einen Credit-Transaction erstellt

2. **useEventModalForm.ts Line 1368**
   - Liest `credit_used_rappen` von PriceDisplay
   - Das ist `usedCredit` = aktuelles Guthaben des Students

3. **PriceDisplay.vue Line 1053**
   - `getUsedCredit()` Funktion berechnet wie viel Credit benutzt wird
   - Im Create-Mode: `Math.min(creditAmount, totalBeforeCredit)`
   - Im Edit-Mode: Liest aus bestehendem Payment

## Die 50% Mystery

Die `4750` ist exakt **50% von 9500** (dem Lektionspreis):
- `9500 * 0.5 = 4750` ✓

**ABER:** Wo kommt diese 0.5 her?

### Vermutungen:

1. **Bug in PriceDisplay:** Es berechnet irgendiwe 50% des Preises als "used credit"
2. **Bug bei Payment Creation:** Beim Erstellen wird versehentlich 50% als credit gesetzt
3. **Cancellation Policy Bug:** Die Stornierungslogik berechnet 50% charge und setzt das als credit_used
4. **Race Condition:** Zwei Prozesse machen gleichzeitig was damit

## Was ich überprüft habe:

✅ `handle-cancellation.post.ts` - NICHT der Ort (nur refunds)
✅ `create-payment.post.ts` - NICHT der Ort  (keine 50% hardcoded)
✅ `PriceDisplay.vue getUsedCredit()` - Berechnet korrekt basierend auf StudentCredit
✅ `useEventModalForm.ts` - Liest korrekt von PriceDisplay
❌ **NOCH NICHT GEFUNDEN**: Wo werden die 50% berechnet und als `credit_used_rappen` gespeichert?

## Nächste Schritte zum Finden des Bugs:

1. Überprüfe wenn der Student eine Payment mit `4750` credit_used erstellt - ist das Customer-seitig?
2. Oder kommt das von dem Fahrlehrer beim Erstellen?
3. Ist das automatisch beim Payment Create passiert?
4. Gibt es Code der `chargePercentage * lessonPrice / 100` macht?

##Code-Stellen zum Überprüfen:

- Alle Stellen wo Payment `credit_used_rappen` wird gesetzt
- Alle Stellen wo `chargePercentage` mit Price multipliziert wird
- Logging in useStudentCredits wenn Credit appliziert wird
- Ist vielleicht ein Trigger in der DB der das macht?

## Deine Aufgabe:

1. Wann wurde das Payment mit `4750` credit_used erstellt?
2. Wer hat es erstellt? (Student oder Fahrlehrer?)
3. Hatte der Student zu diesem Zeitpunkt Guthaben? (Wenn nein, dann Bug sicher!)
4. Gibt es Logs in useStudentCredits oder EventModal für diese Zeit?

