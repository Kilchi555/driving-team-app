# SMS Debug Steps

## Problem: SMS kommen nicht in der Datenbank an

### Schritt 1: SMS-Logs Tabelle erstellen

1. Gehe zu deiner **Supabase Cloud Console**
2. Gehe zu **SQL Editor**
3. Kopiere den Inhalt von `create_sms_logs_manual.sql` und führe ihn aus
4. Prüfe, ob die Tabelle `sms_logs` erstellt wurde

### Schritt 2: Edge Function deployen

1. Gehe zu **Edge Functions** in der Supabase Console
2. Klicke **Create a new function**
3. Name: `send-twilio-sms`
4. Kopiere den Inhalt von `supabase/functions/send-twilio-sms/index.ts`
5. Deploye die Function

### Schritt 3: Test-Seite verwenden

1. Gehe zu `http://localhost:3000/sms-test`
2. Teste die SMS-Funktionalität
3. Prüfe, ob SMS-Logs in der Datenbank erscheinen

### Schritt 4: Debug-Informationen sammeln

Öffne die Browser-Konsole und schaue nach:
- `📱 SMS Service called:` - Wird die Funktion aufgerufen?
- `🔄 SMS Fallback:` - Wird der Fallback verwendet?
- `✅ SMS sent successfully:` - Erfolgreiche Antwort?

### Schritt 5: Datenbank prüfen

In der Supabase Console, SQL Editor:
```sql
SELECT * FROM sms_logs ORDER BY sent_at DESC LIMIT 10;
```

### Mögliche Probleme:

1. **Edge Function nicht deployed** → Deploye die Function
2. **SMS-Logs Tabelle existiert nicht** → Führe das SQL-Script aus
3. **RLS Policies blockieren** → Prüfe die Policies
4. **Service Role Key fehlt** → Setze die Environment Variables

### Sofortige Lösung (ohne Edge Function):

Falls die Edge Function nicht funktioniert, können wir die SMS-Logs direkt in der App schreiben:

1. Erstelle die `sms_logs` Tabelle (Schritt 1)
2. Verwende die Test-Seite
3. Die Logs sollten erscheinen

### Nächste Schritte:

1. Führe Schritt 1 aus (SMS-Logs Tabelle erstellen)
2. Teste mit der Test-Seite
3. Lass mich wissen, was in der Konsole erscheint
