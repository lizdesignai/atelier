import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: 'As chaves SPOTIFY_CLIENT_ID e SPOTIFY_CLIENT_SECRET não estão configuradas no servidor.' },
      { status: 500 }
    );
  }

  try {
    // 1. Obter Access Token usando Client Credentials Flow
    const authResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64'),
      },
      body: 'grant_type=client_credentials',
    });

    if (!authResponse.ok) {
      const errorData = await authResponse.text();
      console.error('Erro na autenticação com o Spotify:', errorData);
      return NextResponse.json({ error: 'Falha ao autenticar com a API do Spotify' }, { status: 502 });
    }

    const { access_token } = await authResponse.json();

    // 2. Pesquisar músicas
    const searchResponse = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=5`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!searchResponse.ok) {
      return NextResponse.json({ error: 'Erro ao buscar faixas no Spotify' }, { status: 502 });
    }

    const data = await searchResponse.json();
    
    // Simplificando o payload para o frontend
    const tracks = data.tracks?.items.map((item: any) => ({
      id: item.id,
      name: item.name,
      artist: item.artists.map((a: any) => a.name).join(', '),
      albumArt: item.album.images[2]?.url || item.album.images[0]?.url, // Usa a menor imagem disponível
      url: item.external_urls.spotify
    })) || [];

    return NextResponse.json({ tracks });

  } catch (error) {
    console.error('Exceção inesperada no /api/spotify/search:', error);
    return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 });
  }
}
