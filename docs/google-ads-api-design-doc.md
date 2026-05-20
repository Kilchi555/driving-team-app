# Google Ads API Tool – Design Document
## Driving Team (drivingteam.ch)

### Company Overview
Driving Team is a driving school based in Birmensdorf, Switzerland. We offer driving lessons for students aged 17–25 in the Birmensdorf/Zurich area.

### Tool Description
We are building an internal marketing analytics dashboard integrated into our web application (app.simy.ch). The tool automatically fetches Google Ads campaign performance data daily and stores it in our private database for internal reporting.

### Technical Architecture
- **Backend:** Nuxt 3 / Node.js running on Vercel (serverless)
- **Database:** Supabase (PostgreSQL)
- **Scheduling:** Vercel Cron – runs once daily at 04:10 UTC
- **API usage:** Google Ads API (via `google-ads-api` Node.js library)

### API Usage
The tool calls the Google Ads API once per day to fetch the following metrics for each campaign:
- Date
- Campaign name & ID
- Impressions
- Clicks
- Cost (in CHF)
- Conversions

This data is upserted into our private Supabase database table `marketing_google_ads_daily`.

### Data Flow
1. Vercel Cron triggers the sync endpoint (`/api/cron/sync-marketing-google-ads`) at 04:10 UTC
2. The endpoint authenticates using OAuth2 (our own Google Cloud project)
3. It queries the Google Ads API for the last 7 days of campaign data
4. Data is upserted into Supabase

### Access Scope
- **Internal use only** – no external users, no clients
- Only the owner (Pascal Kilchenmann, pascal@drivingteam.ch) has access to the dashboard
- The tool is not offered as a service to third parties

### Accounts Managed
- 1 Google Ads account: Customer ID 191-669-8119 (our own advertising account)
- Manager account: 950-995-7201

### Data Storage & Privacy
- All data is stored in our own private Supabase instance
- No data is shared with third parties
- Data is used exclusively for internal campaign optimization

### Purpose
Replace manual monthly reporting from the Google Ads UI with automated daily data collection, enabling faster campaign optimization decisions.
