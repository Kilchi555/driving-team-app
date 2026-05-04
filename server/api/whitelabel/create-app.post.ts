// server/api/whitelabel/create-app.post.ts
// Triggered when a new tenant activates white-label app tier.
// 1. Validates the request and checks admin permissions
// 2. Creates the client config in Supabase (app_configs table)
// 3. Triggers GitHub Actions workflow_dispatch for the build pipeline
//
// The GitHub Actions workflow then:
//   - Reads the config from Supabase
//   - Builds iOS + Android with the school's branding
//   - Uploads to TestFlight + Play Store internal track

import { createClient } from '@supabase/supabase-js'
import { getSupabaseServiceCredentials } from '~/server/utils/supabase-service-env'
import { getAuthenticatedUserWithDbId } from '~/server/utils/auth'

interface CreateAppBody {
  tenantId: string
}

export default defineEventHandler(async (event) => {
  // ─── Auth: only platform admins can trigger builds ────────────────────────
  const authUser = await getAuthenticatedUserWithDbId(event)
  if (!authUser || authUser.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Platform admin required' })
  }

  const body = await readBody<CreateAppBody>(event)
  if (!body?.tenantId) {
    throw createError({ statusCode: 400, statusMessage: 'tenantId required' })
  }

  const { supabaseUrl, supabaseServiceKey } = getSupabaseServiceCredentials(event)
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // ─── Load tenant data ─────────────────────────────────────────────────────
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('id, name, slug, primary_color, logo_square_url, domain, contact_email')
    .eq('id', body.tenantId)
    .single()

  if (tenantError || !tenant) {
    throw createError({ statusCode: 404, statusMessage: 'Tenant not found' })
  }

  const clientId = tenant.slug
  const bundleId = `ch.${clientId.replace(/-/g, '')}.app`

  const clientConfig = {
    clientId,
    appName: tenant.name,
    bundleId,
    tenantSlug: tenant.slug,
    tier: 'whitelabel',
    version: '1.0.0',
    primaryColor: tenant.primary_color || '#019ee5',
    backgroundColor: tenant.primary_color || '#019ee5',
    scheme: clientId,
    logoUrl: tenant.logo_square_url || null,
    ios: {
      provisioningProfile: `match AppStore ${bundleId}`,
      deploymentTarget: '16.0',
    },
    android: {
      keystoreAlias: clientId,
      minSdkVersion: 22,
      targetSdkVersion: 34,
    },
    store: {
      de: {
        name: tenant.name,
        subtitle: 'Fahrschule App',
        description: `Die offizielle App der ${tenant.name}. Buche Fahrstunden, verfolge deinen Lernfortschritt und kommuniziere mit deinem Fahrlehrer.`,
        keywords: 'fahrschule, fahrstunden, führerausweis',
      },
      en: {
        name: tenant.name,
        subtitle: 'Driving School App',
        description: `The official app of ${tenant.name}. Book lessons, track your progress and communicate with your instructor.`,
        keywords: 'driving school, lessons, licence',
      },
    },
    privacyPolicyUrl: `https://${tenant.domain || 'simy.ch'}/datenschutz`,
    supportUrl: `https://${tenant.domain || 'simy.ch'}/kontakt`,
    marketingUrl: `https://${tenant.domain || 'simy.ch'}`,
  }

  // ─── Upsert config into Supabase (app_configs table) ─────────────────────
  const { error: upsertError } = await supabase
    .from('app_configs')
    .upsert({
      tenant_id: body.tenantId,
      client_id: clientId,
      config: clientConfig,
      build_status: 'pending',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'tenant_id' })

  if (upsertError) {
    console.error('❌ app_configs upsert error:', upsertError.message)
    throw createError({ statusCode: 500, statusMessage: 'Failed to save app config' })
  }

  // ─── Trigger GitHub Actions workflow_dispatch ────────────────────────────
  const githubToken = process.env.GITHUB_PAT
  const githubRepo = process.env.GITHUB_REPO || 'Kilchi555/driving-team-app'

  if (!githubToken) {
    console.warn('⚠️  GITHUB_PAT not set — skipping GitHub Actions trigger')
    return { success: true, clientId, status: 'config_saved_no_build' }
  }

  const triggerResponse = await fetch(
    `https://api.github.com/repos/${githubRepo}/actions/workflows/build-whitelabel.yml/dispatches`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ref: 'main',
        inputs: { client: clientId },
      }),
    }
  )

  if (!triggerResponse.ok) {
    const errText = await triggerResponse.text()
    console.error('❌ GitHub Actions trigger failed:', errText)
    throw createError({ statusCode: 502, statusMessage: 'Failed to trigger build pipeline' })
  }

  // Update build status
  await supabase
    .from('app_configs')
    .update({ build_status: 'building', build_triggered_at: new Date().toISOString() })
    .eq('tenant_id', body.tenantId)

  return {
    success: true,
    clientId,
    bundleId,
    status: 'building',
    message: `Build triggered for ${tenant.name}. iOS: TestFlight in ~20 min. App Store: 1–3 days after Apple review.`,
  }
})
