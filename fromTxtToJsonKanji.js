const fs = require('fs');
const { console } = require('inspector');
const path = require('path');

const inputFile = 'kanji.txt';
const outputFile = 'kanji.json';

function readFile(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function writeFile(filePath, data) {
  fs.writeFileSync(filePath, data, 'utf8');
}

function convertTxtToJson(input, output) {
  let data = readFile(input);
  // remove html
    data = data.replace(/<[^>]*>/g, '');
  const lines = data.split('\n').filter(line => line.trim() !== '');
  const result = lines.map(line => {
    const parts = line.split('\t').map(p => p.trim()).filter(Boolean);
    console.log(parts);
    // esperado: [kanji, meaning, grade, freq, jlpt]
    return {
      kanji: parts[0] || null,
      meanings: parts[1] ? [parts[1]] : [],
      grade: parts[2] ? parseInt(parts[2], 10) : null,
      freq_mainichi_shinbun: parts[3] ? parseInt(parts[3], 10) : null,
      jlpt: parts[4] ? parseInt(parts[4], 10) : null
    };
  });

  writeFile(output, JSON.stringify(result, null, 2));
}

convertTxtToJson(path.join(__dirname, inputFile), path.join(__dirname, outputFile));
