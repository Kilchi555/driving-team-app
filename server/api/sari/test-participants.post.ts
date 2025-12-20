/**
 * Test endpoint to check if SARI returns participants for a specific course
 */
import { defineEventHandler, readBody } from 'h3'
import { getSupabaseServerWithSession } from '~/utils/supabase'
import { SARIClient } from '~/utils/sariClient'

export default defineEventHandler(async (event) => {
  try {
    // Authenticate
    const { supabase, session } = await getSupabaseServerWithSession(event)
    if (!session) {
      throw new Error('Not authenticated')
    }

    // Get current user's tenant
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('auth_user_id', session.user.id)
      .eq('is_active', true)
      .single()

    if (userError || !userData?.tenant_id) {
      throw new Error('Could not find user tenant')
    }

    const tenantId = userData.tenant_id

    // Get request body
    const { sariCourseId } = await readBody(event)
    
    if (!sariCourseId) {
      throw new Error('sariCourseId is required')
    }

    // Get tenant's SARI config
    const { data: config, error: configError } = await supabase
      .from('tenants')
      .select('sari_config')
      .eq('id', tenantId)
      .single()

    if (configError || !config?.sari_config) {
      throw new Error('SARI not configured for this tenant')
    }

    // Create SARI client
    const sariClient = new SARIClient(config.sari_config)

    // Test getCourseDetail
    console.log(`🧪 Testing SARI getCourseDetail for course ID: ${sariCourseId}`)
    const participants = await sariClient.getCourseDetail(sariCourseId)

    console.log(`📊 SARI returned ${participants.length} participants:`)
    console.log(JSON.stringify(participants, null, 2))

    // Try to get full customer data for first participant
    let customerDataTest = null
    if (participants.length > 0 && participants[0].faberid && participants[0].birthdate) {
      try {
        console.log(`🧪 Testing getCustomer for first participant: ${participants[0].faberid}`)
        customerDataTest = await sariClient.getCustomer(participants[0].faberid, participants[0].birthdate)
        console.log(`📊 Full customer data:`, JSON.stringify(customerDataTest, null, 2))
      } catch (err: any) {
        console.error(`❌ getCustomer failed:`, err.message)
        customerDataTest = { error: err.message }
      }
    }

    return {
      success: true,
      sariCourseId,
      participantsCount: participants.length,
      participants,
      customerDataTest
    }
  } catch (error: any) {
    console.error('❌ Test participants error:', error)
    return {
      success: false,
      error: error.message
    }
  }
})

