# Supabase Preview Branch Setup - V2 Backend-Only Pricing Testing

## Schritt 1: Preview Branch in Supabase erstellen

### Via Dashboard (EMPFOHLEN):

1. **Gehe zu:** https://supabase.com/dashboard/project/[your-project-id]

2. **Navigiere zu Branches:**
   - Im linken Menü: **"Branches"** 
   - Oder: Settings → Database → Branching

3. **Create Preview Branch:**
   - Klicke auf **"Create Preview Branch"**
   - **Git Branch**: `feature/backend-only-pricing`
   - **Name**: `v2-pricing-test` (optional)
   - Klicke **"Create"**

4. **Warten** (2-5 Minuten):
   - ✅ Database wird kopiert (full schema + data)
   - ✅ Migrations werden automatisch angewandt
   - ✅ API Endpoints werden erstellt
   - ✅ Connection Strings werden generiert

---

## Schritt 2: Connection Details kopieren

Nach der Erstellung siehst du:

```
Project URL: https://[project-ref]-preview-v2-pricing-test.supabase.co
API URL: https://[project-ref]-preview-v2-pricing-test.supabase.co/rest/v1/
anon public: eyJhbGc...
service_role: eyJhbGc... (in Settings)
```

---

## Schritt 3: Lokale Environment Variables setzen

Erstelle eine **`.env.local`** Datei im Projekt-Root:

```bash
# .env.local (für lokales Testing mit Preview DB)

# ✅ PREVIEW DB Connection
VITE_SUPABASE_URL=https://[project-ref]-preview-v2-pricing-test.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ... (dein preview anon key)
SUPABASE_SERVICE_ROLE_KEY=eyJ... (dein preview service role key)

# Alle anderen Variablen bleiben wie in .env
```

**WICHTIG:** `.env.local` überschreibt `.env` für lokales Development!

---

## Schritt 4: Server neu starten

```bash
# Stoppe den aktuellen Dev Server (Ctrl+C)

# Starte neu mit Preview DB
npm run dev

# ✅ Die App verbindet sich jetzt mit der Preview DB!
```

---

## Schritt 5: Testing

### Test Cases:

1. **Neuer Termin ohne Produkte:**
   ```
   - Kategorie B, 45 min
   - Erwartung: 95 CHF Base Price
   - Check: Payment Metadata hat `v2: true`
   ```

2. **Neuer Termin mit Produkten:**
   ```
   - Kategorie B, 45 min + 1 Lehrbuch (20 CHF)
   - Erwartung: 115 CHF Total
   - Check: products_price_rappen = 2000
   ```

3. **Admin-Fee beim 2. Termin:**
   ```
   - Erstelle 1. Termin für User
   - Erstelle 2. Termin für gleichen User, gleiche Kategorie
   - Erwartung: 95 + 120 = 215 CHF
   - Check: admin_fee_rappen = 12000
   ```

4. **Fraud Detection Test:**
   ```
   - Öffne Browser DevTools
   - Finde API Call zu /api/appointments/save
   - Ändere totalAmountRappenForPayment von 9500 auf 1000
   - Resend Request
   - Check: Server-Logs zeigen "FRAUD ALERT"
   - Check: Payment hat trotzdem 9500 (Server-Preis!)
   ```

5. **Credit Usage:**
   ```
   - User mit 50 CHF Guthaben
   - Termin für 95 CHF buchen
   - Erwartung: 45 CHF remaining to pay
   - Check: credit_used_rappen = 5000
   - Check: total_amount_rappen = 4500
   ```

---

## Schritt 6: SQL Queries zum Validieren

### Check V2 Payments:

```sql
-- Alle V2 Payments (mit server_calculated flag)
SELECT 
  id,
  user_id,
  payment_status,
  (lesson_price_rappen / 100.0) as lesson_price_chf,
  (admin_fee_rappen / 100.0) as admin_fee_chf,
  (products_price_rappen / 100.0) as products_chf,
  (total_amount_rappen / 100.0) as total_chf,
  metadata->>'v2' as is_v2,
  metadata->>'server_calculated' as server_calc,
  created_at
FROM payments
WHERE metadata->>'v2' = 'true'
ORDER BY created_at DESC;
```

### Check Fraud Detection Logs:

```sql
-- Suche nach Fraud Alerts in audit_logs (falls implementiert)
-- Oder checke die Server Console Logs für "FRAUD ALERT"
```

---

## Schritt 7: Cleanup nach Testing

### Wenn alles funktioniert:

1. **Stop Dev Server**
2. **Lösche `.env.local`** (oder rename zu `.env.local.backup`)
3. **Merge Branch:**
   ```bash
   git checkout main
   git merge feature/backend-only-pricing
   git push origin main
   ```

4. **Delete Preview Branch in Supabase Dashboard**
   - Gehe zu Branches
   - Klicke auf "Delete" bei `v2-pricing-test`
   - Preview DB wird gelöscht (spart Kosten!)

### Wenn Probleme auftreten:

1. **Check Server Logs:**
   ```bash
   # In Terminal wo npm run dev läuft
   # Suche nach ERROR oder FRAUD ALERT
   ```

2. **Check Network Tab:**
   - Browser DevTools → Network
   - Filter: /api/
   - Check Request/Response für failures

3. **Rollback:**
   ```bash
   # Branch nicht mergen
   git checkout main
   # Preview Branch in Supabase löschen
   ```

---

## Troubleshooting

### Problem: "Cannot connect to Supabase"

**Lösung:**
- Check VITE_SUPABASE_URL ist korrekt (mit https://)
- Check anon key ist vollständig kopiert
- Restart dev server

### Problem: "401 Unauthorized"

**Lösung:**
- Check service_role key in .env.local
- Restart dev server (env vars werden beim Start geladen)

### Problem: "Pricing calculation failed"

**Lösung:**
- Check pricing_rules existieren in Preview DB
- Run SQL:
  ```sql
  SELECT * FROM pricing_rules WHERE category_code = 'B';
  ```
- Falls leer: Migrations nicht angewandt → Re-create Branch

---

## Supabase CLI Alternative (Advanced)

Falls du die CLI verwenden möchtest:

```bash
# Login
supabase login

# Link project
supabase link --project-ref [your-project-ref]

# ABER: Branching via CLI ist limitiert
# Besser: Dashboard verwenden!
```

---

## 🎯 Summary

**Jetzt:**
1. Gehe zu Supabase Dashboard
2. Erstelle Preview Branch `feature/backend-only-pricing`
3. Warte 2-5 Minuten
4. Kopiere Connection Details
5. Erstelle `.env.local` mit Preview Credentials
6. `npm run dev`
7. Teste alle Cases oben
8. Bei Erfolg: Merge zu main!

**Viel Erfolg beim Testing! 🚀**

