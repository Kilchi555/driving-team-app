# Social Media Automation — Driving Team

Automatischer Jahresplan mit Rabattcodes, Cronjobs und Meta Pages API.

## Vision

Saisonale Facebook/Instagram Posts werden automatisch veröffentlicht, optional mit
zeitlich begrenzten Rabattcodes verknüpft. Buchungen die über einen Post entstehen
sind messbar und direkt einem Code zugeordnet.

## Was schon existiert

- ✅ Meta API Infrastruktur (`server/utils/meta-ads-api.ts`, Token in `.env`)
- ✅ Vercel Cron (aktiv für Marketing Reports)
- ✅ Rabattcodes in Supabase
- ✅ Landingpages pro Standort (`/fahrschule-altstetten`, `/fahrschule-lachen` etc.)
- ✅ Admin-Bereich unter `/admin/marketing`

## Was noch fehlt

1. `pages_manage_posts` Permission auf dem System User (Meta Business Manager, 5 Min)
2. Supabase-Tabelle `social_post_schedule`
3. Server-Endpoint `POST /api/cron/social-post`
4. Admin-UI: Kalender-Ansicht zum Planen, Vorschauen und Bearbeiten

---

## Architektur

```
Admin plant Post im Kalender
        ↓
social_post_schedule (Supabase)
        ↓
Vercel Cron — täglich 08:00 UTC
        ↓
/api/cron/social-post
  → holt alle Posts mit publish_at <= now() und status = 'scheduled'
  → erstellt ggf. Rabattcode (discount_codes Tabelle)
  → POST /{page-id}/photos  oder  /{page-id}/video_reels
  → setzt status = 'published', speichert post_id + permalink
        ↓
Post ist live auf Facebook + Instagram
        ↓
Kunde verwendet Code → Buchung → Analytics
```

---

## Supabase Tabelle

```sql
create table social_post_schedule (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid references tenants(id),
  publish_at      timestamptz not null,
  platform        text not null default 'facebook',  -- 'facebook' | 'instagram' | 'both'
  post_type       text not null default 'photo',     -- 'photo' | 'reel' | 'story'
  caption         text not null,
  image_url       text,
  video_url       text,
  landing_page    text,                              -- z.B. '/fahrschule-lachen'
  discount_code   text,                              -- optional, wird auto-erstellt
  discount_pct    int,                               -- z.B. 10 für 10%
  discount_valid_days int default 14,
  status          text not null default 'scheduled', -- 'scheduled' | 'published' | 'failed'
  meta_post_id    text,
  meta_permalink  text,
  error_msg       text,
  created_at      timestamptz default now()
);
```

---

## Jahresplan (Vorlage)

| Datum | Thema | Code | Rabatt | Plattform |
|---|---|---|---|---|
| 1. Jan | Neues Jahr, neuer Führerschein | NEUJAHR25 | 10% | beide |
| 14. Feb | Valentinstag — zu zweit lernen | VALENTINS | 15% | Instagram |
| 1. März | Frühling = Motorrad-Saison | FRÜHLING25 | — | beide |
| 1. Mai | Sommer-Push Führerschein | MAI25 | 10% | beide |
| 15. Jun | Schule fertig → Führerschein | SOMMER25 | 15% | beide |
| 1. Aug | Last-Minute Sommer | AUGUST25 | 10% | beide |
| 1. Sep | Back to School | HERBST25 | 10% | beide |
| 1. Okt | Anhänger-Saison (Holz, Winterreifen) | ANHÄNGER25 | 10% | beide |
| 1. Nov | LKW-Push (Berufschauffeur) | LKW25 | — | beide |
| 1. Dez | Weihnachts-Gutschein | XMAS25 | 20% | beide |

---

## Endpunkte zu bauen

### `POST /api/cron/social-post`
- Auth: `Bearer CRON_SECRET`
- Holt alle `scheduled` Posts mit `publish_at <= now()`
- Pro Post:
  1. Falls `discount_code` gesetzt → Code in `discount_codes` erstellen mit Ablaufdatum
  2. Bild hochladen via `/{page-id}/photos` (oder Video für Reels)
  3. Post veröffentlichen mit Caption + Link
  4. Status → `published`, `meta_post_id` + `meta_permalink` speichern
- Fehlerbehandlung: Status → `failed`, `error_msg` speichern, Slack/Email Alert

### `GET /api/admin/social-schedule`
- Listet alle geplanten und publizierten Posts

### `POST /api/admin/social-schedule`
- Erstellt neuen geplanten Post

### `PATCH /api/admin/social-schedule/[id]`
- Bearbeitet oder löscht einen geplanten Post

---

## Admin UI (`/admin/marketing/social`)

- **Kalender-Ansicht** (Monatsübersicht) mit geplanten Posts
- **Post erstellen**: Text, Bild hochladen, Datum/Uhrzeit, Landingpage, optionaler Rabattcode
- **Preview**: zeigt wie der Post auf Facebook/Instagram aussieht
- **Status-Badges**: `geplant` / `live` / `fehlgeschlagen`
- **Analytics**: Likes, Reichweite, Klicks (via Pages Insights API)

---

## Berechtigungen (Meta Business Manager)

System User `Driving Team CAPI` benötigt zusätzlich:
- `pages_manage_posts`
- `pages_read_engagement` (für Analytics)
- `instagram_basic` + `instagram_content_publish` (falls Instagram gewünscht)

**Schritte:**
1. business.facebook.com → System Users → "Driving Team CAPI"
2. "Add Assets" → Page "Driving Team" → Role: Editor
3. Token neu generieren mit den neuen Scopes
4. `META_SYSTEM_USER_TOKEN` in Vercel + `.env.local` updaten

---

## Geschätzter Aufwand (Driving Team)

| Task | Zeit |
|---|---|
| Meta Permissions erweitern | 30 Min |
| Supabase Tabelle + Migration | 1h |
| Cron Endpoint | 2h |
| Admin UI (Kalender + Form) | 4h |
| Testing + Jahresplan befüllen | 2h |
| **Total** | **~1 Tag** |

---

## Phase 2 — Simy Multi-Tenant ("Simy Social")

Dasselbe Feature als White-Label SaaS für alle Simy-Tenants.
Jede Fahrschule bekommt ihren eigenen automatisierten Social Media Jahresplan.

### Vision

```
Simy Super-Admin erstellt Master-Templates
        ↓
KI (Claude) personalisiert automatisch pro Tenant:
  "Fahrschule [NAME] in [ORT] — ab CHF [PREIS]..."
        ↓
Tenant verbindet einmalig seine Facebook-Page via OAuth
        ↓
Jahresplan wird automatisch generiert und kann angepasst werden
        ↓
Ein globaler Cron iteriert alle Tenants → postet via ihre Page-Tokens
        ↓
Analytics pro Tenant im Dashboard
```

### Was sich pro Tenant unterscheidet

| Feld | Driving Team | Beliebiger Simy-Tenant |
|---|---|---|
| Page Token | eigener | eigener (via OAuth) |
| Branding | Driving Team grün | eigene Farben/Logo |
| Standorte | Altstetten, Lachen | ihre Orte |
| Preise | CHF 95 | ihre Preise |
| Rabattcodes | eigene Tabelle | eigene Tabelle |
| Landingpages | drivingteam.ch/... | ihre-domain.ch/... |

### Zusätzliche Architektur-Komponenten

**1. Facebook OAuth pro Tenant**
```
Tenant klickt "Facebook verbinden"
  → Facebook OAuth Login (Standard OAuth 2.0)
  → Long-lived Page Access Token (60 Tage, auto-erneuert)
  → verschlüsselt gespeichert in tenant_settings
```
Kein manuelles Token-Kopieren. Kein Support-Aufwand.

**2. KI-Copy-Generierung — nie identische Posts**
```
Template: "Sommer-Push Führerschein"
  → Claude generiert 3 einzigartige Textvarianten pro Tenant
  → Personalisiert mit Name, Ort, Preis, USPs aus Tenant-Profil
  → Tenant kann freigeben oder bearbeiten
```
Verhindert dass 50 Fahrschulen denselben Text posten.

**3. Bild-Templates (SVG → PNG)**
```
Vorlage: Hintergrundbild + Textlayer
  → Variablen: {tenant_name}, {location}, {tagline}
  → Server rendert PNG on-demand (z.B. via Sharp/Satori)
  → Kein Canva-Account nötig
```

**4. Globaler Multi-Tenant Cron**
```typescript
// /api/cron/social-post-all-tenants
const tenants = await getTenantsWith("social_posting_enabled = true")
for (const tenant of tenants) {
  const posts = await getScheduledPosts(tenant.id)
  for (const post of posts) {
    await publishPost(post, tenant.page_token)
    await createDiscountCode(post, tenant.id) // falls konfiguriert
  }
}
```

### Supabase Erweiterungen

```sql
-- Tenant OAuth-Verbindung
alter table tenant_settings add column if not exists
  meta_page_token        text,   -- verschlüsselt
  meta_page_id           text,
  meta_instagram_id      text,
  meta_token_expires_at  timestamptz,
  social_posting_enabled boolean default false;

-- Master-Templates (Simy Super-Admin)
create table social_post_templates (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,            -- "Sommer-Push Führerschein"
  caption_tpl  text not null,            -- Text mit {name}, {ort}, {preis} Variablen
  month        int,                      -- 1-12, optional
  post_type    text default 'photo',
  category     text,                     -- 'seasonal' | 'product' | 'promo'
  is_active    boolean default true,
  created_at   timestamptz default now()
);
```

### Feature-Tiers

| Feature | Free | Pro (CHF 49/Mo) | Agency (CHF 149/Mo) |
|---|---|---|---|
| Manuell posten | ✅ | ✅ | ✅ |
| Jahresplan Templates | — | ✅ | ✅ |
| KI-Texte | — | ✅ | ✅ |
| Auto-Rabattcodes | — | ✅ | ✅ |
| Analytics | — | ✅ | ✅ |
| Eigene Templates | — | — | ✅ |
| Multi-Page (mehrere Standorte) | — | — | ✅ |

### Zusätzlicher Aufwand für Multi-Tenant

| Task | Zeit |
|---|---|
| Facebook OAuth Flow | 1 Tag |
| Token-Erneuerung (automatisch) | 0.5 Tag |
| Master-Template System (Super-Admin) | 1 Tag |
| KI-Copy-Generierung pro Tenant | 1 Tag |
| Bild-Templates (SVG → PNG Rendering) | 1 Tag |
| Globaler Multi-Tenant Cron | 0.5 Tag |
| Tenant Admin UI + Onboarding | 1.5 Tage |
| **Total Phase 2** | **~7 Tage** |
| **Total Phase 1 + 2** | **~8 Tage** |

### Differenzierungspotenzial

Kein anderer Fahrschul-Software-Anbieter in der DACH-Region bietet:
- Automatischen saisonalen Content-Plan
- KI-personalisierten Copy pro Schule
- Integrierte Rabattcode-Automation
- Messbarer ROI pro Social Post → Buchung

Das macht "Simy Social" zu einem echten Upsell-Feature und Alleinstellungsmerkmal.
