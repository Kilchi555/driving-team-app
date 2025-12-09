// Test Storage Upload - Run in browser console
// This tests if the Supabase Storage upload functionality works

async function testStorageUpload() {
  logger.debug('🧪 Testing Supabase Storage Upload...');
  
  try {
    // Get Supabase client
    const supabase = window.getSupabase ? window.getSupabase() : window.$nuxt.$supabase;
    
    if (!supabase) {
      console.error('❌ Supabase client not found');
      return;
    }
    
    // Test 1: Check if user-documents bucket exists
    logger.debug('📁 Checking user-documents bucket...');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('❌ Error listing buckets:', bucketsError);
      return;
    }
    
    const userDocsBucket = buckets.find(bucket => bucket.name === 'user-documents');
    if (!userDocsBucket) {
      console.error('❌ user-documents bucket not found. Available buckets:', buckets.map(b => b.name));
      return;
    }
    
    logger.debug('✅ user-documents bucket exists:', userDocsBucket);
    
    // Test 2: Create a test file
    const testContent = 'Test upload content';
    const testFile = new Blob([testContent], { type: 'text/plain' });
    const testFileName = `test_upload_${Date.now()}.txt`;
    
    logger.debug('📤 Testing upload with test file:', testFileName);
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('user-documents')
      .upload(`test/${testFileName}`, testFile, {
        cacheControl: '3600',
        upsert: true
      });
    
    if (uploadError) {
      console.error('❌ Upload test failed:', uploadError);
      return;
    }
    
    logger.debug('✅ Upload test successful:', uploadData);
    
    // Test 3: Get public URL
    const { data: urlData } = supabase.storage
      .from('user-documents')
      .getPublicUrl(`test/${testFileName}`);
    
    logger.debug('✅ Public URL generated:', urlData.publicUrl);
    
    // Test 4: Clean up test file
    const { error: deleteError } = await supabase.storage
      .from('user-documents')
      .remove([`test/${testFileName}`]);
    
    if (deleteError) {
      console.warn('⚠️ Could not delete test file:', deleteError);
    } else {
      logger.debug('✅ Test file cleaned up');
    }
    
    logger.debug('🎉 Storage upload test completed successfully!');
    
  } catch (error) {
    console.error('❌ Storage test failed:', error);
  }
}

// Run the test
testStorageUpload();




















