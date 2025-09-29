// Test Supabase Storage Access
// Run this in browser console on your app's page to test storage bucket access

async function testStorageAccess() {
  console.log('🧪 Testing Supabase Storage access...');
  
  try {
    // Check if Supabase is available (you need to be on your app's page)
    if (typeof window === 'undefined' || !window.getSupabase) {
      console.error('❌ Supabase not available. Make sure you run this on your app page.');
      return;
    }
    
    const supabase = window.getSupabase();
    
    // Test 1: List buckets
    console.log('📦 Testing bucket access...');
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    
    if (bucketError) {
      console.error('❌ Cannot access buckets:', bucketError);
      return;
    }
    
    console.log('✅ Available buckets:', buckets.map(b => b.name));
    
    // Test 2: Check user-documents bucket
    const userDocsBucket = buckets.find(b => b.name === 'user-documents');
    if (!userDocsBucket) {
      console.error('❌ user-documents bucket not found');
      return;
    }
    
    console.log('✅ user-documents bucket found:', userDocsBucket);
    
    // Test 3: Try to list files in bucket
    console.log('📁 Testing file listing...');
    const { data: files, error: listError } = await supabase.storage
      .from('user-documents')
      .list('lernfahrausweise', { limit: 5 });
    
    if (listError) {
      console.error('❌ Cannot list files:', listError);
    } else {
      console.log('✅ Files in lernfahrausweise folder:', files?.length || 0);
    }
    
    // Test 4: Create a test blob and try upload
    console.log('📸 Testing upload capability...');
    const testBlob = new Blob(['test data'], { type: 'text/plain' });
    const testFileName = `test_${Date.now()}.txt`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('user-documents')
      .upload(`test/${testFileName}`, testBlob, {
        cacheControl: '3600',
        upsert: true
      });
    
    if (uploadError) {
      console.error('❌ Upload test failed:', uploadError);
    } else {
      console.log('✅ Upload test successful:', uploadData.path);
      
      // Clean up test file
      await supabase.storage
        .from('user-documents')
        .remove([`test/${testFileName}`]);
      console.log('🧹 Test file cleaned up');
    }
    
    console.log('✅ Storage access test completed successfully!');
    
  } catch (error) {
    console.error('❌ Storage test failed:', error);
  }
}

// Run the test
testStorageAccess();
