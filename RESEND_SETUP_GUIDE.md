# Resend.com Setup für info@simy.ch

## ✅ Schritt 1: Domain hinzufügen (ERLEDIGT)
- Domain: `simy.ch`
- Status: In Resend Dashboard hinzugefügt

## 📋 Schritt 2: DNS Records bei Infomaniak eintragen

### Wo: Infomaniak Manager
1. **Manager** → **Domains** → `simy.ch` → **DNS Zone**
2. Klicke **Einen Eintrag hinzufügen**

### Welche Records (Resend zeigt dir die genauen Werte):

#### Record 1: Domain Verification
```
Type: TXT
Name: @ (oder leer lassen)
Value: resend-verification=XXXXXXXX (Wert aus Resend Dashboard kopieren)
TTL: 3600
```

#### Record 2: DKIM (Email Signing)
```
Type: TXT
Name: resend._domainkey
Value: p=MIGfMA0GCSqGSIb3... (langer Wert aus Resend Dashboard)
TTL: 3600
```

#### Record 3: DMARC (Email Policy)
```
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=none; (Wert aus Resend Dashboard)
TTL: 3600
```

### ⏱️ Wartezeit
- DNS Propagation: 5-30 Minuten
- Manchmal bis zu 2 Stunden

## ✅ Schritt 3: Domain verifizieren

1. Warte 10-15 Minuten nach DNS Eintrag
2. In Resend Dashboard → **Domains** → `simy.ch`
3. Klicke **Verify Domain**
4. Status sollte auf ✅ **Verified** wechseln

### Troubleshooting:
Falls Verifizierung fehlschlägt:
```bash
# DNS Records prüfen (in Terminal):
dig TXT simy.ch
dig TXT resend._domainkey.simy.ch
dig TXT _dmarc.simy.ch
```

## 🔑 Schritt 4: API Key erstellen

1. Resend Dashboard → **API Keys**
2. **Create API Key**
3. Name: `Driving Team App - Production`
4. Permission: **Sending access**
5. Domain: `simy.ch`
6. **Create**

### ⚠️ WICHTIG: API Key sichern
```
API Key wird nur EINMAL angezeigt!
Format: re_XXXXXXXXXXXXXXXXXXXXXXXXXX

Speichere ihn sicher - du brauchst ihn gleich für Supabase.
```

## 🚀 Schritt 5: Supabase Edge Function erstellen

### 5.1 In Supabase Dashboard:
1. **Edge Functions** → **Create a new function**
2. Name: `send-email`
3. Template: **Blank**

### 5.2 Function Code:
```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

serve(async (req) => {
  // CORS Headers
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      }
    })
  }

  try {
    const { to, subject, text, html } = await req.json()

    console.log('📧 Sending email via Resend:', { to, subject })

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'SIMY Fahrschule <info@simy.ch>',
        to: [to],
        subject,
        text,
        html: html || text.replace(/\n/g, '<br>')
      })
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('❌ Resend API error:', data)
      throw new Error(data.message || 'Failed to send email')
    }

    console.log('✅ Email sent successfully:', data.id)

    return new Response(
      JSON.stringify({ success: true, messageId: data.id }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    )
  } catch (error) {
    console.error('❌ Error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    )
  }
})
```

### 5.3 Environment Variable setzen:
1. In Supabase → **Edge Functions** → `send-email`
2. **Secrets** → **Add new secret**
3. Name: `RESEND_API_KEY`
4. Value: [Dein Resend API Key von Schritt 4]
5. **Save**

### 5.4 Function deployen:
Die Function ist automatisch deployed nach dem Erstellen.

## ✅ Schritt 6: Testen

### Test 1: Direkt in Supabase
1. Edge Functions → `send-email` → **Invoke**
2. Request Body:
```json
{
  "to": "deine-test@email.com",
  "subject": "Test von SIMY Fahrschule",
  "text": "Dies ist eine Test-Email von Resend!"
}
```
3. **Invoke** klicken
4. Email sollte ankommen!

### Test 2: In der App
1. Gehe zu `/admin/test-reminders`
2. Payment-ID eingeben
3. Email-Kanal aktivieren
4. **Test-Erinnerung senden**
5. Prüfe `reminder_logs` Tabelle

## 📊 Monitoring

### Resend Dashboard:
- **Logs** → Alle gesendeten Emails sehen
- **Analytics** → Öffnungsraten, Bounces, etc.
- **Webhooks** → Optional für Delivery-Status

### Supabase Logs:
- **Edge Functions** → `send-email` → **Logs**
- Zeigt alle Requests und Errors

## 🎯 Nächste Schritte

1. ✅ Domain verifizieren (warten auf DNS)
2. ✅ API Key erstellen
3. ✅ Edge Function deployen
4. ✅ Ersten Test senden
5. 🔄 Erinnerungs-System aktivieren

## 💡 Tipps

### Sender-Name anpassen:
```typescript
from: 'Dein Name <info@simy.ch>'
```

### Reply-To hinzufügen:
```typescript
reply_to: 'support@simy.ch'
```

### CC/BCC:
```typescript
cc: ['cc@example.com'],
bcc: ['bcc@example.com']
```

## 🆘 Troubleshooting

### "Domain not verified"
- Warte 30 Min nach DNS Eintrag
- Prüfe DNS Records mit `dig`
- Kontaktiere Resend Support

### "Invalid API Key"
- Prüfe ob Key richtig kopiert wurde
- Erstelle neuen API Key
- Prüfe Supabase Secret

### Emails landen im Spam
- Warte 1-2 Tage (Domain Reputation)
- Prüfe DKIM/DMARC Setup
- Verwende professionelle Templates

## 📞 Support

- **Resend Docs**: https://resend.com/docs
- **Resend Support**: support@resend.com
- **Supabase Docs**: https://supabase.com/docs/guides/functions

