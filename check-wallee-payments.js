#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://unyjaetebnaexaflpyoc.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkWalleePayments() {
  console.log('🔍 Searching for completed Wallee payments with missing transaction IDs...\n');
  
  const { data: payments, error } = await supabase
    .from('payments')
    .select(`
      id,
      user_id,
      tenant_id,
      payment_status,
      payment_method,
      wallee_transaction_id,
      total_amount_rappen,
      paid_at,
      created_at,
      description
    `)
    .eq('payment_status', 'completed')
    .eq('payment_method', 'wallee')
    .or('wallee_transaction_id.is.null,wallee_transaction_id.eq.');

  if (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }

  if (!payments || payments.length === 0) {
    console.log('✅ No completed Wallee payments found with missing transaction IDs');
    return;
  }

  console.log(`⚠️ Found ${payments.length} completed Wallee payments with missing transaction IDs:\n`);
  
  payments.forEach((p, i) => {
    console.log(`${i + 1}. Payment ID: ${p.id}`);
    console.log(`   Amount: CHF ${(p.total_amount_rappen / 100).toFixed(2)}`);
    console.log(`   Paid at: ${p.paid_at}`);
    console.log(`   Created: ${p.created_at}`);
    console.log(`   Description: ${p.description}`);
    console.log(`   Transaction ID: ${p.wallee_transaction_id || 'MISSING ❌'}`);
    console.log('');
  });

  console.log(`\n📊 Summary:`);
  console.log(`   Total affected payments: ${payments.length}`);
  console.log(`   Total amount: CHF ${(payments.reduce((sum, p) => sum + p.total_amount_rappen, 0) / 100).toFixed(2)}`);
}

checkWalleePayments().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
