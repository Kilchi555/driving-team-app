export function isWebsiteProspectShell(tenant: { website_notes?: string | null } | null | undefined): boolean {
  return String(tenant?.website_notes || '').startsWith('website_prospect:')
}

export const WEBSITE_PROSPECT_STATUSES = [
  'discovered',
  'scored',
  'generated',
  'review',
  'approved',
  'sent',
  'claimed',
  'skipped',
  'rejected',
] as const

export type WebsiteProspectStatus = (typeof WEBSITE_PROSPECT_STATUSES)[number]

export type ProspectFinding = {
  id: string
  severity: 'high' | 'medium' | 'low'
  title: string
  detail: string
}

export type ProspectScrape = {
  final_url: string | null
  title: string | null
  description: string | null
  h1: string | null
  canonical: string | null
  robots: string | null
  viewport: boolean
  has_og: boolean
  has_schema: boolean
  generator: string | null
  copyright_year: number | null
  emails: string[]
  phones: string[]
  services: Array<{ name: string; source: 'nav' | 'heading' | 'keyword' }>
  logo_url: string | null
  hero_image_url: string | null
  images: string[]
  internal_paths: string[]
  theme_color: string | null
  word_count: number
  has_booking_cta: boolean
  cms: string | null
}

export type ProspectPagespeed = {
  performance: number | null
  seo: number | null
  lcp_ms: number | null
  source: 'psi' | 'skipped' | 'error'
  error?: string | null
}

export type ProspectPlace = {
  place_id: string
  name: string
  address: string | null
  phone: string | null
  website: string | null
  rating: number | null
  user_ratings_total: number | null
  maps_url: string | null
  types: string[]
  reviews: Array<{ author: string; text: string; rating: number }>
  opening_hours: string[]
  photos: Array<{ ref: string; width: number; height: number }>
  city: string | null
  postal_code: string | null
}

export type ProspectRevenueModel = {
  business_type: string
  city: string | null
  city_multiplier: number
  inquiries_low: number
  inquiries_high: number
  close_rate: number
  db_per_customer_chf: number
  monthly_low_chf: number
  monthly_high_chf: number
  yearly_low_chf: number
  yearly_high_chf: number
  assumptions: string[]
}

export type ProspectEmailDraft = {
  subject: string
  text: string
  html: string
}

export type ProspectIntent = {
  type: 'category' | 'location' | 'prices'
  title: string
  slug?: string
}

export type ProspectArchitecture = {
  mode: 'one' | 'multi'
  reason: string
  intents: ProspectIntent[]
}

export type ProspectAnalysis = {
  findings: ProspectFinding[]
  summary: string
  recommend_generate: boolean
  architecture?: ProspectArchitecture
}

export type WebsiteProspectRow = {
  id: string
  name: string
  business_type: string
  existing_url: string | null
  hostname: string | null
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  postal_code: string | null
  canton: string | null
  country: string
  place_id: string | null
  source: 'manual' | 'places_cron'
  status: WebsiteProspectStatus
  speed_score: number | null
  seo_score: number | null
  freshness_score: number | null
  opportunity_score: number | null
  pagespeed: ProspectPagespeed | null
  scrape: ProspectScrape | null
  analysis: ProspectAnalysis | null
  revenue_model: ProspectRevenueModel | null
  email_draft: ProspectEmailDraft | null
  place: ProspectPlace | null
  scraped_at: string | null
  tenant_id: string | null
  website_id: string | null
  preview_url: string | null
  preview_token: string | null
  matched_tenant_id: string | null
  notes: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  email_approved_at: string | null
  email_sent_at: string | null
  claimed_at: string | null
  created_at: string
  updated_at: string
}
