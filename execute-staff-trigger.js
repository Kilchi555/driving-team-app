// execute-staff-trigger.js
// Script to execute the staff cash register trigger creation

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
import dotenv from 'dotenv'
dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

// Create Supabase client with service role
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function executeSQLFile() {
  try {
    console.log('🔧 Loading SQL file...')
    
    // Read the SQL file
    const sqlContent = readFileSync(
      join(__dirname, 'database_trigger_auto_create_staff_cash.sql'), 
      'utf8'
    )
    
    console.log('📝 SQL content loaded, length:', sqlContent.length)
    
    // Split SQL into individual statements (simple split by semicolon + newline)
    const statements = sqlContent
      .split(';\n')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && !stmt.startsWith('--') && stmt !== '')
    
    console.log('📋 Found', statements.length, 'SQL statements')
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      if (statement.length < 10) continue // Skip very short statements
      
      console.log(`\n🔄 Executing statement ${i + 1}/${statements.length}...`)
      console.log('📝 Statement preview:', statement.substring(0, 100) + '...')
      
      try {
        const { data, error } = await supabase.rpc('exec_sql', { 
          sql_query: statement + ';' 
        })
        
        if (error) {
          console.error(`❌ Error in statement ${i + 1}:`, error.message)
          
          // Try direct query execution as fallback
          const { data: directData, error: directError } = await supabase
            .from('information_schema.tables')
            .select('*')
            .limit(1)
          
          if (directError) {
            console.error('❌ Direct query also failed:', directError)
            throw error
          } else {
            console.log('✅ Connection is working, but exec_sql RPC might not exist')
            console.log('💡 You may need to execute this SQL manually in Supabase Dashboard')
            break
          }
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`)
        }
      } catch (err) {
        console.error(`❌ Exception in statement ${i + 1}:`, err.message)
        
        // Continue with next statement for non-critical errors
        if (err.message.includes('already exists') || err.message.includes('does not exist')) {
          console.log('⚠️  Continuing with next statement...')
          continue
        } else {
          throw err
        }
      }
    }
    
    console.log('\n🎉 SQL execution completed!')
    
    // Test the trigger by checking existing staff
    console.log('\n🔍 Checking existing staff members...')
    const { data: staff, error: staffError } = await supabase
      .from('users')
      .select(`
        id, email, first_name, last_name, role, tenant_id,
        cash_balances(id, cash_register_id, current_balance_rappen)
      `)
      .eq('role', 'staff')
      .eq('is_active', true)
      .is('deleted_at', null)
    
    if (staffError) {
      console.error('❌ Error checking staff:', staffError)
    } else {
      console.log('👥 Found', staff?.length || 0, 'staff members')
      staff?.forEach(s => {
        console.log(`  - ${s.first_name} ${s.last_name} (${s.email})`, 
                   s.cash_balances?.length ? '✅ Has cash register' : '❌ No cash register')
      })
    }
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message)
    console.log('\n💡 Manual execution required:')
    console.log('1. Go to Supabase Dashboard > SQL Editor')
    console.log('2. Copy the content from database_trigger_auto_create_staff_cash.sql')
    console.log('3. Execute it manually')
    process.exit(1)
  }
}

// Run the script
executeSQLFile()



















