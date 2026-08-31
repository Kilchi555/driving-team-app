export const WEBSITE_SETUP_CHF = 490
/** Simy SaaS Starter — live calendar / booking. Not included in website-only. */
export const SIMY_STARTER_CHF = 49

export const WEBSITE_PRICE_ENV = {
  setup: 'STRIPE_PRICE_WEBSITE_SETUP',
  host: 'STRIPE_PRICE_WEBSITE_HOST',
  care: 'STRIPE_PRICE_WEBSITE_CARE',
} as const

export const WEBSITE_HOSTING_PLANS = ['host', 'care'] as const
export type WebsiteHostingPlan = (typeof WEBSITE_HOSTING_PLANS)[number]

export const WEBSITE_HOSTING_META: Record<WebsiteHostingPlan, { label: string; chf: number; envKey: string }> = {
  host: { label: 'Hosting', chf: 19, envKey: WEBSITE_PRICE_ENV.host },
  care: { label: 'Care', chf: 49, envKey: WEBSITE_PRICE_ENV.care },
}

export function isWebsiteHostingPlan(plan: string | null | undefined): plan is WebsiteHostingPlan {
  return plan === 'host' || plan === 'care'
}

export function websiteSubscriptionPlanId(hosting: WebsiteHostingPlan): 'website_host' | 'website_care' {
  return hosting === 'care' ? 'website_care' : 'website_host'
}

export type WebsiteBillingInfo = {
  website_only?: boolean | null
  website_hosting_plan?: string | null
  website_setup_paid_at?: string | null
  trial_ends_at?: string | null
}

export function isWebsiteHostingLocked(info: WebsiteBillingInfo | null | undefined): boolean {
  if (!info?.website_only) return false
  if (isWebsiteHostingPlan(info.website_hosting_plan)) return false
  if (!info.trial_ends_at) return false
  return Date.now() > new Date(info.trial_ends_at).getTime()
}

export function isWebsiteSetupPaid(info: WebsiteBillingInfo | null | undefined): boolean {
  return !!info?.website_setup_paid_at
}

/** Website-only: live publish needs setup fee + hosting. Preview stays free. */
export function websitePublishBlockedReason(
  tenant: WebsiteBillingInfo | null | undefined,
): 'hosting' | 'setup' | null {
  if (!tenant?.website_only) return null
  if (!tenant.website_setup_paid_at) return 'setup'
  if (!isWebsiteHostingPlan(tenant.website_hosting_plan)) return 'hosting'
  return null
}

export function websitePublishBlockedMessage(reason: 'hosting' | 'setup'): string {
  return reason === 'hosting'
    ? 'Hosting-Abo erforderlich, bevor die Website live geht.'
    : 'Die einmalige Website-Gebühr ist fällig, bevor die Homepage live geht.'
}

/** When hosting is locked, only billing + profile stay open. */
export function isWebsiteLockedAllowedAdminPath(path: string): boolean {
  const p = path.split('?')[0] || path
  return p === '/admin/billing' || p.startsWith('/admin/billing/')
    || p === '/admin/profile' || p.startsWith('/admin/profile/')
}
