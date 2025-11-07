# Endpoint Testen - Schritt für Schritt

## ✅ Korrekter curl-Befehl

### Option 1: Mit API-Key (für manuelle Tests)

**Ersetze `DEIN_API_KEY` mit dem Key, den du in Vercel gesetzt hast!**

```bash
curl -X POST https://deine-app.vercel.app/api/cron/process-automatic-payments \
  -H "x-api-key: DEIN_API_KEY" \
  -H "Content-Type: application/json"
```

**Beispiel mit echtem Key:**
```bash
curl -X POST https://deine-app.vercel.app/api/cron/process-automatic-payments \
  -H "x-api-key: cac09d87e32eb6a97929a01cc938e7f6389f8c5a081cbc537b9b36577e095a42" \
  -H "Content-Type: application/json"
```

### Option 2: Simuliere Vercel Cron (ohne API-Key nötig)

```bash
curl -X POST https://deine-app.vercel.app/api/cron/process-automatic-payments \
  -H "x-vercel-cron: 1" \
  -H "Content-Type: application/json"
```

---

## 🔧 Häufige Probleme und Lösungen

### Problem 1: Befehl wird nicht ausgeführt (Multi-Line)

**Wenn der Befehl über mehrere Zeilen geht und `>` erscheint:**

**Lösung A**: Alles in einer Zeile:
```bash
curl -X POST https://deine-app.vercel.app/api/cron/process-automatic-payments -H "x-api-key: DEIN_API_KEY" -H "Content-Type: application/json"
```

**Lösung B**: Backslashes korrekt verwenden:
```bash
curl -X POST https://deine-app.vercel.app/api/cron/process-automatic-payments \
  -H "x-api-key: DEIN_API_KEY" \
  -H "Content-Type: application/json"
```
*(Kein Leerzeichen nach dem Backslash!)*

### Problem 2: "Unauthorized: Invalid API key"

**Ursachen:**
- ❌ API-Key nicht in Vercel gesetzt
- ❌ Falscher API-Key verwendet
- ❌ Environment Variable noch nicht deployed (nach Änderung muss neu deployt werden!)

**Lösung:**
1. Prüfe Vercel Dashboard → Settings → Environment Variables
2. Stelle sicher, dass `CRON_API_KEY` für **Production** gesetzt ist
3. **Redeploye** nach Änderung der Environment Variables!

### Problem 3: "Connection refused" oder "Could not resolve host"

**Ursache**: Falsche URL oder App nicht deployed

**Lösung:**
1. Ersetze `deine-app.vercel.app` mit deiner echten Vercel-URL
2. Prüfe ob die App deployed ist: https://vercel.com/dashboard

### Problem 4: Terminal zeigt `>` Prompt

**Ursache**: Unvollständiger Befehl (meist fehlende Anführungszeichen)

**Lösung:**
- Drücke `Ctrl+C` um abzubrechen
- Starte den Befehl neu (komplett in einer Zeile)

---

## 🧪 Test-Szenarien

### Test 1: Ohne API-Key (sollte fehlschlagen)

```bash
curl -X POST https://deine-app.vercel.app/api/cron/process-automatic-payments
```

**Erwartet**: `401 Unauthorized: Invalid API key`

### Test 2: Mit korrektem API-Key (sollte funktionieren)

```bash
curl -X POST https://deine-app.vercel.app/api/cron/process-automatic-payments \
  -H "x-api-key: DEIN_API_KEY"
```

**Erwartet**: `200 OK` mit JSON Response:
```json
{
  "success": true,
  "processed": 0,
  "failed": 0,
  "total": 0,
  "message": "No due payments to process"
}
```

### Test 3: Mit Vercel Cron Header (sollte funktionieren)

```bash
curl -X POST https://deine-app.vercel.app/api/cron/process-automatic-payments \
  -H "x-vercel-cron: 1"
```

**Erwartet**: `200 OK` (funktioniert ohne API-Key!)

---

## 💡 Tipps

### 1. API-Key in Variable speichern

```bash
# Setze Variable
export API_KEY="cac09d87e32eb6a97929a01cc938e7f6389f8c5a081cbc537b9b36577e095a42"

# Verwende Variable
curl -X POST https://deine-app.vercel.app/api/cron/process-automatic-payments \
  -H "x-api-key: $API_KEY"
```

### 2. Schöne JSON-Ausgabe

Füge `| jq` hinzu für formatierte Ausgabe:
```bash
curl -X POST https://deine-app.vercel.app/api/cron/process-automatic-payments \
  -H "x-api-key: DEIN_API_KEY" | jq
```

*(Falls `jq` nicht installiert: `brew install jq`)*

### 3. Vollständige Response sehen

```bash
curl -v -X POST https://deine-app.vercel.app/api/cron/process-automatic-payments \
  -H "x-api-key: DEIN_API_KEY"
```

*(`-v` = verbose, zeigt alle Headers und Details)*

---

## 🔍 Debugging

### Prüfe ob Endpoint existiert

```bash
curl -I https://deine-app.vercel.app/api/cron/process-automatic-payments
```

**Erwartet**: `405 Method Not Allowed` oder `401 Unauthorized` (beides OK, bedeutet Endpoint existiert!)

### Prüfe Vercel Logs

1. Gehe zu Vercel Dashboard
2. **Deployments** → Neuester Deployment
3. **Functions** → `/api/cron/process-automatic-payments`
4. **Logs** ansehen

Da siehst du alle Console-Logs vom Endpoint!

