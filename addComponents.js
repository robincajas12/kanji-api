import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DRY_RUN = process.argv.includes('--dry-run');
const CSV_PATH = path.join(__dirname, 'heisig-kanjis', 'heisig-kanjis.csv');
const KANJI_DIR = path.join(__dirname, 'kanjis');

function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c === '\r') { /* skip */ }
    else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const raw = fs.readFileSync(CSV_PATH, 'utf8');
const parsed = parseCSV(raw);
const header = parsed[0];
const rows = parsed.slice(1).map(r => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])));

// keyword -> { kanji, id6 }  (lowercased keyword, prefer lower id_6th_ed on collision)
const keywordIndex = new Map();
const collisions = [];
for (const r of rows) {
  const kanji = r.kanji.trim();
  const id6 = parseInt(r.id_6th_ed, 10) || 999999;
  for (const col of ['keyword_5th_ed', 'keyword_6th_ed']) {
    const kw = r[col].trim().toLowerCase();
    if (!kw || !kanji) continue;
    const existing = keywordIndex.get(kw);
    if (!existing) keywordIndex.set(kw, { kanji, id6 });
    else {
      if (existing.kanji !== kanji) collisions.push({ keyword: kw, a: existing.kanji, b: kanji });
      if (id6 < existing.id6) keywordIndex.set(kw, { kanji, id6 });
    }
  }
}

// resolved components (all kanji findable in a component string, no nesting filter yet)
function resolveComponents(compStr) {
  const out = [];
  for (const token of compStr.split(';')) {
    const t = token.trim().toLowerCase();
    if (!t) continue;
    const hit = keywordIndex.get(t);
    if (hit) out.push({ kanji: hit.kanji, token });
  }
  return out;
}

// full resolved set per kanji (for nesting filter)
const resolvedByKanji = new Map();
for (const r of rows) {
  if (r.kanji.trim()) resolvedByKanji.set(r.kanji.trim(), resolveComponents(r.components));
}

// keyword of a kanji: 6th preferred, fallback 5th
const keywordOf = new Map();
for (const r of rows) {
  const k = r.kanji.trim();
  if (!k) continue;
  keywordOf.set(k, r.keyword_6th_ed.trim() || r.keyword_5th_ed.trim());
}

let updated = 0, skippedNoJson = 0, primitivesExcluded = 0, jsonParseErrors = 0;
const missingExamples = [];

for (const r of rows) {
  const kanji = r.kanji.trim();
  if (!kanji) continue;
  const jsonPath = path.join(KANJI_DIR, `${kanji}.json`);
  if (!fs.existsSync(jsonPath)) {
    skippedNoJson++;
    if (missingExamples.length < 10) missingExamples.push(kanji);
    continue;
  }

  const all = resolvedByKanji.get(kanji) || [];
  // count excluded primitive tokens
  const tokens = r.components.split(';').map(t => t.trim()).filter(Boolean);
  primitivesExcluded += tokens.filter(t => !keywordIndex.has(t.toLowerCase())).length;

  // nesting filter: drop kanji that appear in another component kanji's own resolved set
  const unique = [];
  const seen = new Set();
  for (const c of all) {
    if (seen.has(c.kanji)) continue;
    seen.add(c.kanji);
    unique.push(c);
  }
  const direct = unique.filter(c =>
    !unique.some(other => other.kanji !== c.kanji &&
      (resolvedByKanji.get(other.kanji) || []).some(sub => sub.kanji === c.kanji))
  );

  const components = direct.map(c => ({ kanji: c.kanji, keyword: keywordOf.get(c.kanji) || c.token.trim() }));
  const keyword = keywordOf.get(kanji) || null;

  let data;
  try {
    data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  } catch {
    jsonParseErrors++;
    continue;
  }

  data.keyword = keyword;
  data.components = components;

  if (!DRY_RUN) {
    fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2) + '\n', 'utf8');
  }
  updated++;
}

console.log(`\n=== ${DRY_RUN ? 'DRY RUN (sin escribir)' : 'Listo'} ===`);
console.log(`Kanji actualizados:        ${updated}`);
console.log(`Sin JSON en kanjis/:       ${skippedNoJson}`);
console.log(`Primitivos excluidos:      ${primitivesExcluded}`);
console.log(`JSONs con error de parse:  ${jsonParseErrors}`);
console.log(`Colisiones de keyword:     ${collisions.length}`);
for (const c of collisions) console.log(`  '${c.keyword}': ${c.a} vs ${c.b}`);
if (missingExamples.length) console.log(`Ejemplos sin JSON: ${missingExamples.join(' ')}`);

// spot-check examples
if (DRY_RUN) {
  console.log('\n=== Spot-check ===');
  for (const k of ['明', '唱', '犬', '早']) {
    const all = resolvedByKanji.get(k) || [];
    const direct = all.filter(c =>
      !all.some(other => other.kanji !== c.kanji &&
        (resolvedByKanji.get(other.kanji) || []).some(sub => sub.kanji === c.kanji))
    ).filter((c, i, arr) => arr.findIndex(x => x.kanji === c.kanji) === i);
    console.log(`${k} (keyword: ${keywordOf.get(k)}): ${JSON.stringify(direct.map(c => ({ kanji: c.kanji, keyword: keywordOf.get(c.kanji) })))}`);
  }
}
