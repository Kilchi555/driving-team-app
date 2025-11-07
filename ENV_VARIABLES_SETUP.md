# Environment Variables Setup

## Wo müssen die Variables gesetzt werden?

### ✅ Production (Vercel) - ERFORDERLICH

**Vercel Dashboard → Settings → Environment Variables:**

1. `CRON_API_KEY` - **MUSS** gesetzt werden
   - Für alle Environments: Production, Preview, Development
   
2. `VERCEL_WEBHOOK_SECRET` - **OPTIONAL**
   - Nur wenn du volle Stufe-3-Sicherheit willst
   - Falls nicht gesetzt: Funktioniert trotzdem (nur API-Key-Check)

### ❓ Lokale Entwicklung - OPTIONAL

**Nur nötig, wenn du den Cron-Endpoint lokal testen willst:**

Erstelle `.env.local` (wird nicht zu Git committed):

```bash
# .env.local (nur für lokale Entwicklung)
CRON_API_KEY=dein-api-key-hier
VERCEL_WEBHOOK_SECRET=dein-secret-hier
```

**Wichtig**: 
- `.env.local` ist bereits in `.gitignore` (wird nicht committed)
- Nur nötig für lokale Tests des Endpoints
- Der Cron Job läuft **nur auf Vercel**, nicht lokal

### 📝 .env.example (für Team)

Falls dein Projekt eine `.env.example` hat, solltest du diese hinzufügen (ohne echte Werte):

```bash
# .env.example
CRON_API_KEY=your-api-key-here
VERCEL_WEBHOOK_SECRET=your-webhook-secret-here
```

**Zweck**: Andere Entwickler wissen, welche Variables sie brauchen.

---

## Zusammenfassung

| Ort | CRON_API_KEY | VERCEL_WEBHOOK_SECRET | Zweck |
|-----|--------------|----------------------|-------|
| **Vercel (Production)** | ✅ **MUSS** | ⚪ Optional | Cron Job läuft hier |
| **Vercel (Preview)** | ✅ **MUSS** | ⚪ Optional | Preview-Deployments |
| **Vercel (Development)** | ✅ **MUSS** | ⚪ Optional | Dev-Deployments |
| **Lokal (.env.local)** | ⚪ Optional | ⚪ Optional | Nur für lokale Tests |

---

## Was passiert wo?

### Auf Vercel (Production):
- ✅ Cron Job läuft automatisch jede Stunde
- ✅ Vercel sendet `x-vercel-cron` Header
- ✅ Endpoint erkennt Vercel Request automatisch
- ✅ **Kein API-Key nötig** für Vercel Cron Requests!

### Lokal (für Tests):
- ❌ Cron Job läuft **nicht** lokal
- ✅ Endpoint kann manuell getestet werden
- ✅ Braucht `x-api-key` Header mit dem `CRON_API_KEY`

---

## Empfehlung

**Minimum für Production:**
1. ✅ Setze `CRON_API_KEY` in Vercel (für manuelle Tests)
2. ⚪ `VERCEL_WEBHOOK_SECRET` optional (für Stufe 3)

**Für lokale Entwicklung:**
- ⚪ Optional: Erstelle `.env.local` nur wenn du den Endpoint lokal testen willst
- ✅ Sonst: Teste direkt auf Vercel nach Deployment

---

## Quick Check

Nach Setup in Vercel, teste:

```bash
# Sollte funktionieren (mit API-Key)
curl -X POST https://deine-app.vercel.app/api/cron/process-automatic-payments \
  -H "x-api-key: DEIN_API_KEY"

# Sollte fehlschlagen (ohne API-Key)
curl -X POST https://deine-app.vercel.app/api/cron/process-automatic-payments
```

