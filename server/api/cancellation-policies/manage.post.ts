// server/api/cancellation-policies/manage.post.ts
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'
import { getHeader, defineEventHandler, readBody, createError } from 'h3'

interface ManageBody {
  action: 'list' | 'fetch-all' | 'create-policy' | 'update-policy' | 'delete-policy' | 'create-rule' | 'update-rule' | 'delete-rule' | 'set-default'
  appliesTo?: 'appointments' | 'courses'
  policyData?: any
  ruleData?: any
  policyId?: string
  ruleId?: string
  updates?: any
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody<ManageBody>(event)
    const { action, appliesTo, policyData, ruleData, policyId, ruleId, updates } = body

    logger.debug('📋 Cancellation policy action:', action)

    const supabaseAdmin = getSupabaseAdmin()
    const authorization = getHeader(event, 'authorization')
    const token = authorization?.replace('Bearer ', '')

    if (!token) {
      throw new Error('No authorization token')
    }

    // Get current user
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    // Get user profile for tenant_id
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('tenant_id, role')
      .eq('auth_user_id', user.id)
      .single()

    if (profileError || !userProfile?.tenant_id) {
      logger.error('❌ User profile not found:', { auth_user_id: user.id, profileError })
      throw new Error('User profile not found')
    }

    const tenantId = userProfile.tenant_id

    // ========== LIST POLICIES BY TYPE ==========
    if (action === 'list') {
      logger.debug('📋 Fetching policies by type:', appliesTo)

      let query = supabaseAdmin
        .from('cancellation_policies')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)

      if (appliesTo) {
        query = query.eq('applies_to', appliesTo)
      }

      let { data: policies, error: policiesError } = await query

      // ✅ Fallback: If no active policies, try to fetch any policies
      if (policiesError || !policies || policies.length === 0) {
        logger.debug('⚠️ No active policies found, trying to fetch any policies...')
        
        let fallbackQuery = supabaseAdmin
          .from('cancellation_policies')
          .select('*')
          .eq('tenant_id', tenantId)
        
        if (appliesTo) {
          fallbackQuery = fallbackQuery.eq('applies_to', appliesTo)
        }
        
        const { data: fallbackPolicies, error: fallbackError } = await fallbackQuery
        
        if (!fallbackError && fallbackPolicies && fallbackPolicies.length > 0) {
          logger.debug('✅ Found inactive policies, using them:', fallbackPolicies.length)
          policies = fallbackPolicies
        }
      }

      if (!policies || policies.length === 0) {
        logger.warn('⚠️ No policies found for tenant')
        return {
          success: true,
          data: []
        }
      }

      // Fetch rules for each policy
      const policiesWithRules = await Promise.all(
        (policies || []).map(async (policy) => {
          const { data: rules } = await supabaseAdmin
            .from('cancellation_rules')
            .select('*')
            .eq('policy_id', policy.id)
            .eq('tenant_id', tenantId)

          return { ...policy, rules: rules || [] }
        })
      )

      logger.debug('✅ Policies fetched:', policiesWithRules.length)

      return {
        success: true,
        data: policiesWithRules
      }
    }

    // ========== FETCH ALL POLICIES ==========
    if (action === 'fetch-all') {
      logger.debug('📋 Fetching ALL policies')

      // Only admins can fetch all
      if (userProfile.role !== 'admin') {
        throw new Error('Only admins can fetch all policies')
      }

      const { data: policies, error: policiesError } = await supabaseAdmin
        .from('cancellation_policies')
        .select('*')
        .eq('tenant_id', tenantId)

      if (policiesError) {
        throw new Error(policiesError.message)
      }

      // Fetch rules for each policy
      const policiesWithRules = await Promise.all(
        (policies || []).map(async (policy) => {
          const { data: rules } = await supabaseAdmin
            .from('cancellation_rules')
            .select('*')
            .eq('policy_id', policy.id)
            .eq('tenant_id', tenantId)

          return { ...policy, rules: rules || [] }
        })
      )

      logger.debug('✅ All policies fetched:', policiesWithRules.length)

      return {
        success: true,
        data: policiesWithRules
      }
    }

    // ========== CREATE POLICY ==========
    if (action === 'create-policy') {
      if (!policyData) {
        throw new Error('Policy data required')
      }

      logger.debug('➕ Creating cancellation policy')

      const { data, error: createError } = await supabaseAdmin
        .from('cancellation_policies')
        .insert([{
          ...policyData,
          tenant_id: tenantId,
          created_by: user.id
        }])
        .select()
        .single()

      if (createError) {
        throw new Error(createError.message)
      }

      logger.debug('✅ Policy created:', data.id)

      return {
        success: true,
        data
      }
    }

    // ========== UPDATE POLICY ==========
    if (action === 'update-policy') {
      if (!policyId || !updates) {
        throw new Error('Policy ID and updates required')
      }

      logger.debug('📝 Updating policy:', policyId)

      // Verify policy belongs to user's tenant
      const { data: existingPolicy, error: fetchError } = await supabaseAdmin
        .from('cancellation_policies')
        .select('tenant_id')
        .eq('id', policyId)
        .single()

      if (fetchError || existingPolicy?.tenant_id !== tenantId) {
        throw new Error('Policy not found or unauthorized')
      }

      const { data, error: updateError } = await supabaseAdmin
        .from('cancellation_policies')
        .update(updates)
        .eq('id', policyId)
        .select()
        .single()

      if (updateError) {
        throw new Error(updateError.message)
      }

      logger.debug('✅ Policy updated')

      return {
        success: true,
        data
      }
    }

    // ========== DELETE POLICY (soft delete) ==========
    if (action === 'delete-policy') {
      if (!policyId) {
        throw new Error('Policy ID required')
      }

      logger.debug('🗑️ Deleting policy:', policyId)

      // Verify policy belongs to user's tenant
      const { data: existingPolicy, error: fetchError } = await supabaseAdmin
        .from('cancellation_policies')
        .select('tenant_id')
        .eq('id', policyId)
        .single()

      if (fetchError || existingPolicy?.tenant_id !== tenantId) {
        throw new Error('Policy not found or unauthorized')
      }

      const { error: deleteError } = await supabaseAdmin
        .from('cancellation_policies')
        .update({ is_active: false })
        .eq('id', policyId)

      if (deleteError) {
        throw new Error(deleteError.message)
      }

      logger.debug('✅ Policy deleted (soft)')

      return {
        success: true,
        message: 'Policy deleted'
      }
    }

    // ========== CREATE RULE ==========
    if (action === 'create-rule') {
      if (!ruleData) {
        throw new Error('Rule data required')
      }

      logger.debug('➕ Creating cancellation rule')

      // Verify policy belongs to tenant
      const { data: policy, error: policyError } = await supabaseAdmin
        .from('cancellation_policies')
        .select('tenant_id')
        .eq('id', ruleData.policy_id)
        .single()

      if (policyError || policy?.tenant_id !== tenantId) {
        throw new Error('Policy not found or unauthorized')
      }

      const { data, error: createError } = await supabaseAdmin
        .from('cancellation_rules')
        .insert([{
          ...ruleData,
          tenant_id: tenantId
        }])
        .select()
        .single()

      if (createError) {
        throw new Error(createError.message)
      }

      logger.debug('✅ Rule created:', data.id)

      return {
        success: true,
        data
      }
    }

    // ========== UPDATE RULE ==========
    if (action === 'update-rule') {
      if (!ruleId || !updates) {
        throw new Error('Rule ID and updates required')
      }

      logger.debug('📝 Updating rule:', ruleId)

      // Verify rule belongs to user's tenant
      const { data: existingRule, error: fetchError } = await supabaseAdmin
        .from('cancellation_rules')
        .select('tenant_id')
        .eq('id', ruleId)
        .single()

      if (fetchError || existingRule?.tenant_id !== tenantId) {
        throw new Error('Rule not found or unauthorized')
      }

      const { data, error: updateError } = await supabaseAdmin
        .from('cancellation_rules')
        .update(updates)
        .eq('id', ruleId)
        .select()
        .single()

      if (updateError) {
        throw new Error(updateError.message)
      }

      logger.debug('✅ Rule updated')

      return {
        success: true,
        data
      }
    }

    // ========== DELETE RULE ==========
    if (action === 'delete-rule') {
      if (!ruleId) {
        throw new Error('Rule ID required')
      }

      logger.debug('🗑️ Deleting rule:', ruleId)

      // Verify rule belongs to user's tenant
      const { data: existingRule, error: fetchError } = await supabaseAdmin
        .from('cancellation_rules')
        .select('tenant_id')
        .eq('id', ruleId)
        .single()

      if (fetchError || existingRule?.tenant_id !== tenantId) {
        throw new Error('Rule not found or unauthorized')
      }

      const { error: deleteError } = await supabaseAdmin
        .from('cancellation_rules')
        .delete()
        .eq('id', ruleId)

      if (deleteError) {
        throw new Error(deleteError.message)
      }

      logger.debug('✅ Rule deleted')

      return {
        success: true,
        message: 'Rule deleted'
      }
    }

    // ========== SET DEFAULT POLICY ==========
    if (action === 'set-default') {
      if (!policyId) {
        throw new Error('Policy ID required')
      }

      logger.debug('⭐ Setting default policy:', policyId)

      // Verify policy belongs to tenant
      const { data: policy, error: policyError } = await supabaseAdmin
        .from('cancellation_policies')
        .select('tenant_id')
        .eq('id', policyId)
        .single()

      if (policyError || policy?.tenant_id !== tenantId) {
        throw new Error('Policy not found or unauthorized')
      }

      // Unset all other defaults for this tenant
      await supabaseAdmin
        .from('cancellation_policies')
        .update({ is_default: false })
        .eq('tenant_id', tenantId)

      // Set this one as default
      const { data, error: setError } = await supabaseAdmin
        .from('cancellation_policies')
        .update({ is_default: true })
        .eq('id', policyId)
        .select()
        .single()

      if (setError) {
        throw new Error(setError.message)
      }

      logger.debug('✅ Default policy set')

      return {
        success: true,
        data
      }
    }

    throw new Error('Unknown action: ' + action)

  } catch (error: any) {
    logger.error('❌ Error in manage:', error)
    throw createError({
      statusCode: 400,
      statusMessage: error.message || 'Failed to manage cancellation policies'
    })
  }
})
