# Vercel Cron Security Setup (Stufe 3)

## Was wurde implementiert

✅ **API-Key Schutz**: Einfacher API-Key Check  
✅ **Vercel Signature**: HMAC SHA1 Signature Validierung  
✅ **Constant-time comparison**: Schutz vor Timing Attacks  
✅ **Graceful degradation**: Funktioniert auch ohne VERCEL_WEBHOOK_SECRET

## Vorteile von Stufe 3

### 1. Doppelte Sicherheit
- **API-Key**: Einfacher Schutz, schnell zu validieren
- **Signature**: Kryptographisch sicher, beweist dass Request von Vercel kommt

### 2. Beste Sicherheit
- Schutz vor **Man-in-the-Middle** Attacks
- Schutz vor **Replay Attacks** (wenn Timestamp validiert wird)
- Schutz vor **Timing Attacks** (constant-time comparison)

### 3. Audit Trail
- Klare Logs wann Signature validiert wurde
- Unterscheidung zwischen Vercel-Requests und anderen

## Nachteile von Stufe 3

### 1. ⚠️ Komplexität
- **Mehr Code**: ~60 Zeilen zusätzlicher Security-Code
- **Mehr Dependencies**: `crypto` Modul benötigt
- **Mehr Fehlerquellen**: Zwei Validierungs-Schritte können fehlschlagen

### 2. ⚠️ Konfiguration
- **Zwei Environment Variables** müssen gesetzt werden:
  - `CRON_API_KEY`: Muss in Vercel als Secret konfiguriert werden
  - `VERCEL_WEBHOOK_SECRET`: Optional, für Signature-Validation

### 3. ⚠️ Debugging
- Bei Fehlern muss geprüft werden:
  - Ist der API-Key korrekt?
  - Ist die Signature korrekt?
  - Wird der Body richtig gelesen?
  
### 4. ⚠️ Performance
- **Minimaler Overhead**: ~5-10ms zusätzlich pro Request
- Signature-Berechnung benötigt CPU
- Body muss vollständig gelesen werden

### 5. ⚠️ Vercel-Spezifisch
- Signature-Validation funktioniert nur mit Vercel
- Bei Umzug zu anderem Hosting muss angepasst werden

### 6. ⚠️ Body-Lesen Problem
- `readRawBody()` kann den Body "verbrauchen"
- Wenn später der Body nochmal gelesen wird, könnte das Problem machen
- In unserem Fall kein Problem, da wir den Body nicht brauchen

## Setup-Anleitung

### 1. Environment Variables in Vercel setzen

In Vercel Dashboard → Project Settings → Environment Variables:

```
CRON_API_KEY=dein-super-geheimer-api-key-hier
VERCEL_WEBHOOK_SECRET=dein-vercel-webhook-secret (optional)
```

**Wichtig**: 
- `CRON_API_KEY` ist **ERFORDERLICH**
- `VERCEL_WEBHOOK_SECRET` ist **OPTIONAL** (falls nicht gesetzt, wird nur API-Key geprüft)

### 2. Vercel Cron Job konfigurieren

In `vercel.json` ist bereits konfiguriert:
```json
{
  "path": "/api/cron/process-automatic-payments",
  "schedule": "0 * * * *"
}
```

**Wichtig**: Vercel sendet automatisch den Header `x-vercel-signature`, aber:
- Wir brauchen das `VERCEL_WEBHOOK_SECRET` um die Signature zu validieren
- Falls `VERCEL_WEBHOOK_SECRET` nicht gesetzt ist, wird nur API-Key geprüft

### 3. API-Key in Vercel Cron konfigurieren

Vercel Cron Jobs können **Secrets** senden. Konfiguriere in Vercel:

```json
{
  "crons": [
    {
      "path": "/api/cron/process-automatic-payments",
      "schedule": "0 * * * *",
      "headers": {
        "x-api-key": "{{CRON_API_KEY}}"
      }
    }
  ]
}
```

**WICHTIG**: Dies funktioniert nur, wenn `CRON_API_KEY` als **Vercel Secret** (nicht Environment Variable) gesetzt ist!

## Alternative: API-Key via Environment Variable

Falls Vercel Secrets nicht funktionieren, kannst du den API-Key auch manuell in den Headers setzen, aber dann ist er im Code sichtbar (nicht empfohlen).

## Testing

### 1. Ohne API-Key (sollte fehlschlagen)
```bash
curl -X POST https://deine-app.vercel.app/api/cron/process-automatic-payments
# Erwartet: 401 Unauthorized
```

### 2. Mit API-Key (sollte funktionieren)
```bash
curl -X POST https://deine-app.vercel.app/api/cron/process-automatic-payments \
  -H "x-api-key: dein-api-key"
# Erwartet: 200 OK mit Processing-Results
```

### 3. Mit falschem API-Key (sollte fehlschlagen)
```bash
curl -X POST https://deine-app.vercel.app/api/cron/process-automatic-payments \
  -H "x-api-key: falscher-key"
# Erwartet: 401 Unauthorized
```

## Empfehlung

**Für Produktion**: Stufe 3 (beide Checks)  
**Für Development**: Kann auch nur API-Key verwenden (einfacher zu debuggen)

## Fallback-Verhalten

Der Code ist so implementiert, dass:
- **API-Key**: IMMER geprüft wird (erforderlich)
- **Signature**: Nur geprüft wird, wenn `VERCEL_WEBHOOK_SECRET` gesetzt ist (optional)

Das bedeutet:
- Ohne `VERCEL_WEBHOOK_SECRET`: Nur API-Key-Check (Stufe 1)
- Mit `VERCEL_WEBHOOK_SECRET`: Beide Checks (Stufe 3)

## Sicherheits-Best-Practices

1. ✅ **Lange, zufällige API-Keys**: Mindestens 32 Zeichen, zufällig generiert
2. ✅ **Regelmäßig rotieren**: API-Keys alle 3-6 Monate wechseln
3. ✅ **Separate Keys**: Verschiedene Keys für verschiedene Environments
4. ✅ **Niemals im Code**: Nur in Environment Variables/Secrets
5. ✅ **Logging**: Alle Auth-Versuche loggen (aber KEINE Keys!)

## Troubleshooting

### Problem: "Unauthorized: Invalid API key"
- ✅ Prüfe ob `CRON_API_KEY` in Vercel gesetzt ist
- ✅ Prüfe ob der Header korrekt gesendet wird
- ✅ Prüfe ob der Key in Vercel als Secret konfiguriert ist

### Problem: "Unauthorized: Missing signature"
- ℹ️ Nur relevant wenn `VERCEL_WEBHOOK_SECRET` gesetzt ist
- ✅ Prüfe ob Vercel den `x-vercel-signature` Header sendet
- ✅ Prüfe ob `VERCEL_WEBHOOK_SECRET` korrekt ist

### Problem: Body kann nicht gelesen werden
- ⚠️ `readRawBody()` verbraucht den Stream
- ✅ Unser Code behandelt das graceful (warn aber weiter)
- ✅ Der Cron-Job braucht den Body nicht, also kein Problem

