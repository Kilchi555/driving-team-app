// server/api/drafts/autosave.post.ts
/**
 * ✅ GENERIC AUTO-SAVE API ENDPOINT
 * 
 * Handles auto-save drafts for ANY table in the application
 * - Upsert draft records
 * - Load drafts
 * - Delete drafts
 * - Clean expired drafts
 * 
 * This replaces all direct table access in useAutoSave.ts
 */

import { getSupabaseAdmin } from '~/utils/supabase'
import { logger } from '~/utils/logger'
import { getHeader } from 'h3'

interface AutoSaveBody {
  action: 'save' | 'load' | 'delete' | 'finalize' | 'clean-expired'
  tableName?: string
  formId?: string
  draftId?: string
  data?: any
  recordId?: string
  draftExpiryDays?: number
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody<AutoSaveBody>(event)
    const { action, tableName, formId } = body

    logger.debug('💾 Auto-save action:', action)

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

    // ========== SAVE DRAFT ==========
    if (action === 'save') {
      if (!tableName || !formId || !body.data) {
        throw new Error('tableName, formId, and data required')
      }

      logger.debug('💾 Saving draft:', { tableName, formId })

      // Use upsert for auto-save (insert if new, update if exists)
      const { data, error } = await supabaseAdmin
        .from('form_drafts')
        .upsert({
          table_name: tableName,
          form_id: formId,
          user_id: user.id,
          data: body.data,
          record_id: body.recordId || null,
          saved_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,table_name,form_id'
        })
        .select()
        .single()

      if (error) {
        throw new Error(error.message)
      }

      logger.debug('✅ Draft saved:', data.id)

      return {
        success: true,
        draftId: data.id
      }
    }

    // ========== LOAD DRAFT ==========
    if (action === 'load') {
      if (!tableName || !formId) {
        throw new Error('tableName and formId required')
      }

      logger.debug('📂 Loading draft:', { tableName, formId })

      const { data, error } = await supabaseAdmin
        .from('form_drafts')
        .select('*')
        .eq('table_name', tableName)
        .eq('form_id', formId)
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw new Error(error.message)
      }

      logger.debug('✅ Draft loaded:', data ? 'found' : 'not found')

      return {
        success: true,
        draft: data || null
      }
    }

    // ========== DELETE DRAFT ==========
    if (action === 'delete') {
      if (!body.draftId) {
        throw new Error('draftId required')
      }

      logger.debug('🗑️ Deleting draft:', body.draftId)

      const { error } = await supabaseAdmin
        .from('form_drafts')
        .delete()
        .eq('id', body.draftId)
        .eq('user_id', user.id)

      if (error) {
        throw new Error(error.message)
      }

      logger.debug('✅ Draft deleted')

      return {
        success: true
      }
    }

    // ========== FINALIZE (Convert draft to record) ==========
    if (action === 'finalize') {
      if (!tableName || !body.draftId) {
        throw new Error('tableName and draftId required')
      }

      logger.debug('✅ Finalizing draft:', body.draftId)

      // Get the draft
      const { data: draft, error: draftError } = await supabaseAdmin
        .from('form_drafts')
        .select('*')
        .eq('id', body.draftId)
        .eq('user_id', user.id)
        .single()

      if (draftError || !draft) {
        throw new Error('Draft not found')
      }

      // If recordId exists, update. Otherwise insert new.
      let result
      if (draft.record_id) {
        // Update existing
        result = await supabaseAdmin
          .from(tableName)
          .update({
            ...draft.data,
            updated_at: new Date().toISOString()
          })
          .eq('id', draft.record_id)
          .select()
          .single()
      } else {
        // Insert new
        result = await supabaseAdmin
          .from(tableName)
          .insert({
            ...draft.data,
            created_at: new Date().toISOString()
          })
          .select()
          .single()
      }

      if (result.error) {
        throw new Error(result.error.message)
      }

      // Delete the draft
      await supabaseAdmin
        .from('form_drafts')
        .delete()
        .eq('id', body.draftId)

      logger.debug('✅ Draft finalized as record')

      return {
        success: true,
        record: result.data
      }
    }

    // ========== CLEAN EXPIRED ==========
    if (action === 'clean-expired') {
      const expiryDays = body.draftExpiryDays || 7
      const expiryDate = new Date()
      expiryDate.setDate(expiryDate.getDate() - expiryDays)

      logger.debug('🧹 Cleaning expired drafts older than:', expiryDate.toISOString())

      const { count, error } = await supabaseAdmin
        .from('form_drafts')
        .delete()
        .lt('saved_at', expiryDate.toISOString())

      if (error) {
        throw new Error(error.message)
      }

      logger.debug('✅ Expired drafts cleaned:', count)

      return {
        success: true,
        deletedCount: count
      }
    }

    throw new Error('Unknown action: ' + action)

  } catch (error: any) {
    logger.error('❌ Error in auto-save:', error)
    throw createError({
      statusCode: 400,
      statusMessage: error.message || 'Failed to auto-save'
    })
  }
})
