
const fs = require('fs');
const path = require('path');

const outputDir = 'kanjis';
const inputFile = 'kanji.json';

// 1. Crear el directorio de salida si no existe
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

// 2. Leer el archivo principal kanji.json
fs.readFile(inputFile, 'utf8', (err, data) => {
  if (err) {
    console.error(`Error leyendo ${inputFile}:`, err);
    return;
  }

  // 3. Parsear los datos JSON
  const kanjiList = JSON.parse(data);

  let count = 0;
  // 4. Iterar sobre cada kanji y crear un archivo separado
  for (const kanjiData of kanjiList) {
    // Omitir entradas que no tengan un carácter kanji válido
    // (Esto limpia algunas entradas vacías o con texto que vi en tu JSON)
    if (kanjiData.kanji && kanjiData.kanji.trim().length === 1) {
      const kanjiChar = kanjiData.kanji;
      const fileName = `${kanjiChar}.json`;
      const filePath = path.join(outputDir, fileName);
      const fileContent = JSON.stringify(kanjiData, null, 2);

      fs.writeFile(filePath, fileContent, 'utf8', (writeErr) => {
        if (writeErr) {
          console.error(`Error escribiendo el archivo para ${kanjiChar}:`, writeErr);
        }
      });
      count++;
    }
  }
  console.log(`Se crearon ${count} archivos JSON de kanjis individuales en el directorio '${outputDir}'.`);
});
