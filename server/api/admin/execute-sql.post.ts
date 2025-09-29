// server/api/admin/execute-sql.post.ts
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  
  try {
    // Only allow admins to execute SQL
    const body = await readBody(event)
    const { sql, description } = body
    
    if (!sql) {
      throw createError({
        statusCode: 400,
        statusMessage: 'SQL query is required'
      })
    }
    
    // Create service role client for admin operations
    const supabase = createClient(
      config.public.supabaseUrl,
      config.supabaseServiceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
    
    console.log('🔧 Executing SQL:', description || 'Manual SQL execution')
    console.log('📝 Query:', sql.substring(0, 200) + '...')
    
    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })
    
    if (error) {
      console.error('❌ SQL execution error:', error)
      throw createError({
        statusCode: 500,
        statusMessage: `SQL execution failed: ${error.message}`
      })
    }
    
    console.log('✅ SQL executed successfully')
    
    return {
      success: true,
      description: description || 'SQL executed',
      result: data
    }
    
  } catch (err) {
    console.error('❌ API Error:', err)
    throw createError({
      statusCode: 500,
      statusMessage: err.message || 'Failed to execute SQL'
    })
  }
})




