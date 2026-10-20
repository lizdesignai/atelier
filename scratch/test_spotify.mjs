import fs from 'fs';

const envContent = fs.readFileSync('frontend/.env.local', 'utf8');
const clientId = envContent.match(/SPOTIFY_CLIENT_ID=["']?([^"'\r\n]+)/)[1];
const clientSecret = envContent.match(/SPOTIFY_CLIENT_SECRET=["']?([^"'\r\n]+)/)[1];

async function testSpotify() {
  const authResponse = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64'),
    },
    body: 'grant_type=client_credentials',
  });

  const authData = await authResponse.json();
  console.log('Spotify Auth status:', authResponse.status, authData.access_token ? 'TOKEN RECEIVED' : authData);

  if (authData.access_token) {
    const searchRes = await fetch('https://api.spotify.com/v1/search?q=coldplay&type=track&limit=2', {
      headers: { 'Authorization': `Bearer ${authData.access_token}` }
    });
    const searchData = await searchRes.json();
    console.log('Spotify Search Tracks:', searchData.tracks?.items?.map(t => ({ id: t.id, name: t.name, artist: t.artists[0]?.name })));
  }
}

testSpotify().catch(console.error);
