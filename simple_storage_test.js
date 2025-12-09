// Simple Storage Test - Copy and paste this into browser console on your app page

// Test if storage buckets are accessible
supabase.storage.listBuckets().then(result => {
  if (result.error) {
    console.error('❌ Storage error:', result.error);
  } else {
    logger.debug('✅ Available buckets:', result.data.map(b => b.name));
    const hasUserDocs = result.data.find(b => b.name === 'user-documents');
    if (hasUserDocs) {
      logger.debug('✅ user-documents bucket found!');
    } else {
      console.error('❌ user-documents bucket missing');
    }
  }
}).catch(err => {
  console.error('❌ Storage test failed:', err);
});




















