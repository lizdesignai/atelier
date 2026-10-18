const fs = require('fs');

async function testStorage() {
  const testBuffer = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><circle cx="50" cy="50" r="40" fill="#a45a33"/></svg>');
  const blob = new Blob([testBuffer], { type: 'image/svg+xml' });
  const formData = new FormData();
  formData.append('bucket', 'avatars');
  formData.append('path', 'test_neon_upload.svg');
  formData.append('file', blob, 'test_neon_upload.svg');

  console.log('Testing upload to http://localhost:3000/api/storage/upload...');
  const res = await fetch('http://localhost:3000/api/storage/upload', {
    method: 'POST',
    body: formData
  });

  const uploadResult = await res.json();
  console.log('Upload response status:', res.status, uploadResult);

  if (uploadResult.data?.publicUrl) {
    const fetchUrl = `http://localhost:3000${uploadResult.data.publicUrl}`;
    console.log('Fetching uploaded file from:', fetchUrl);
    const getRes = await fetch(fetchUrl);
    console.log('Get file status:', getRes.status, 'Content-Type:', getRes.headers.get('content-type'));
    const text = await getRes.text();
    console.log('Fetched content length:', text.length, 'Content preview:', text.substring(0, 50));
  }

  // Check Neon DB directly
  const { neon } = require('./node_modules/@neondatabase/serverless');
  require('dotenv').config({ path: '.env.local' });
  const sql = neon(process.env.POSTGRES_URL);
  const rows = await sql`SELECT id, bucket_name, file_name, mime_type, size FROM storage_objects WHERE file_name = 'test_neon_upload.svg'`;
  console.log('Neon storage_objects row:', rows);
}

testStorage().catch(console.error);
