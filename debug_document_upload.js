// Debug Document Upload - Run in browser console
// This tests if the document upload and database update works

async function debugDocumentUpload() {
  logger.debug('🔍 Debugging document upload...');
  
  try {
    // Get Supabase client
    const supabase = window.getSupabase ? window.getSupabase() : window.$nuxt.$supabase;
    
    if (!supabase) {
      console.error('❌ Supabase client not found');
      return;
    }
    
    // Test 1: Check current user
    logger.debug('👤 Checking current user...');
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('❌ User error:', userError);
      return;
    }
    
    if (!user) {
      console.error('❌ No user logged in');
      return;
    }
    
    logger.debug('✅ Current user:', user.email);
    
    // Test 2: Try to read Hans Meier's record
    const hansId = '9cca023a-ab9d-4df1-ae9d-488bae2b8e15';
    logger.debug('📖 Reading Hans Meier record...');
    
    const { data: hansData, error: readError } = await supabase
      .from('users')
      .select('id, first_name, last_name, lernfahrausweis_url, tenant_id')
      .eq('id', hansId)
      .single();
    
    if (readError) {
      console.error('❌ Read error:', readError);
      return;
    }
    
    logger.debug('✅ Hans Meier data:', hansData);
    
    // Test 3: Try to update Hans Meier's lernfahrausweis_url
    logger.debug('📝 Testing database update...');
    const testUrl = `https://test-url-${Date.now()}.jpg`;
    
    const { error: updateError } = await supabase
      .from('users')
      .update({ lernfahrausweis_url: testUrl })
      .eq('id', hansId);
    
    if (updateError) {
      console.error('❌ Update failed:', updateError);
      logger.debug('🔍 This might be an RLS policy issue!');
      
      // Check RLS policies
      logger.debug('🔐 Checking RLS policies...');
      const { data: policies, error: policyError } = await supabase.rpc('get_policies');
      if (!policyError) {
        logger.debug('📋 Current RLS policies:', policies);
      }
      
      return;
    }
    
    logger.debug('✅ Update successful! Test URL:', testUrl);
    
    // Test 4: Verify the update worked
    const { data: verifyData, error: verifyError } = await supabase
      .from('users')
      .select('lernfahrausweis_url')
      .eq('id', hansId)
      .single();
    
    if (verifyError) {
      console.error('❌ Verify error:', verifyError);
      return;
    }
    
    logger.debug('✅ Verified update:', verifyData.lernfahrausweis_url);
    
    // Test 5: Clean up - reset to null
    await supabase
      .from('users')
      .update({ lernfahrausweis_url: null })
      .eq('id', hansId);
    
    logger.debug('🧹 Cleaned up test data');
    logger.debug('🎉 All tests passed! Upload should work.');
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

// Run the debug
debugDocumentUpload();




















