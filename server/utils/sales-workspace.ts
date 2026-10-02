import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import {
  augustFromCampaignRows,
  buildSalesProspects,
  type SalesConsentInput,
  type SalesLeadInput,
  type SalesProspect,
  type SalesStaffInput,
  type SalesTenantInput,
} from '~/server/utils/sales-intelligence'

export class SalesStoreUnavailable extends Error {
  constructor() {
    super('sales_profile_store_unavailable')
    this.name = 'SalesStoreUnavailable'
  }
}

export function isMissingSalesStore(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false
  const text = `${error.code || ''} ${error.message || ''}`
  return /42P01|PGRST205|does not exist|schema cache/i.test(text)
}

async function fetchPages<T>(load: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { code?: string; message?: string } | null }>): Promise<T[]> {
  const rows: T[] = []
  const size = 1000
  for (let from = 0; ; from += size) {
    const { data, error } = await load(from, from + size - 1)
    if (error) throw error
    const batch = data || []
    rows.push(...batch)
    if (batch.length < size) break
  }
  return rows
}

export async function loadSalesProspects(): Promise<SalesProspect[]> {
  const supabase = getSupabaseAdmin()
  const leads = await fetchPages<SalesLeadInput>((from, to) =>
    supabase
      .from('fahrlehrer_leads')
      .select('id, name, first_name, phone, email, website, city, postal_code, address, notes, created_at')
      .order('id', { ascending: true })
      .range(from, to),
  )
  const tenants = await fetchPages<SalesTenantInput>((from, to) =>
    supabase
      .from('tenants')
      .select('id, name, contact_email, from_email, contact_phone, website_url, domain, website_domain')
      .order('id', { ascending: true })
      .range(from, to),
  )
  const staff = await fetchPages<SalesStaffInput>((from, to) =>
    supabase
      .from('users')
      .select('email, phone, role')
      .in('role', ['staff', 'admin', 'super_admin', 'tenant_admin'])
      .is('deleted_at', null)
      .order('id', { ascending: true })
      .range(from, to),
  )
  const consent = await fetchPages<SalesConsentInput & { id: string }>((from, to) =>
    supabase.from('leads').select('id, email, status').order('id', { ascending: true }).range(from, to),
  )
  const campaigns = await fetchPages<{ id: string; name: string | null }>((from, to) =>
    supabase.from('email_campaigns').select('id, name').ilike('name', '%Fahrlehrer Mail%').order('id', { ascending: true }).range(from, to),
  )
  const outreach = campaigns.filter((row) => /outreach/i.test(row.name || '') && /mail\s+[1-4]/i.test(row.name || ''))
  const campaignName = new Map(outreach.map((row) => [row.id, row.name]))
  const emailByLead = new Map(consent.map((row) => [row.id, row.email]))
  const signals: Array<{
    campaign_name: string | null
    email: string | null
    status: string | null
    sent_at: string | null
    opened_at: string | null
    clicked_at: string | null
  }> = []
  if (outreach.length) {
    const events = await fetchPages<{
      campaign_id: string
      lead_id: string
      status: string | null
      sent_at: string | null
      opened_at: string | null
      clicked_at: string | null
    }>((from, to) =>
      supabase
        .from('email_campaign_leads')
        .select('campaign_id, lead_id, status, sent_at, opened_at, clicked_at')
        .in('campaign_id', outreach.map((row) => row.id))
        .order('id', { ascending: true })
        .range(from, to),
    )
    for (const event of events) {
      signals.push({
        campaign_name: campaignName.get(event.campaign_id) || null,
        email: emailByLead.get(event.lead_id) || null,
        status: event.status,
        sent_at: event.sent_at,
        opened_at: event.opened_at,
        clicked_at: event.clicked_at,
      })
    }
  }
  return buildSalesProspects({
    leads,
    tenants,
    staff,
    consent,
    augustByEmail: augustFromCampaignRows(signals),
  })
}

export interface SalesProfileRow {
  id: string
  prospect_id: string
  sales_status: string
  assigned_to: string | null
  last_contacted_at: string | null
  next_follow_up_at: string | null
  last_contact_channel: string | null
  next_action: string | null
  contact_attempts: number
  conversation_outcome: string | null
  current_software: string | null
  pain_points: string | null
  interested_features: string | null
  objections: string | null
  demo_booked_at: string | null
  demo_completed_at: string | null
  proposal_sent_at: string | null
  won_at: string | null
  lost_at: string | null
  lost_reason: string | null
  notes: string | null
  updated_at?: string | null
}

export async function loadSalesProfiles(): Promise<{ rows: SalesProfileRow[]; available: boolean }> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('sales_pipeline_profiles')
    .select('id, prospect_id, sales_status, assigned_to, last_contacted_at, next_follow_up_at, last_contact_channel, next_action, contact_attempts, conversation_outcome, current_software, pain_points, interested_features, objections, demo_booked_at, demo_completed_at, proposal_sent_at, won_at, lost_at, lost_reason, notes, updated_at')
  if (error) {
    if (isMissingSalesStore(error)) return { rows: [], available: false }
    throw error
  }
  return { rows: (data || []) as SalesProfileRow[], available: true }
}

export function manualIndex(rows: SalesProfileRow[]) {
  return new Map(rows.map((row) => [row.prospect_id, row]))
}

export async function loadContactLogs(prospectIds: string[]) {
  const ids = [...new Set(prospectIds.filter(Boolean))]
  if (!ids.length) return []
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('sales_contact_logs')
    .select('id, channel, result, notes, next_follow_up_at, next_action, sales_status, created_by, created_at')
    .in('prospect_id', ids)
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) {
    if (isMissingSalesStore(error)) throw new SalesStoreUnavailable()
    throw error
  }
  return data || []
}
