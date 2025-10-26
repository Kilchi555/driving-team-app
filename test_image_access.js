// Test Image Access - Run in browser console
// This tests if the storage URL is accessible

async function testImageAccess() {
  console.log('🖼️ Testing image access...');
  
  const imageUrl = 'https://unyjaetebnaexaflpyoc.supabase.co/storage/v1/object/public/user-documents/lernfahrausweise/9cca023a-ab9d-4df1-ae9d-488bae2b8e15_lernfahrausweis_front_1758451801550.jpg';
  
  console.log('🔗 Testing URL:', imageUrl);
  
  try {
    // Test 1: Fetch the image
    console.log('📥 Fetching image...');
    const response = await fetch(imageUrl);
    
    console.log('📊 Response status:', response.status);
    console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      console.error('❌ Image fetch failed:', response.status, response.statusText);
      
      if (response.status === 403) {
        console.error('🔒 403 Forbidden - Storage bucket policy issue');
      } else if (response.status === 404) {
        console.error('🔍 404 Not Found - File does not exist');
      }
      
      return;
    }
    
    // Test 2: Check content type
    const contentType = response.headers.get('content-type');
    console.log('📄 Content type:', contentType);
    
    if (!contentType?.startsWith('image/')) {
      console.error('❌ Not an image file:', contentType);
      return;
    }
    
    // Test 3: Get blob size
    const blob = await response.blob();
    console.log('📦 Image size:', blob.size, 'bytes');
    
    // Test 4: Create test image element
    const img = new Image();
    img.onload = () => {
      console.log('✅ Image loaded successfully!');
      console.log('📏 Dimensions:', img.width, 'x', img.height);
    };
    img.onerror = () => {
      console.error('❌ Image element failed to load');
    };
    img.src = imageUrl;
    
    console.log('🎉 Image access test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Also test storage bucket access
async function testStorageBucket() {
  console.log('🪣 Testing storage bucket access...');
  
  try {
    const supabase = window.getSupabase ? window.getSupabase() : window.$nuxt.$supabase;
    
    if (!supabase) {
      console.error('❌ Supabase client not found');
      return;
    }
    
    // List files in the bucket
    const { data: files, error } = await supabase.storage
      .from('user-documents')
      .list('lernfahrausweise');
    
    if (error) {
      console.error('❌ Storage list error:', error);
      return;
    }
    
    console.log('📁 Files in lernfahrausweise folder:', files);
    
    // Check if our specific file exists
    const ourFile = files.find(f => f.name.includes('9cca023a-ab9d-4df1-ae9d-488bae2b8e15'));
    if (ourFile) {
      console.log('✅ Our file found:', ourFile);
    } else {
      console.error('❌ Our file not found in storage');
    }
    
  } catch (error) {
    console.error('❌ Storage test failed:', error);
  }
}

// Run both tests
testImageAccess();
testStorageBucket();



















