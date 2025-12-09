// Debug Document Upload - FIXED VERSION
// Run in browser console on the driving team app page

async function debugDocumentUpload() {
  logger.debug('🔍 Debugging document upload...');
  
  try {
    // Try multiple ways to get Supabase client
    let supabase;
    
    // Method 1: Check if there's a global getSupabase function
    if (typeof getSupabase !== 'undefined') {
      supabase = getSupabase();
      logger.debug('✅ Found supabase via getSupabase()');
    }
    // Method 2: Check window object
    else if (window.getSupabase) {
      supabase = window.getSupabase();
      logger.debug('✅ Found supabase via window.getSupabase()');
    }
    // Method 3: Check Nuxt instance
    else if (window.$nuxt && window.$nuxt.$supabase) {
      supabase = window.$nuxt.$supabase;
      logger.debug('✅ Found supabase via window.$nuxt.$supabase');
    }
    // Method 4: Check Vue app instance
    else if (window.__NUXT__ && window.__NUXT__.ssrContext) {
      logger.debug('❌ SSR context found, try refreshing page');
      return;
    }
    else {
      console.error('❌ Supabase client not found. Available objects:');
      logger.debug('window keys:', Object.keys(window).filter(k => k.includes('supabase') || k.includes('Supabase')));
      logger.debug('window.$nuxt:', window.$nuxt);
      return;
    }
    
    if (!supabase) {
      console.error('❌ Supabase client is null');
      return;
    }
    
    logger.debug('✅ Supabase client found');
    
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
    
    logger.debug('✅ Current user:', user.email, 'Role:', user.user_metadata?.role);
    
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
    
    const { data: updateData, error: updateError } = await supabase
      .from('users')
      .update({ lernfahrausweis_url: testUrl })
      .eq('id', hansId)
      .select();
    
    if (updateError) {
      console.error('❌ Update failed:', updateError);
      console.error('❌ Error details:', {
        message: updateError.message,
        code: updateError.code,
        details: updateError.details,
        hint: updateError.hint
      });
      logger.debug('🔍 This is likely an RLS policy issue!');
      return;
    }
    
    logger.debug('✅ Update successful!', updateData);
    
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
    console.error('❌ Error stack:', error.stack);
  }
}

// Run the debug
debugDocumentUpload();




















