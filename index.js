import express from 'express';
import * as fs from 'fs'; // Use import * as fs for ES Modules
import { fileURLToPath } from 'url'; // Import fileURLToPath
import { dirname } from 'path'; // Import dirname
import * as path from 'path'; // Use import * as path for ES Modules
import cors from 'cors';
import { simple } from './GoogleAI.js'; // Import the simple AI function

// Re-introduce __filename and __dirname for ES Modules compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json()); // Middleware to parse JSON bodies
const port = 3000;

// List of conjugation types
const conjugationTypes = [
  // Basic/plain forms
  "plain present",          // 辞書形
  "plain past",             // た形
  "te-form",                // て形
  "plain present negative", // ない形
  "plain past negative",    // なかった形
  "plain volitional",       // よう形
  "imperative",             // 命令形

  // Polite forms
  "polite present",          // ます形
  "polite past",             // ました形
  "polite present negative", // ません形
  "polite past negative",    // ませんでした形
  "polite volitional",       // ましょう形
  "polite imperative",       // ください / 〜なさい

  // Conditional forms
  "conditional -eba",       // れば形
  "conditional -tara",      // たら形
  "conditional -nara",      // なら形
  "conditional -to",        // と形

  // Potential / ability
  "potential",              // 可能形

  // Passive / causative
  "passive",                // 受身形
  "causative",              // 使役形
  "causative-passive",      // 使役受身形

  // Provisional / hypothetical
  "provisional -ba",        // 仮定形 (also ば形)
  "conjectural / presumptive", // 推量形 〜だろう / 〜でしょう
  "tentative",              // 〜ようだ / 〜みたいだ
  "desiderative",           // 〜たい形

  // Honorific / humble
  "honorific",              // 尊敬語 召し上がる, なさる
  "humble",                 // 謙譲語 いただく, いたす

  // Imperfective / continuous
  "continuative -i",        // 〜い形 (stem for ます, て, etc.)
  "progressive",            // 〜ている形
  "perfective",             // 〜てある形 / 〜てしまう形

  // Causative nuances
  "causative volitional",   // 〜させよう
  "causative polite",       // 〜させます
  "causative passive polite" // 〜させられます
];

// Function to get a random conjugation type
function getRandomConjugationType() {
  const randomIndex = Math.floor(Math.random() * conjugationTypes.length);
  return conjugationTypes[randomIndex];
}

// Lee y parsea el archivo kanji.json
const kanjiData = JSON.parse(fs.readFileSync(path.join(__dirname, 'kanji.json'), 'utf8'));
// Lee y parsea el archivo Verb.json
const verbData = JSON.parse(fs.readFileSync(path.join(__dirname, 'json/Verb.json'), 'utf8'));

// Endpoint to serve the frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

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

// Endpoint para obtener un verbo aleatorio
app.get('/random-verb', (req, res) => {
  const randomVerb = verbData[Math.floor(Math.random() * verbData.length)];
  
  // Limpia el campo expression de etiquetas HTML
  if (randomVerb && randomVerb.expression) {
    randomVerb.expression = randomVerb.expression.replace(/<[^>]*>/g, '');
  }
  
  // Assign a random conjugation type
  randomVerb.conjugationType = getRandomConjugationType();
  
  res.json(randomVerb);
});

// Endpoint para verificar la conjugación usando la IA
app.post('/check-conjugation', async (req, res) => {
  const { verb, answer, conjugationType } = req.body;
  
  const prompt = `You are a Japanese grammar expert focused on verb conjugations.
The user is practicing conjugating the Japanese verb "${verb.expression}" to its "${conjugationType}" form.
The user's answer is "${answer}".

Please evaluate the user's answer and provide a short feedback
If the verb provided is not a standard Japanese verb or the conjugation form is not recognized, please indicate that. respond in english`;

  try {
    const aiResponse = await simple('gemini-2.5-flash', prompt); // Call the AI function. Use 'gemini-pro' as it's more capable for structured JSON.
    // Ensure the AI response text is a valid JSON.
    const aiFeedback = aiResponse.text; 
    res.json({explanation:aiFeedback});

  } catch (error) {
    console.error("Error during AI conjugation check:", error);
    // Attempt to parse the AI response text even on error to see if it's malformed JSON
    let errorDetails = error.message;
    if (error.response && error.response.text) {
        try {
            errorDetails = JSON.parse(error.response.text()).error || error.response.text();
        } catch (parseError) {
            errorDetails = error.response.text();
        }
    }
    res.status(500).json({ explanation: `Error: Falló la obtención de feedback de la IA. Detalles: ${errorDetails}` });
  }
});

// Inicia el servidor
app.listen(port, () => {
  console.log(`Kanji API listening at http://localhost:${port}`);
});
