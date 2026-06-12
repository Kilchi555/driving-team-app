# Simy — Google Ads API Tool Design Document

**Company:** Simy GmbH  
**Website:** https://simy.ch  
**Platform:** https://app.simy.ch  
**Date:** June 2026  

---

## 1. Overview

Simy is a SaaS platform built for driving schools in Switzerland. It provides automated marketing campaign management, booking systems, and performance reporting. The Google Ads API integration is used to manage Search campaigns on behalf of multiple driving school clients (tenants), each with their own Google Ads accounts linked under the Simy MCC.

---

## 2. System Architecture

```
Simy Admin Panel (app.simy.ch)
        │
        ▼
Simy Backend API (Nuxt.js / Node.js, hosted on Vercel)
        │
        ├──► Google Ads REST API v23
        │         │
        │         ├── MCC Account (950-995-7201)
        │         │       ├── Client Account: Driving Team Zürich (191-669-8119)
        │         │       ├── Client Account: Driving Team Lachen
        │         │       └── [future client accounts]
        │         │
        │         └── API Operations:
        │               ├── Campaign Creation (Search)
        │               ├── Ad Group + Keyword Management
        │               ├── Bid Management (Max CPC)
        │               ├── Performance Data Sync (daily)
        │               └── Server-side Conversion Upload
        │
        └──► Supabase (PostgreSQL)
                  └── marketing_google_ads_daily (performance data)
```

---

## 3. User Access

**Who uses the tool:**
- Internal Simy staff (platform administrators)
- Driving school operators (clients) via the Simy admin dashboard

**Authentication:**
- Simy uses OAuth2 with a service account and refresh token
- All API calls are made server-side (never from the browser)
- API keys are stored as encrypted environment variables in Vercel

---

## 4. API Capabilities Used

| Capability | Description |
|---|---|
| Campaign Creation | Create Search campaigns per location and course type (e.g. Motorrad Grundkurs Zürich) |
| Campaign Management | Update campaign status, budgets, and geo-targeting |
| Ad Group Management | Create ad groups with Responsive Search Ads |
| Keyword Management | Add/update keywords with match types and Max CPC bids |
| Bid Management | Bulk-update Max CPC across all keywords via the Simy admin tool |
| Performance Reporting | Daily sync of impressions, clicks, cost, conversions into Supabase |
| Conversion Upload | Server-side upload of booking conversions with gclid/gbraid |

---

## 5. Campaign Types Supported

- **Search** (primary): Keyword-targeted search campaigns for driving course bookings

---

## 6. Data Flow — Campaign Creation

1. Simy admin selects a client account and course type in the dashboard
2. Backend generates campaign settings (name, budget, geo-target, keywords)
3. API calls: `campaignBudgets:mutate` → `campaigns:mutate` → `adGroups:mutate` → `adGroupCriteria:mutate` → `ads:mutate`
4. Campaign is created in PAUSED status for review before activation

---

## 7. Data Flow — Performance Sync

1. Vercel Cron job runs daily at 04:10 UTC
2. Queries `campaign` resource for last 7 days via `googleAds:search`
3. Upserts results into `marketing_google_ads_daily` table in Supabase
4. Data displayed in Simy marketing dashboard per client

---

## 8. Data Flow — Conversion Upload

1. Customer completes booking on client's website
2. Simy backend extracts `gclid`/`gbraid` stored at session start
3. Uploads click conversion via `customers/{id}:uploadClickConversions`
4. Supports Enhanced Conversions (hashed email + phone)

---

## 9. Security & Compliance

- OAuth2 refresh token stored as encrypted Vercel environment variable
- Developer token never exposed to end users or client browsers
- All mutations require admin authentication (CRON_SECRET or admin session)
- No automated bidding without human review — campaigns start PAUSED
- Data access limited to accounts under the Simy MCC

---

## 10. Contact

**API Contact Email:** info@simy.ch  
**Technical Lead:** Pascal Kilchenmann  
**MCC Account:** 950-995-7201  
