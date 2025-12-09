# PRODUCTION READINESS CHECKLIST

## 🔴 CRITICAL - Muss SOFORT gemacht werden (vor Launch)

### 1. Database: error_logs Table erstellen (5 Min)
- [ ] Öffne Supabase Dashboard
- [ ] SQL Editor > Paste `migrations/create_error_logs_table.sql`
- [ ] Klick "Run"
- [ ] Verifiziere: `SELECT * FROM error_logs LIMIT 1` läuft ohne Error

**Wenn nicht gemacht:** Logger funktioniert nicht, API wirft 500 Error

---

### 2. RLS Policies AKTIVIEREN (30 Min)
Du hast ~40 Tabellen ohne RLS! Das ist ein SECURITY LEAK!

- [ ] Run `enable_critical_rls.sql` in Supabase (20 Tables)
- [ ] Run `enable_phase2_rls.sql` in Supabase (20+ weitere Tables)
- [ ] Teste RLS mit `test_rls_security.sql`

**Kritische Tables die NOCH KEINE RLS haben:**
- appointments ❌
- payments ❌
- cash_balances ❌
- invoices ❌
- user_documents ❌
- sms_logs ❌
- payment_logs ❌
- evaluations ❌
- cancellation_policies ❌
- exam_results ❌
- ... und 30+ mehr

**Wenn nicht gemacht:** Kunden können Daten von anderen Tenants sehen! 🔴

---

### 3. Wallee Production Credentials (10 Min)
- [ ] `.env` hat echte Wallee Credentials?
  ```
  WALLEE_SPACE_ID=?
  WALLEE_APPLICATION_USER_ID=?
  WALLEE_SECRET_KEY=?
  ```
- [ ] Keine hardcodierten Keys im Code? ✅ (bereits gefixt)

**Wenn nicht gemacht:** Zahlungen funktionieren nicht oder mit Test-Daten

---

### 4. Email & SMS Credentials (10 Min)
- [ ] `.env` hat Resend API Key?
  ```
  RESEND_API_KEY=re_...
  ```
- [ ] `.env` hat Twilio Edge Function URL?
  ```
  TWILIO_EDGE_FUNCTION_URL=...
  ```

**Wenn nicht gemacht:** Keine Benachrichtigungen rausgehen

---

### 5. Session Persistence Verifizieren (5 Min)
✅ **Bereits gefixt!** (localStorage statt window-specific)

Aber teste:
- [ ] Öffne App, login
- [ ] Close Tab
- [ ] Öffne neue Tab -> sollte logged in sein
- [ ] Close Browser
- [ ] Öffne Browser wieder -> sollte logged in sein (7 Tage)

**Wenn nicht gemacht:** Users müssen sich ständig re-loggen

---

## 🟡 IMPORTANT - Sollte vorher gemacht werden (Nice-to-have)

### 6. Console Logs Migrieren (45 Min)
- [ ] Run `bash scripts/replace-console-logs.sh`
- [ ] Add imports: `import { logger } from '~/utils/logger'`
- [ ] Run `npm run lint` und fix errors
- [ ] Test mit `npm run dev` - DevTools sollte sauber sein
- [ ] Commit & Push

**Wenn nicht gemacht:** App läuft trotzdem, aber Console ist voll mit Debug Logs (unprofessionell)

---

### 7. Error Logs Dashboard testen (10 Min)
- [ ] Erstelle eine Error: `logger.error('Test', 'Test error')`
- [ ] Check Supabase: `SELECT * FROM error_logs ORDER BY created_at DESC`
- [ ] Error sollte dort sein

**Wenn nicht gemacht:** Admins können Errors später nicht sehen

---

## 🟢 NICE-TO-HAVE - Optional (kann nach Launch)

### 8. Sentry Integration (später)
- [ ] Optional: Sentry für extra monitoring
- [ ] Kostenlos bis 5k Errors/Monat

### 9. Error Logs UI in Admin
- [ ] Optional: ErrorLogsViewer Component zu Admin-Seite hinzufügen
- [ ] Kann auch später gemacht werden

---

## ✅ CHECKLISTE - In dieser Reihenfolge:

```
┌─────────────────────────────────────┐
│ PRIORITY 1: MUSS SOFORT SEIN        │
├─────────────────────────────────────┤
│ [ ] 1. error_logs Table erstellen   │  5 Min
│ [ ] 2. RLS Policies aktivieren      │  30 Min
│ [ ] 3. Wallee Credentials checken   │  10 Min
│ [ ] 4. Email/SMS Credentials        │  10 Min
│ [ ] 5. Session Persistence testen   │  5 Min
│                                     │  -------
│                                     │  60 Min
├─────────────────────────────────────┤
│ PRIORITY 2: SOLLTE VORHER            │
├─────────────────────────────────────┤
│ [ ] 6. Console Logs migrieren       │  45 Min
│ [ ] 7. Error Logs Dashboard testen  │  10 Min
│                                     │  -------
│                                     │  55 Min
└─────────────────────────────────────┘

TOTAL: ~2 Stunden für alles
```

---

## 🚀 QUICK START COMMAND

```bash
# 1. Öffne Supabase SQL Editor und copy-paste:
# migrations/create_error_logs_table.sql
# enable_critical_rls.sql
# enable_phase2_rls.sql

# 2. Run lokal:
cd /Users/pascalkilchenmann/driving-team-app
npm run dev

# 3. Teste Session:
# Login > Close Tab > Open Tab > Still logged in?

# 4. Optional - Migrate Logs:
bash scripts/replace-console-logs.sh
npm run lint
git add -A
git commit -m "Migrate console logs to logger system"

# 5. Gut zu gehen!
git push
```

---

## 🔒 SECURITY CHECKLIST

- [ ] Keine Secrets in `.env.example` gecommittet?
- [ ] Alle `.env*` in `.gitignore`?
- [ ] RLS aktiviert für ALLE Tables?
- [ ] Wallee Secret nicht hardcodiert?
- [ ] No sensitive data in logs?
- [ ] HTTPS enabled für Production?
- [ ] CORS configured correctly?
- [ ] Rate limiting on APIs?

---

## 🧪 TESTING BEFORE LAUNCH

```bash
# 1. Bauen
npm run build

# 2. Preview Production Build
npm run preview

# 3. Test:
# - [ ] Login funktioniert
# - [ ] Termin erstellen funktioniert
# - [ ] Zahlung funktioniert
# - [ ] Email rausgeht
# - [ ] SMS rausgeht
# - [ ] Session bleibt nach Browser Close
# - [ ] Errors gehen in error_logs Table

# 4. Check:
# - [ ] Keine console.log Messages (außer Errors)
# - [ ] Keine 500 Errors
# - [ ] Keine RLS Errors (406)
# - [ ] Performance OK
```

---

## 📋 WAS IST BEREITS GETAN ✅

1. ✅ Logger System implementiert
2. ✅ Error Logs Database Migration vorbereitet
3. ✅ Session Persistence gefixt
4. ✅ Hardcodierte Secrets entfernt
5. ✅ RLS Scripts vorbereitet (aber noch NICHT aktiviert!)
6. ✅ CashPaymentConfirmation mit Logger updated

---

## 🎯 NÄCHSTE SCHRITTE

**Jetzt sofort:**
1. [ ] error_logs Table erstellen (Supabase SQL Editor)
2. [ ] RLS Policies aktivieren (beide SQL Files)
3. [ ] Session testen

**Dann wenn Zeit:**
1. [ ] Console Logs migrieren (optional)
2. [ ] npm run build && npm run preview
3. [ ] Full testing

**Dann deploy!**

---

## ⏱️ ZEITSCHÄTZUNG

| Task | Zeit | Priority |
|------|------|----------|
| error_logs Table | 5 min | 🔴 CRITICAL |
| RLS Policies | 30 min | 🔴 CRITICAL |
| Wallee Check | 10 min | 🔴 CRITICAL |
| Email/SMS Check | 10 min | 🔴 CRITICAL |
| Session Test | 5 min | 🔴 CRITICAL |
| **SUBTOTAL** | **60 min** | |
| Console Logs | 45 min | 🟡 IMPORTANT |
| Error Logs Test | 10 min | 🟡 IMPORTANT |
| **SUBTOTAL** | **55 min** | |
| **TOTAL** | **~2 hours** | |

---

## 📞 WENN DU STUCK BIST

1. **error_logs Table fehlgeschlagen?**
   - Check: `SELECT * FROM information_schema.tables WHERE table_name='error_logs'`
   - Wenn nicht da: Paste SQL nochmal

2. **RLS Error nach Aktivierung?**
   - Check: `SELECT * FROM pg_policies WHERE tablename='appointments'`
   - Wenn leer: RLS nicht aktiviert

3. **Wallee funktioniert nicht?**
   - Check: `echo $WALLEE_SECRET_KEY`
   - Wenn leer: `.env` nicht gesetzt

4. **Session bleibt nicht?**
   - Check Browser Storage: F12 > Application > localStorage
   - Sollte `sb-...auth-token` haben

---

## 🎉 FERTIG WENN

- [ ] Alle 5 CRITICAL Items done
- [ ] npm run build ohne Errors
- [ ] npm run preview läuft
- [ ] Login funktioniert
- [ ] Errors gehen in DB
- [ ] RLS enabled für alle Tables
- [ ] Keine Secrets committed

**DANN:** Ready for production! 🚀

