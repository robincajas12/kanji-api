import https from 'https';

const kanji = process.argv[2];
if (!kanji) {
  console.log('Uso: node kanji.js 犬');
  process.exit(1);
}

const url = `https://kanji-api.toolzar.com/find?search=${encodeURIComponent(kanji)}&page=0`;

https.get(url, { headers: { Origin: 'https://test.toolzar.com' } }, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    try {
      console.log(JSON.stringify(JSON.parse(body), null, 2));
    } catch {
      console.log(body);
    }
  });
}).on('error', (err) => console.error('Error:', err.message));
