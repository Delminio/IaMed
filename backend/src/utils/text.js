export function normalizeText(value = '') {
  return value
    .normalize('NFD')
    .replace(/[\u0000-\u001f]/g, ' ')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function chunkText(text, maxLength = 1200) {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  const chunks = [];
  for (let i = 0; i < cleaned.length; i += maxLength) {
    chunks.push(cleaned.slice(i, i + maxLength));
  }
  return chunks.filter(Boolean);
}

export function keywordScore(query, text) {
  const q = normalizeText(query).split(' ').filter((w) => w.length > 2);
  const t = normalizeText(text);
  if (!q.length || !t) return 0;
  let score = 0;
  for (const token of q) {
    if (t.includes(token)) score += 1;
  }
  return score / q.length;
}

export function truncate(text = '', max = 360) {
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()}...`;
}
