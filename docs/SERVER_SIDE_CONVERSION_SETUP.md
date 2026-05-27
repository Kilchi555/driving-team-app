# Server-Side Google Ads Conversion — Setup Guide

Dieser Guide beschreibt die einmaligen Konfigurationsschritte, damit das neue
Cross-Domain-Conversion-Tracking (drivingteam.ch → app.simy.ch → Google Ads)
in Produktion läuft.

## Architektur (Kurzfassung)

```
┌─────────────────────┐   gclid/UTMs in   ┌──────────────────────┐
│  drivingteam.ch     │  localStorage     │   booking-Link mit   │
│  marketing-         │  (90 Tage TTL)    │   ?session_id=...    │
│  attribution.client │ ──────────────►  │   &dt_attr=<base64>  │
└─────────────────────┘                   └──────────┬───────────┘
                                                     │
                                                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                       app.simy.ch                               │
│                                                                  │
│  booking-session-tracking.client.ts                              │
│   ├── decodet dt_attr                                            │
│   ├── POST /api/marketing-attribution → marketing_attributions   │
│   └── window.__marketingAttribution                              │
│                                                                  │
│  Booking-Confirm                                                 │
│   └── POST /api/booking/create-appointment                       │
│        ├── speichert gclid/UTMs auf appointment-Row              │
│        └── fire-and-forget                                       │
│             └── recordAndUploadConversion()                      │
│                  └── Google Ads API uploadClickConversions       │
│                                                                  │
│  Cancel                                                          │
│   └── POST /api/appointments/handle-cancellation                 │
│        └── fire-and-forget                                       │
│             └── uploadConversionAdjustment (RETRACT/RESTATEMENT) │
└─────────────────────────────────────────────────────────────────┘
```

## 1. Google Ads — Conversion Action erstellen

In Google Ads (Webinterface):

1. **Tools & Einstellungen → Messung → Conversions → "+ Neue Conversion-Aktion"**
2. Wähle **"Import"** als Quelle (nicht Website/App).
3. **"Andere Datenquellen oder CRMs"** → **"Tracks Conversions von Klicks"**
4. Name: `Server: Booking Completed`
5. Kategorie: **"Buchen"** (übersetzt: Termin vereinbaren)
6. Wert: **"Verschiedene Werte verwenden"** → CHF, Standardwert leer lassen
7. Anzahl: **"Eine"** (eine Buchung = eine Conversion)
8. Klick-Conversion-Fenster: **30 Tage** (default ok)
9. View-Through-Window: **1 Tag**
10. Attributionsmodell: **"Datengetrieben"** (oder Last-Click falls < 300 Conv./Mo)
11. Speichern.

> **Conversion Action ID kopieren**: Nach dem Speichern öffne die neue Action,
> die URL enthält `&__c=<NUMMER>` — diese Nummer ist die `conversionActionId`.
> Alternativ: API-Call `customers.search` mit
> `SELECT conversion_action.id, conversion_action.name FROM conversion_action`.

## 2. Enhanced Conversions for Leads aktivieren

In derselben Conversion Action:
- Tab **"Enhanced Conversions"** öffnen
- **"Enhanced Conversions for Leads aktivieren"** ✅
- Akzeptiere die Customer-Data-Terms
- Setup-Methode: **"Google Ads API"**
- Speichern.

> Damit kann Google die hashed Email/Phone matchen — verbessert die
> Conversion-Erfassung um 15–30 % wenn gclid fehlt oder veraltet ist.

## 3. OAuth Refresh Token

Falls noch nicht gemacht: Refresh Token mit `adwords` Write Scope erzeugen.

Im OAuth-Playground (https://developers.google.com/oauthplayground):
1. Eigene Credentials nutzen (Settings → OAuth Client ID/Secret)
2. Scope: `https://www.googleapis.com/auth/adwords`
3. Authorize APIs → Exchange code → **Refresh Token kopieren**

Vorhandener Refresh Token (`GOOGLE_ADS_REFRESH_TOKEN`) sollte ausreichen
falls er schon mit `adwords` Scope erzeugt wurde — der Read-Scope für das
Reporting ist derselbe.

## 4. Vercel Environment Variables

In **Vercel → app.simy.ch Project → Settings → Environment Variables**
(Production + Preview):

| Variable                              | Beispielwert                          | Quelle                                  |
| ------------------------------------- | ------------------------------------- | --------------------------------------- |
| `GOOGLE_ADS_DEVELOPER_TOKEN`          | `xxxxxxxxxx`                          | bereits gesetzt (sync-marketing-google-ads) |
| `GOOGLE_ADS_CLIENT_ID`                | `xxxxx.apps.googleusercontent.com`    | bereits gesetzt                         |
| `GOOGLE_ADS_CLIENT_SECRET`            | `GOCSPX-xxxxx`                        | bereits gesetzt                         |
| `GOOGLE_ADS_REFRESH_TOKEN`            | `1//0xxxxx`                           | bereits gesetzt                         |
| `GOOGLE_ADS_CUSTOMER_ID`              | `1916698119` (no dashes)              | bereits gesetzt                         |
| `GOOGLE_ADS_MANAGER_CUSTOMER_ID`      | `9509957201` (optional, MCC)          | falls über Manager-Konto                |
| **`GOOGLE_ADS_CONVERSION_ACTION_ID`** | **`1234567890`** (aus Schritt 1)      | **NEU — muss gesetzt werden**           |
| **`GOOGLE_ADS_INQUIRY_CONVERSION_ACTION_ID`** | **`1234567891`** (Anfrage-Conversion, optional) | **NEU — für Vorschlagsformular** |

### Anfrage-Conversion (optional, Schritt 1b)

Für das „Vorschlag machen“-Formular auf der Booking-Seite:

1. Gleicher Ablauf wie Schritt 1, Name: `Server: Inquiry Submitted`
2. Kategorie: **„Lead“** oder **„Kontakt“**
3. Conversion Action ID → `GOOGLE_ADS_INQUIRY_CONVERSION_ACTION_ID` in Vercel
4. In Google Ads als **Sekundäre Conversion** markieren (Smart Bidding optimiert weiter auf „Booking Completed“)

Ohne diese Variable: Anfragen werden trotzdem in `booking_events` + GA4 getrackt, nur kein Google Ads Upload.

Nach dem Setzen: redeploy (`vercel --prod` oder neuer Push triggert auto-deploy).

## 5. Smoke Test in Produktion

1. Klicke auf einen aktiven Google Ads `drivingteam.ch`-Anzeigentext.
2. Die URL hat dann `?gclid=xxxxx` — Plugin schreibt das in localStorage.
3. Klicke auf einen Booking-Button. Die App-URL sollte `?session_id=...&dt_attr=...` enthalten.
4. Mache eine Test-Buchung (eigener Account, kostenloser Kurs/Termin).
5. Nach 1–2 Min in Supabase prüfen:
   ```sql
   select id, status, gclid, marketing_session_id, created_at
   from appointments
   order by created_at desc limit 1;

   select * from google_ads_conversion_uploads
   order by created_at desc limit 1;
   ```
6. In Google Ads: **Tools → Messung → Conversions** → "Server: Booking Completed"
   → Datenstand kommt mit 3–6 h Verzögerung an.

## 6. Was passiert wenn …?

| Szenario                                  | Verhalten                                                                |
| ----------------------------------------- | ------------------------------------------------------------------------ |
| User klickt kein Ad, sondern organisch    | `gclid` fehlt → Upload wird mit `skipped_no_click_id` geloggt, nichts wird an Google geschickt. Booking läuft normal. |
| `GOOGLE_ADS_CONVERSION_ACTION_ID` fehlt   | Upload wird mit `missing_credentials` geloggt, Booking läuft normal.     |
| Google Ads API Fehler                     | `upload_status='failed'`, `error_message` ist gesetzt. Booking läuft.    |
| Buchung wird storniert (chargePercentage=0) | RETRACT-Adjustment wird gesendet, Conversion wird in Google entfernt.    |
| Buchung wird zu 50% storniert             | RESTATEMENT-Adjustment auf 50 % des Originalwerts.                       |
| Buchung wird zu 100% storniert (no-show)  | Kein Adjustment — wir haben die Einnahme behalten.                       |

## 7. Daten-Auswertung — neue Tabellen

```sql
-- Welche Kampagnen erzeugen tatsächliche Bookings?
select a.utm_campaign, a.utm_source, count(*) as bookings,
       sum(a.original_price_rappen)/100.0 as gross_chf
from appointments a
where a.gclid is not null
  and a.status = 'confirmed'
  and a.created_at > now() - interval '30 days'
group by 1, 2
order by bookings desc;

-- Upload-Status: wie viele Conversions kamen wirklich bei Google an?
select upload_status, count(*) from google_ads_conversion_uploads
where created_at > now() - interval '30 days'
group by 1;
```

## 8. Optional — Retry-Cron für failed Uploads (Phase 2)

Aktuell wird jede failed Upload-Row in `google_ads_conversion_uploads` mit
`upload_status='failed'` markiert, aber nicht automatisch retried. Falls die
Google Ads API mal 1–2 h down ist, kann ein täglicher Cron alle `failed`-Rows
der letzten 24 h erneut versuchen.

Skizze: `server/api/cron/retry-google-ads-conversions.post.ts`
```ts
// 1. select * from google_ads_conversion_uploads
//    where upload_status='failed' and last_attempt_at < now() - interval '1 hour'
//    and upload_attempts < 3
// 2. for each: uploadClickConversion(...)
// 3. update row with new status/attempt count
```

Aktuell nicht implementiert — die meisten Fehler sind Setup-Fehler
(`missing_credentials`, `no_click_id`) die ein Retry nicht hilft.
