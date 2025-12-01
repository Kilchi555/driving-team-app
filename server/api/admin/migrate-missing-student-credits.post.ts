// server/api/admin/migrate-missing-student-credits.post.ts
// ✅ Admin endpoint to create missing student_credits records for existing users

import { defineEventHandler, createError } from 'h3'
import { getSupabaseAdmin } from '~/utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const supabase = getSupabaseAdmin()
    
    console.log('🔍 Starting migration: Creating missing student_credits records...')
    
    // Find all client users without student_credits
    const { data: usersWithoutCredits, error: usersError } = await supabase
      .from('users')
      .select('id, tenant_id, email, role')
      .eq('role', 'client')
    
    if (usersError) {
      console.error('❌ Error fetching users:', usersError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch users'
      })
    }
    
    console.log(`📊 Found ${usersWithoutCredits?.length || 0} client users`)
    
    let createdCount = 0
    let skippedCount = 0
    
    if (usersWithoutCredits && usersWithoutCredits.length > 0) {
      // Check which ones already have student_credits
      const { data: existingCredits, error: creditsError } = await supabase
        .from('student_credits')
        .select('user_id')
      
      if (creditsError) {
        console.error('❌ Error fetching student_credits:', creditsError)
        throw createError({
          statusCode: 500,
          statusMessage: 'Failed to fetch student_credits'
        })
      }
      
      const existingUserIds = new Set(existingCredits?.map(c => c.user_id) || [])
      const usersNeedingCredits = usersWithoutCredits.filter(u => !existingUserIds.has(u.id))
      
      console.log(`✅ ${usersNeedingCredits.length} users need student_credits records`)
      
      // Create student_credits for each missing user
      for (const user of usersNeedingCredits) {
        const { error: insertError } = await supabase
          .from('student_credits')
          .insert({
            user_id: user.id,
            tenant_id: user.tenant_id,
            balance_rappen: 0,
            notes: 'Auto-created via migration for existing user'
          })
        
        if (insertError) {
          console.warn(`⚠️ Failed to create student_credits for user ${user.email}:`, insertError)
          skippedCount++
        } else {
          console.log(`✅ Created student_credits for: ${user.email}`)
          createdCount++
        }
      }
    }
    
    console.log(`🎉 Migration complete: Created ${createdCount}, Skipped ${skippedCount}`)
    
    return {
      success: true,
      message: `Migration complete: Created ${createdCount} student_credits records`,
      created: createdCount,
      skipped: skippedCount,
      totalUsers: usersWithoutCredits?.length || 0
    }
    
  } catch (error: any) {
    console.error('❌ Migration error:', error)
    
    if (error.statusCode) {
      throw error
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Migration failed: ' + error.message
    })
  }
})

