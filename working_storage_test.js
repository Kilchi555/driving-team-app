// Working Storage Test - Copy and paste this into browser console on your app page
// Make sure you're on a page like http://localhost:3000/register or similar

(async function testStorage() {
  try {
    logger.debug('🧪 Testing Supabase Storage access...');
    
    // Import getSupabase from utils
    const { getSupabase } = await import('/utils/supabase.ts');
    const supabase = getSupabase();
    
    logger.debug('✅ Supabase client initialized');
    
    // Test 1: List buckets
    logger.debug('📦 Testing bucket access...');
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    
    if (bucketError) {
      console.error('❌ Storage error:', bucketError);
      return;
    }
    
    logger.debug('✅ Available buckets:', buckets.map(b => b.name));
    
    // Test 2: Check user-documents bucket
    const hasUserDocs = buckets.find(b => b.name === 'user-documents');
    if (hasUserDocs) {
      logger.debug('✅ user-documents bucket found!');
      
      // Test 3: Try to list files in lernfahrausweise folder
      logger.debug('📁 Testing lernfahrausweise folder...');
      const { data: files, error: listError } = await supabase.storage
        .from('user-documents')
        .list('lernfahrausweise', { limit: 5 });
      
      if (listError) {
        logger.debug('ℹ️ Lernfahrausweise folder might not exist yet:', listError.message);
      } else {
        logger.debug('✅ Lernfahrausweise folder accessible, files:', files?.length || 0);
      }
    } else {
      console.error('❌ user-documents bucket missing');
    }
    
    logger.debug('✅ Storage test completed!');
    
  } catch (error) {
    console.error('❌ Storage test failed:', error);
    
    // Fallback: Try direct access if getSupabase is globally available
    if (typeof window !== 'undefined' && window.getSupabase) {
      logger.debug('🔄 Trying fallback method...');
      const supabase = window.getSupabase();
      const result = await supabase.storage.listBuckets();
      if (result.error) {
        console.error('❌ Fallback failed:', result.error);
      } else {
        logger.debug('✅ Fallback successful, buckets:', result.data.map(b => b.name));
      }
    }
  }
})();




















