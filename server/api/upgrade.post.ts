// server/api/upgrade.post.ts
import { getSupabaseAdmin } from '~/utils/supabase'

export default defineEventHandler(async (event) => {
  const requestId = Math.random().toString(36).substr(2, 9)
  console.log(`🚀 [${requestId}] Upgrade request started`)
  
  try {
    const body = await readBody(event)
    console.log(`📋 [${requestId}] Upgrade request:`, body)
    
    const { plan, paymentMethod } = body
    
    if (!plan) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Plan ist erforderlich'
      })
    }
    
    // Validierung der verfügbaren Pläne
    const availablePlans = ['basic', 'professional', 'enterprise']
    if (!availablePlans.includes(plan)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Ungültiger Plan'
      })
    }
    
    const supabase = getSupabaseAdmin()
    
    // Tenant-ID aus Headers oder Session holen
    const tenantId = getHeader(event, 'x-tenant-id')
    if (!tenantId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Tenant-ID erforderlich'
      })
    }
    
    // Plan-Preise definieren
    const planPrices = {
      basic: 2900, // 29.00 CHF in Rappen
      professional: 5900, // 59.00 CHF in Rappen
      enterprise: 9900 // 99.00 CHF in Rappen
    }
    
    const amount = planPrices[plan as keyof typeof planPrices]
    
    console.log(`💰 [${requestId}] Upgrading to ${plan} plan (${amount} Rappen)`)
    
    // Hier würde die Wallee Payment Integration kommen
    // Für jetzt simulieren wir den Zahlungsprozess
    console.log(`💳 [${requestId}] Processing payment for ${amount} Rappen...`)
    
    // Simuliere Zahlungsverarbeitung
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Tenant in Datenbank updaten
    const { data: updatedTenant, error: updateError } = await supabase
      .from('tenants')
      .update({
        subscription_plan: plan,
        subscription_status: 'active',
        is_trial: false,
        trial_ends_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', tenantId)
      .select()
      .single()
    
    if (updateError) {
      console.error(`❌ [${requestId}] Tenant update failed:`, updateError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Upgrade fehlgeschlagen'
      })
    }
    
    console.log(`✅ [${requestId}] Tenant upgraded successfully:`, updatedTenant.name)
    
    return {
      success: true,
      tenant: {
        id: updatedTenant.id,
        name: updatedTenant.name,
        subscription_plan: updatedTenant.subscription_plan,
        subscription_status: updatedTenant.subscription_status,
        is_trial: updatedTenant.is_trial
      },
      requestId
    }
    
  } catch (error: any) {
    console.error(`❌ [${requestId}] Upgrade error:`, error)
    
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || error.message || 'Upgrade fehlgeschlagen'
    })
  }
})


