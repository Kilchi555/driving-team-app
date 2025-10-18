// execute-staff-trigger-simple.js
// Simple script to execute staff trigger creation via Supabase client

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables:')
  console.error('SUPABASE_URL:', supabaseUrl ? '✅' : '❌')
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅' : '❌')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkStaffWithoutCashRegisters() {
  console.log('🔍 Checking current staff situation...')
  
  // Check existing staff
  const { data: staff, error: staffError } = await supabase
    .from('users')
    .select('id, email, first_name, last_name, role, tenant_id')
    .eq('role', 'staff')
    .eq('is_active', true)
    .is('deleted_at', null)
  
  if (staffError) {
    console.error('❌ Error checking staff:', staffError)
    return
  }
  
  console.log(`👥 Found ${staff?.length || 0} staff members`)
  
  if (!staff || staff.length === 0) {
    console.log('ℹ️  No staff members found - trigger will work for future staff')
    return
  }
  
  // Check which staff have cash balances
  for (const staffMember of staff) {
    const { data: balance, error: balanceError } = await supabase
      .from('cash_balances')
      .select('id, cash_register_id')
      .eq('user_id', staffMember.id)
      .single()
    
    const hasRegister = !balanceError && balance?.cash_register_id
    const name = `${staffMember.first_name || ''} ${staffMember.last_name || ''}`.trim() || staffMember.email
    
    console.log(`  ${hasRegister ? '✅' : '❌'} ${name} (${staffMember.email})`)
  }
  
  return staff
}

async function manuallyCreateStaffRegisters() {
  console.log('\n🔧 Creating cash registers for existing staff...')
  
  // Get staff without cash registers
  const { data: staffWithoutRegisters, error } = await supabase
    .from('users')
    .select(`
      id, email, first_name, last_name, tenant_id,
      cash_balances!inner(id)
    `)
    .eq('role', 'staff')
    .eq('is_active', true)
    .is('deleted_at', null)
    .is('cash_balances.id', null)
  
  if (error) {
    console.error('❌ Error finding staff without registers:', error)
    return
  }
  
  console.log(`🔨 Found ${staffWithoutRegisters?.length || 0} staff without registers`)
  
  if (!staffWithoutRegisters || staffWithoutRegisters.length === 0) {
    console.log('✅ All staff already have cash registers!')
    return
  }
  
  // Create registers for each staff member
  for (const staff of staffWithoutRegisters) {
    const staffName = `${staff.first_name || ''} ${staff.last_name || ''}`.trim() || staff.email
    const registerName = `${staffName} - Persönliche Kasse`
    
    try {
      // Create cash register
      const { data: register, error: registerError } = await supabase
        .from('cash_registers')
        .insert({
          tenant_id: staff.tenant_id,
          name: registerName,
          description: `Automatisch erstellte persönliche Kasse für ${staffName}`,
          is_active: true
        })
        .select('id')
        .single()
      
      if (registerError) {
        console.error(`❌ Failed to create register for ${staffName}:`, registerError)
        continue
      }
      
      // Create cash balance
      const { error: balanceError } = await supabase
        .from('cash_balances')
        .insert({
          user_id: staff.id,
          tenant_id: staff.tenant_id,
          cash_register_id: register.id,
          current_balance_rappen: 0,
          last_transaction_at: new Date().toISOString()
        })
      
      if (balanceError) {
        console.error(`❌ Failed to create balance for ${staffName}:`, balanceError)
        continue
      }
      
      // Create initial movement
      const { error: movementError } = await supabase
        .from('cash_movements')
        .insert({
          user_id: staff.id,
          tenant_id: staff.tenant_id,
          cash_register_id: register.id,
          movement_type: 'system_init',
          amount_rappen: 0,
          description: `Automatische Kassen-Erstellung für ${staffName}`,
          created_by: staff.id
        })
      
      if (movementError) {
        console.log(`⚠️  Movement log failed for ${staffName}:`, movementError)
        // Not critical, continue
      }
      
      console.log(`✅ Created cash register for ${staffName}`)
      
    } catch (err) {
      console.error(`❌ Exception creating register for ${staffName}:`, err)
    }
  }
}

async function main() {
  console.log('🚀 Staff Cash Register Setup')
  console.log('============================\n')
  
  try {
    await checkStaffWithoutCashRegisters()
    await manuallyCreateStaffRegisters()
    
    console.log('\n🔍 Final verification...')
    await checkStaffWithoutCashRegisters()
    
    console.log('\n✅ Setup completed!')
    console.log('\n💡 Next steps:')
    console.log('1. The manual setup is complete for existing staff')
    console.log('2. For automatic creation of future staff registers, you need to:')
    console.log('   - Go to Supabase Dashboard > SQL Editor')
    console.log('   - Execute the trigger from database_trigger_auto_create_staff_cash.sql')
    console.log('   - Or implement staff creation through admin interface')
    
  } catch (error) {
    console.error('❌ Fatal error:', error)
  }
}

main()













