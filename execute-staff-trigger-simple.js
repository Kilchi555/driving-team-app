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
  logger.debug('🔍 Checking current staff situation...')
  
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
  
  logger.debug(`👥 Found ${staff?.length || 0} staff members`)
  
  if (!staff || staff.length === 0) {
    logger.debug('ℹ️  No staff members found - trigger will work for future staff')
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
    
    logger.debug(`  ${hasRegister ? '✅' : '❌'} ${name} (${staffMember.email})`)
  }
  
  return staff
}

async function manuallyCreateStaffRegisters() {
  logger.debug('\n🔧 Creating cash registers for existing staff...')
  
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
  
  logger.debug(`🔨 Found ${staffWithoutRegisters?.length || 0} staff without registers`)
  
  if (!staffWithoutRegisters || staffWithoutRegisters.length === 0) {
    logger.debug('✅ All staff already have cash registers!')
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
        logger.debug(`⚠️  Movement log failed for ${staffName}:`, movementError)
        // Not critical, continue
      }
      
      logger.debug(`✅ Created cash register for ${staffName}`)
      
    } catch (err) {
      console.error(`❌ Exception creating register for ${staffName}:`, err)
    }
  }
}

async function main() {
  logger.debug('🚀 Staff Cash Register Setup')
  logger.debug('============================\n')
  
  try {
    await checkStaffWithoutCashRegisters()
    await manuallyCreateStaffRegisters()
    
    logger.debug('\n🔍 Final verification...')
    await checkStaffWithoutCashRegisters()
    
    logger.debug('\n✅ Setup completed!')
    logger.debug('\n💡 Next steps:')
    logger.debug('1. The manual setup is complete for existing staff')
    logger.debug('2. For automatic creation of future staff registers, you need to:')
    logger.debug('   - Go to Supabase Dashboard > SQL Editor')
    logger.debug('   - Execute the trigger from database_trigger_auto_create_staff_cash.sql')
    logger.debug('   - Or implement staff creation through admin interface')
    
  } catch (error) {
    console.error('❌ Fatal error:', error)
  }
}

main()





















