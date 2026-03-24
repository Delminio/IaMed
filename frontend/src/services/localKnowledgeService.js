import fs from 'fs';
import path from 'path';
import pdf from 'pdf-parse';
import { fileURLToPath } from 'url';
import { chunkText, keywordScore, truncate } from '../utils/text.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pdfDir = path.join(__dirname, '..', 'data', 'pdfs');

let cache = [];

export async function loadLocalKnowledge() {
  if (cache.length) return cache;
  const files = fs.readdirSync(pdfDir).filter((name) => name.endsWith('.pdf'));
  const docs = [];

  for (const file of files) {
    const buffer = fs.readFileSync(path.join(pdfDir, file));
    const parsed = await pdf(buffer);
    const chunks = chunkText(parsed.text, 1400);
    chunks.forEach((chunk, index) => {
      docs.push({
        id: `${file}-${index}`,
        sourceType: 'local',
        sourceName: file,
        title: file,
        chunkIndex: index,
        content: chunk,
        preview: truncate(chunk, 260)
      });
    });
  }

  cache = docs;
  return cache;
}

export async function searchLocalKnowledge(query, limit = 6) {
  const docs = await loadLocalKnowledge();
  return docs
    .map((doc) => ({ ...doc, score: keywordScore(query, doc.content) }))
    .filter((doc) => doc.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

if (process.argv[1] === __filename) {
  loadLocalKnowledge().then((docs) => {
    console.log(`Chunks carregados: ${docs.length}`);
  });
}
