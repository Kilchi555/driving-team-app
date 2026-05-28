# Passkey-Notfall-Recovery

**Wann nutzen?** Du kannst dich als Admin nicht mehr einloggen, weil:

- alle deine Passkey-Geräte verloren / gelöscht / kaputt sind, **und**
- du keine unbenutzten Backup-Codes mehr hast, **und**
- (in Phase ≥ 1.5) Passwort-Login für deine Rolle deaktiviert ist (`PASSKEY_REQUIRED_ROLES`)

Solange du noch **eines** der folgenden hast, brauchst du diese Doku **nicht**:

- ✅ Mindestens ein registriertes Passkey-Gerät → einfach normal einloggen
- ✅ Mindestens einen unbenutzten Backup-Code → `/login`, dann Backup-Code-Flow
- ✅ Passwort-Login noch aktiv (Phase 1) → einfach Passwort

---

## Recovery-Vorbedingungen

Du brauchst:

1. **Direkten DB-Zugriff** (Supabase Dashboard SQL Editor oder Service-Role-Key)
2. Deine User-ID aus `public.users` oder deine Email

---

## Recovery-Pfade (vom mildesten zum schärfsten)

### Pfad A: Backup-Codes neu generieren (wenn du noch ein Gerät hast)

Wenn du noch ein Gerät hast, das angemeldet ist (z.B. anderer Browser noch eingeloggt) — gehe in `/admin/profile?tab=security` und klicke "Neue Backup-Codes generieren".

### Pfad B: Passwort-Login wieder erlauben (Phase 2+)

Wenn `PASSKEY_REQUIRED_ROLES` deine Rolle enthält und du dich deshalb nicht mehr per Passwort einloggen kannst, setze die Env-Variable temporär zurück:

```
# In Vercel/Railway/etc. Environment-Variables:
PASSKEY_REQUIRED_ROLES=
```

Nach dem nächsten Deploy ist Passwort-Login wieder erlaubt. Logge dich ein, registriere ein neues Passkey-Gerät, generiere neue Backup-Codes, setze die Env-Variable wieder.

### Pfad C: Alle deine Passkeys deaktivieren (Hard Reset)

```sql
-- Schritt 1: Finde deinen User-Eintrag
SELECT id, email, role
FROM public.users
WHERE email = 'deine.email@simy.ch';
-- Notiere die UUID (z.B. 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee')

-- Schritt 2: Deaktiviere alle deine Passkeys
UPDATE public.webauthn_credentials
SET is_active = FALSE
WHERE user_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

-- Schritt 3: Audit-Eintrag schreiben (für Compliance/Spurensicherung)
INSERT INTO public.webauthn_audit_log (user_id, event_type, success, error_message, details)
VALUES (
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  'emergency_disable',
  TRUE,
  'Manual emergency recovery via SQL',
  '{"reason": "lockout", "executed_by": "service_role"}'::jsonb
);
```

Danach: per Passwort einloggen → unter `/admin/profile?tab=security` neue Passkeys registrieren → neue Backup-Codes generieren.

### Pfad D: Frischen Auth-Reset über Supabase (nukleare Option)

Wenn auch Pfad C nicht hilft (z.B. Passwort vergessen + Passkey kaputt):

1. Supabase Dashboard → Authentication → Users → deine Email finden → "Send password recovery"
2. Email öffnen → Passwort zurücksetzen
3. Mit neuem Passwort einloggen
4. In `/admin/profile?tab=security`: alle alten Passkeys entfernen, neue registrieren, neue Backup-Codes

---

## Dauerhafte Sicherheitsmassnahmen (vorbeugend)

Damit du nie in diese Situation kommst:

1. **Mindestens 2 Passkey-Geräte** registrieren — z.B. Mac + iPhone, oder Mac + iPad
2. **10 Backup-Codes generieren**, ausdrucken, in einem Safe / Tresor verwahren
3. **Passwort weiterhin aktiv lassen** (in Phase 1 ist das der Default)
4. Vor jeder grösseren Auth-Änderung: einen zweiten Browser auf einem anderen Gerät offen halten, damit du im Fehlerfall noch eingeloggt bist

---

## Audit-Log einsehen

Alle Passkey-Ereignisse werden in `webauthn_audit_log` geloggt. Im Notfall:

```sql
SELECT created_at, event_type, success, error_code, ip_address, user_agent, details
FROM public.webauthn_audit_log
WHERE user_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
ORDER BY created_at DESC
LIMIT 50;
```

So siehst du, wann was passiert ist (z.B. wer wann wo eingeloggt war, oder ob jemand Fail-Versuche hatte).

---

## Feature-Flag-Übersicht

| Phase | `PASSKEY_ENABLED_ROLES` | `PASSKEY_REQUIRED_ROLES` | Was passiert |
|-------|------------------------|--------------------------|--------------|
| **Phase 1 (jetzt)** | `admin` | `` (leer) | Nur du siehst Passkey-UI. Passwort weiterhin möglich. |
| Phase 1.5 | `admin` | `admin` | Passwort für dich abgelehnt; nur Passkey/Backup-Code |
| Phase 2 | `admin,staff` | `admin` | Staff darf Passkey freiwillig nutzen, du musst |
| Phase 3 | `admin,staff,client` | `admin,staff` | Alle dürfen, Admin+Staff müssen, Clients optional |

Diese Flags werden über Environment-Variables gesetzt (Vercel / Railway / Local `.env`).
