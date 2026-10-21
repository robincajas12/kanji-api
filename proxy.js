import http from 'http';

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/kanji') {
    const kanji = url.searchParams.get('search');
    if (!kanji) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Falta el parámetro search' }));
    }
    try {
      const upstream = `https://kanji-api.toolzar.com/find?search=${encodeURIComponent(kanji)}&page=0`;
      const response = await fetch(upstream, {
        headers: { Origin: 'https://test.toolzar.com' }
      });
      const data = await response.json();
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify(data));
    } catch (err) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Error consultando la API upstream', detail: String(err) }));
    }
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Ruta no encontrada' }));
  }
});

server.listen(3000, () => console.log('Proxy corriendo en puerto 3000'));
