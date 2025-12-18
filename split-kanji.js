import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outputDir = path.join(__dirname, 'kanjis');
const inputFile = path.join(__dirname, 'kanji.json');

async function splitKanjiJson() {
  // 1. Crear el directorio si no existe
  await fs.mkdir(outputDir, { recursive: true });

  // 2. Leer kanji.json
  const data = await fs.readFile(inputFile, 'utf8');

  // 3. Parsear JSON
  const kanjiList = JSON.parse(data);

  let count = 0;

  // 4. Crear un archivo por kanji
  for (const kanjiData of kanjiList) {
    if (kanjiData.kanji?.trim().length === 1) {
      const kanjiChar = kanjiData.kanji;
      const filePath = path.join(outputDir, `${kanjiChar}.json`);

      await fs.writeFile(
        filePath,
        JSON.stringify(kanjiData, null, 2),
        'utf8'
      );

      count++;
    }
  }

  console.log(
    `Se crearon ${count} archivos JSON de kanjis individuales en '${outputDir}'.`
  );
}

splitKanjiJson().catch(err => {
  console.error('Error procesando kanjis:', err);
});
