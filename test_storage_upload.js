// Test Storage Upload - Run in browser console
// This tests if the Supabase Storage upload functionality works

async function testStorageUpload() {
  console.log('🧪 Testing Supabase Storage Upload...');
  
  try {
    // Get Supabase client
    const supabase = window.getSupabase ? window.getSupabase() : window.$nuxt.$supabase;
    
    if (!supabase) {
      console.error('❌ Supabase client not found');
      return;
    }
    
    // Test 1: Check if user-documents bucket exists
    console.log('📁 Checking user-documents bucket...');
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
    
    console.log('✅ user-documents bucket exists:', userDocsBucket);
    
    // Test 2: Create a test file
    const testContent = 'Test upload content';
    const testFile = new Blob([testContent], { type: 'text/plain' });
    const testFileName = `test_upload_${Date.now()}.txt`;
    
    console.log('📤 Testing upload with test file:', testFileName);
    
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
    
    console.log('✅ Upload test successful:', uploadData);
    
    // Test 3: Get public URL
    const { data: urlData } = supabase.storage
      .from('user-documents')
      .getPublicUrl(`test/${testFileName}`);
    
    console.log('✅ Public URL generated:', urlData.publicUrl);
    
    // Test 4: Clean up test file
    const { error: deleteError } = await supabase.storage
      .from('user-documents')
      .remove([`test/${testFileName}`]);
    
    if (deleteError) {
      console.warn('⚠️ Could not delete test file:', deleteError);
    } else {
      console.log('✅ Test file cleaned up');
    }
    
    console.log('🎉 Storage upload test completed successfully!');
    
  } catch (error) {
    console.error('❌ Storage test failed:', error);
  }
}

// Run the test
testStorageUpload();



















