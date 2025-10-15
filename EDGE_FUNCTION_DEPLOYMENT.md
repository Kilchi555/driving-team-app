# Edge Function Deployment Guide

## Staff Invitation Email Function

### Voraussetzungen
- Supabase CLI installiert: `npm install -g supabase`
- RESEND_API_KEY als Secret in Supabase gespeichert

### 1. Secret konfigurieren (falls noch nicht geschehen)

```bash
# Mit Supabase einloggen
supabase login

# Projekt verknüpfen
supabase link --project-ref unyjaetebnaexaflpyoc

# Secret setzen
supabase secrets set RESEND_API_KEY=your_resend_api_key_here
```

### 2. Edge Function deployen

```bash
# Aus dem Projektverzeichnis
supabase functions deploy send-staff-invitation-email --no-verify-jwt
```

### 3. Testen

Nach dem Deployment können Sie die Funktion testen:

```bash
curl -X POST 'https://unyjaetebnaexaflpyoc.supabase.co/functions/v1/send-staff-invitation-email' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "test@example.com",
    "firstName": "Test",
    "lastName": "User",
    "tenantName": "Test Fahrschule",
    "inviteLink": "http://localhost:3000/register/staff?token=test123",
    "fromEmail": "info@drivingteam.ch"
  }'
```

### 4. Überprüfen im Supabase Dashboard

1. Gehe zu: https://supabase.com/dashboard/project/unyjaetebnaexaflpyoc/functions
2. Die Function `send-staff-invitation-email` sollte erscheinen
3. Unter "Logs" kannst du Ausführungen überwachen

## Wichtige Hinweise

- Die Edge Function hat Zugriff auf den `RESEND_API_KEY` Secret
- Die Function läuft unabhängig von der Nuxt-Anwendung
- Fehler werden in den Supabase Function Logs angezeigt
- Die Function unterstützt CORS für Frontend-Aufrufe

## Integration in der App

Die Function wird automatisch vom Server API Endpoint aufgerufen:
- `/server/api/staff/invite.post.ts` ruft `serviceSupabase.functions.invoke()` auf
- Kein zusätzlicher Code im Frontend erforderlich

## Troubleshooting

### Email wird nicht gesendet
1. Prüfe ob der Secret gesetzt ist: `supabase secrets list`
2. Prüfe Function Logs im Supabase Dashboard
3. Prüfe Resend Dashboard auf Fehler

### Function nicht verfügbar
1. Prüfe ob Deployment erfolgreich war
2. Prüfe ob Function im Dashboard erscheint
3. Re-deploye mit: `supabase functions deploy send-staff-invitation-email --no-verify-jwt`

