# SMS Setup mit Twilio

Diese Anleitung zeigt, wie du echte SMS-Versendung mit Twilio einrichtest.

## 1. Twilio Account erstellen

1. Gehe zu [Twilio Console](https://console.twilio.com/)
2. Erstelle einen kostenlosen Account
3. Verifiziere deine Telefonnummer

## 2. Twilio Credentials holen

1. In der Twilio Console, gehe zu **Account** → **API Keys & Tokens**
2. Kopiere deine **Account SID** und **Auth Token**
3. Gehe zu **Phone Numbers** → **Manage** → **Active Numbers**
4. Kaufe eine Telefonnummer oder verwende die Test-Nummer

## 3. Environment Variables setzen

Erstelle eine `.env.local` Datei im Projekt-Root:

```bash
# Twilio Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890

# Supabase Configuration (falls lokal)
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## 4. Supabase lokal starten

```bash
# Supabase CLI installieren (falls noch nicht installiert)
npm install -g supabase

# Supabase lokal starten
supabase start

# Edge Functions deployen
supabase functions deploy send-twilio-sms
```

## 5. Environment Variables in Supabase setzen

```bash
# Twilio Credentials in Supabase setzen
supabase secrets set TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
supabase secrets set TWILIO_AUTH_TOKEN=your_auth_token_here
supabase secrets set TWILIO_PHONE_NUMBER=+1234567890
supabase secrets set SUPABASE_URL=http://127.0.0.1:54321
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## 6. SMS-Logs Tabelle erstellen

```bash
# Migration ausführen
supabase db reset
```

## 7. Testen

1. Starte deine Nuxt-App: `npm run dev`
2. Erstelle einen "other event type" (z.B. Meeting)
3. Lade Neukunden ein
4. Speichere den Termin
5. SMS sollte versendet werden!

## Kosten

- **Twilio Test-Account**: Kostenlos (mit Limit)
- **Twilio Production**: ~$0.0075 pro SMS in der Schweiz

## Troubleshooting

### Edge Function nicht erreichbar
```bash
# Supabase Status prüfen
supabase status

# Edge Functions neu starten
supabase functions serve
```

### Twilio Fehler
- Prüfe deine Credentials in der Twilio Console
- Stelle sicher, dass deine Telefonnummer verifiziert ist
- Prüfe die Twilio-Logs in der Console

### SMS nicht ankommen
- Prüfe die Telefonnummer (muss mit + beginnen)
- Prüfe die Twilio-Logs
- Teste mit deiner eigenen Nummer zuerst

## Production Deployment

Für Production:

1. Deploye die Edge Function zu Supabase Cloud
2. Setze die Environment Variables in der Supabase Cloud Console
3. Verwende eine echte Twilio-Production-Telefonnummer
4. Aktiviere die Production-Credentials

```bash
# Edge Function zu Cloud deployen
supabase functions deploy send-twilio-sms --project-ref your-project-ref
```
