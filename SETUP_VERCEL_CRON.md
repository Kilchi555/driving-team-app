# Vercel Cron Job Setup - Schritt für Schritt

## 🎯 Übersicht

Wir richten den automatischen Zahlungs-Scheduler ein, der **jede Stunde** fällige Zahlungen verarbeitet.

---

## 📋 Schritt 1: Environment Variables in Vercel setzen

### 1.1 Gehe zu Vercel Dashboard

1. Öffne https://vercel.com/dashboard
2. Wähle dein **driving-team-app** Projekt aus
3. Gehe zu **Settings** → **Environment Variables**

### 1.2 Füge CRON_API_KEY hinzu

1. Klicke auf **"Add New"** oder **"Add"**
2. **Key**: `CRON_API_KEY`
3. **Value**: Generiere einen sicheren Key (siehe unten)
4. **Environments**: Wähle alle aus:
   - ✅ Production
   - ✅ Preview
   - ✅ Development
5. Klicke **Save**

### 1.3 API-Key generieren

Führe diesen Befehl im Terminal aus:

```bash
# Generiere einen zufälligen 32-Zeichen Key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Oder** verwende einen Online-Generator:
- https://randomkeygen.com/
- Wähle "CodeIgniter Encryption Keys" (32 Zeichen)

**Beispiel-Key** (NICHT verwenden, nur als Format-Referenz):
```
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

### 1.4 Optional: VERCEL_WEBHOOK_SECRET hinzufügen

**Nur wenn du volle Stufe-3-Sicherheit willst:**

1. Füge eine weitere Environment Variable hinzu:
   - **Key**: `VERCEL_WEBHOOK_SECRET`
   - **Value**: Einen anderen sicheren Key (wie oben generiert)
   - **Environments**: Alle

**Hinweis**: Falls du das nicht setzt, funktioniert trotzdem alles - nur ohne Signature-Validation (Stufe 1 statt Stufe 3).

---

## 📋 Schritt 2: Verstehe die Authentifizierung

### 2.1 Wie funktioniert es?

**Automatische Vercel Cron Requests:**
- ✅ Vercel sendet automatisch den `x-vercel-cron` Header
- ✅ Dieser Header wird **nur** von echten Vercel Cron Jobs gesendet
- ✅ Requests mit diesem Header werden automatisch als vertrauenswürdig behandelt
- ✅ **Keine zusätzliche Konfiguration nötig!**

**Manuelle Requests (für Tests):**
- ✅ Benötigen `x-api-key` Header mit dem `CRON_API_KEY`
- ✅ Nützlich zum manuellen Testen des Endpoints

### 2.2 Aktiviere Vercel Cron im Dashboard

1. Gehe zu **Settings** → **Cron Jobs** (falls verfügbar)
2. Der Cron Job sollte automatisch aus `vercel.json` erkannt werden
3. Nach Deployment siehst du den Cron Job in der Liste

**Hinweis**: Die `vercel.json` ist bereits konfiguriert! ✅

---

## 📋 Schritt 4: Deployment

### 4.1 Committe die Änderungen

```bash
git add .
git commit -m "Add automatic payment scheduler with Vercel Cron support"
git push
```

### 4.2 Vercel Deployment

- Vercel deployt automatisch nach `git push`
- Oder manuell: **Deployments** → **Deploy**

**Nach Deployment:**
- Der Cron Job wird automatisch in Vercel erkannt
- Läuft jede Stunde zur vollen Stunde (z.B. 10:00, 11:00, 12:00...)

---

## 📋 Schritt 5: Testen

### 5.1 Prüfe Environment Variables

In Vercel Dashboard → Settings → Environment Variables:
- ✅ `CRON_API_KEY` sollte gesetzt sein
- ✅ Optional: `VERCEL_WEBHOOK_SECRET` sollte gesetzt sein

### 5.2 Teste den Endpoint (ohne API-Key - sollte fehlschlagen)

```bash
curl -X POST https://deine-app.vercel.app/api/cron/process-automatic-payments
```

**Erwartet**: `401 Unauthorized: Invalid API key`

### 5.3 Teste den Endpoint (mit API-Key - sollte funktionieren)

**WICHTIG**: Ersetze `DEIN_API_KEY` mit dem Key, den du in Schritt 1.3 generiert und in Vercel gesetzt hast!

```bash
curl -X POST https://deine-app.vercel.app/api/cron/process-automatic-payments \
  -H "x-api-key: DEIN_API_KEY" \
  -H "Content-Type: application/json"
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

### 5.4 Teste Vercel Cron Simulation (ohne API-Key)

```bash
# Simuliere Vercel Cron Request (mit x-vercel-cron Header)
curl -X POST https://deine-app.vercel.app/api/cron/process-automatic-payments \
  -H "x-vercel-cron: 1" \
  -H "Content-Type: application/json"
```

**Erwartet**: `200 OK` (funktioniert ohne API-Key, da Vercel Cron erkannt wird)

### 5.4 Prüfe Vercel Cron Logs

1. Gehe zu **Deployments**
2. Öffne den letzten Deployment
3. Klicke auf **Functions**
4. Finde `/api/cron/process-automatic-payments`
5. Klicke darauf → **Logs** ansehen

**Nach der ersten Stunde** (zur vollen Stunde) solltest du Logs sehen wie:
```
🔄 Processing automatic payments...
✅ Authentication successful
📋 Found 0 due payment(s) to process
```

---

## 📋 Schritt 6: Monitoring einrichten

### 6.1 Vercel Dashboard

- **Cron Jobs**: Liste aller Cron Jobs
- **Functions Logs**: Detaillierte Logs jedes Runs
- **Metrics**: Performance-Metriken

### 6.2 Alerts (optional)

In Vercel kannst du **Alerts** für fehlgeschlagene Cron Jobs einrichten:
1. Settings → **Notifications**
2. Wähle **Failed Cron Jobs**
3. E-Mail oder Slack-Integration

---

## 🐛 Troubleshooting

### Problem: "Unauthorized: Invalid API key"

**Ursachen**:
- API-Key nicht in Vercel gesetzt
- Falscher API-Key verwendet
- Key wurde nach Deployment geändert (muss neu deployen)

**Lösung**:
1. Prüfe Environment Variables in Vercel
2. Stelle sicher, dass Key für **Production** gesetzt ist
3. Redeploye nach Änderung von Environment Variables

### Problem: Cron Job läuft nicht

**Ursachen**:
- `vercel.json` nicht korrekt
- Cron Job nicht in Vercel Dashboard sichtbar

**Lösung**:
1. Prüfe `vercel.json` Syntax
2. Redeploye das Projekt
3. Prüfe **Settings** → **Cron Jobs** im Dashboard

### Problem: "Missing Vercel signature"

**Ursache**: `VERCEL_WEBHOOK_SECRET` ist gesetzt, aber Signature fehlt

**Lösung**:
- **Option 1**: Entferne `VERCEL_WEBHOOK_SECRET` (Signature wird übersprungen)
- **Option 2**: Stelle sicher, dass Vercel die Signature sendet

---

## ✅ Checkliste

- [ ] `CRON_API_KEY` in Vercel als Environment Variable gesetzt
- [ ] Optional: `VERCEL_WEBHOOK_SECRET` gesetzt
- [ ] `vercel.json` enthält den Cron Job
- [ ] Code committed und deployed
- [ ] Endpoint getestet (mit und ohne API-Key)
- [ ] Erste Stunde abgewartet und Logs geprüft

---

## 🎉 Fertig!

Nach Abschluss aller Schritte:
- ✅ Cron Job läuft automatisch jede Stunde
- ✅ Endpoint ist gesichert mit API-Key
- ✅ Optional: Zusätzliche Sicherheit mit Signature
- ✅ Monitoring über Vercel Dashboard

Der Scheduler verarbeitet automatisch alle fälligen Zahlungen! 💳

