// Debug Document Upload - FIXED VERSION
// Run in browser console on the driving team app page

async function debugDocumentUpload() {
  console.log('🔍 Debugging document upload...');
  
  try {
    // Try multiple ways to get Supabase client
    let supabase;
    
    // Method 1: Check if there's a global getSupabase function
    if (typeof getSupabase !== 'undefined') {
      supabase = getSupabase();
      console.log('✅ Found supabase via getSupabase()');
    }
    // Method 2: Check window object
    else if (window.getSupabase) {
      supabase = window.getSupabase();
      console.log('✅ Found supabase via window.getSupabase()');
    }
    // Method 3: Check Nuxt instance
    else if (window.$nuxt && window.$nuxt.$supabase) {
      supabase = window.$nuxt.$supabase;
      console.log('✅ Found supabase via window.$nuxt.$supabase');
    }
    // Method 4: Check Vue app instance
    else if (window.__NUXT__ && window.__NUXT__.ssrContext) {
      console.log('❌ SSR context found, try refreshing page');
      return;
    }
    else {
      console.error('❌ Supabase client not found. Available objects:');
      console.log('window keys:', Object.keys(window).filter(k => k.includes('supabase') || k.includes('Supabase')));
      console.log('window.$nuxt:', window.$nuxt);
      return;
    }
    
    if (!supabase) {
      console.error('❌ Supabase client is null');
      return;
    }
    
    console.log('✅ Supabase client found');
    
    // Test 1: Check current user
    console.log('👤 Checking current user...');
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('❌ User error:', userError);
      return;
    }
    
    if (!user) {
      console.error('❌ No user logged in');
      return;
    }
    
    console.log('✅ Current user:', user.email, 'Role:', user.user_metadata?.role);
    
    // Test 2: Try to read Hans Meier's record
    const hansId = '9cca023a-ab9d-4df1-ae9d-488bae2b8e15';
    console.log('📖 Reading Hans Meier record...');
    
    const { data: hansData, error: readError } = await supabase
      .from('users')
      .select('id, first_name, last_name, lernfahrausweis_url, tenant_id')
      .eq('id', hansId)
      .single();
    
    if (readError) {
      console.error('❌ Read error:', readError);
      return;
    }
    
    console.log('✅ Hans Meier data:', hansData);
    
    // Test 3: Try to update Hans Meier's lernfahrausweis_url
    console.log('📝 Testing database update...');
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
      console.log('🔍 This is likely an RLS policy issue!');
      return;
    }
    
    console.log('✅ Update successful!', updateData);
    
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
    
    console.log('✅ Verified update:', verifyData.lernfahrausweis_url);
    
    // Test 5: Clean up - reset to null
    await supabase
      .from('users')
      .update({ lernfahrausweis_url: null })
      .eq('id', hansId);
    
    console.log('🧹 Cleaned up test data');
    console.log('🎉 All tests passed! Upload should work.');
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
    console.error('❌ Error stack:', error.stack);
  }
}

// Run the debug
debugDocumentUpload();


















