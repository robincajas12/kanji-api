const express = require('express');
const fs = require('fs');
const path = require('path');

const cors = require('cors');

const app = express();
app.use(cors());
const port = 3001;

// Lee y parsea el archivo kanji.json
const kanjiData = JSON.parse(fs.readFileSync(path.join(__dirname, 'kanji.json'), 'utf8'));

// Endpoint para obtener datos de un kanji específico
app.get('/kanji/:kanji', (req, res) => {
  const requestedKanji = req.params.kanji;
  const kanjiInfo = kanjiData.find(k => k.kanji === requestedKanji);

  if (kanjiInfo) {
    res.json(kanjiInfo);
  } else {
    res.status(404).json({ error: 'Kanji not found' });
  }
});

// Inicia el servidor
app.listen(port, () => {
  console.log(`Kanji API listening at http://localhost:${port}`);
});