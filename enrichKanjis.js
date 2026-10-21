import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const KANJI_DIR = path.join(__dirname, 'kanjis');
const NOT_FOUND_PATH = path.join(__dirname, 'not-found.json');
const CONCURRENCY = 10;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function fetchKanji(kanji) {
  const encoded = encodeURIComponent(kanji);
  const cmd = `curl -s -H "Origin: https://test.toolzar.com" "https://kanji-api.toolzar.com/find?search=${encoded}&page=0"`;
  const { stdout } = await execAsync(cmd, { timeout: 10000 });
  return JSON.parse(stdout);
}

function progressBar(current, total, width = 30) {
  const pct = Math.min(current / total, 1);
  const filled = Math.max(0, Math.min(width, Math.round(pct * width)));
  return `[${'█'.repeat(filled)}${'░'.repeat(width - filled)}] ${(pct * 100).toFixed(1)}%`;
}

function formatTime(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
}

const files = fs.readdirSync(KANJI_DIR).filter(f => f.endsWith('.json'));

let alreadyDone = 0;
for (const f of files) {
  try {
    const d = JSON.parse(fs.readFileSync(path.join(KANJI_DIR, f), 'utf8'));
    if (d.componentTree) alreadyDone++;
  } catch {}
}

console.log(`\n📂 kanjis/: ${files.length} archivos | ya listos: ${alreadyDone} | pendientes: ${files.length - alreadyDone}`);
console.log(`⚡ Concurrencia: ${CONCURRENCY} peticiones simultáneas\n`);

let updated = 0, notFound = 0, errors = 0, skipped = 0, processed = 0;
const notFoundList = [];
const errorList = [];
const startTime = Date.now();

async function processOne(file) {
  const kanji = file.replace('.json', '');
  const filePath = path.join(KANJI_DIR, file);

  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (data.componentTree && data.svg) { skipped++; return; }

    const apiData = await fetchKanji(kanji);

    if (apiData.matchesFound > 0 && apiData.results?.[0]?.data) {
      const result = apiData.results[0];
      const d = result.data;
      data.componentTree = d.componentTree || data.componentTree || null;
      data.svg = result.svg || data.svg || null;
      data.lesson = d.lesson || data.lesson || null;
      data.referenceNo = d.referenceNo || data.referenceNo || null;
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
      updated++;
    } else {
      notFound++;
      notFoundList.push(kanji);
    }
  } catch (err) {
    errors++;
    errorList.push({ kanji, error: err.message });
  } finally {
    processed++;
  }
}

// pool de concurrencia
let index = 0;
async function worker() {
  while (index < files.length) {
    const file = files[index++];
    await processOne(file);

    const elapsed = Date.now() - startTime;
    const rate = processed / (elapsed / 1000);
    const remaining = (files.length - processed) / rate;
    process.stdout.write(
      `\r${progressBar(processed, files.length)} ${processed}/${files.length} | ` +
      `✓${updated} ✗${notFound} ⚠${errors} | ` +
      `${rate.toFixed(1)}/s | ETA ${formatTime(remaining * 1000)}   `
    );
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

const report = { notFound: notFoundList, errors: errorList };
fs.writeFileSync(NOT_FOUND_PATH, JSON.stringify(report, null, 2) + '\n', 'utf8');

const totalTime = formatTime(Date.now() - startTime);
console.log(`\n\n=== ✅ Listo en ${totalTime} ===`);
console.log(`  ✓ Actualizados:   ${updated}`);
console.log(`  = Ya tenían:      ${skipped}`);
console.log(`  ✗ No encontrados: ${notFound} → not-found.json`);
console.log(`  ⚠ Errores:        ${errors} → not-found.json`);
