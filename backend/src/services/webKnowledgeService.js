import * as cheerio from 'cheerio';
import { TRUSTED_WEB_SOURCES } from '../config/whitelist.js';
import { keywordScore, truncate } from '../utils/text.js';

function buildSearchQueries(question) {
  return TRUSTED_WEB_SOURCES.map((domain) => `${question} site:${domain}`);
}

async function searchDuckDuckGo(query) {
  const url = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 MedScopeAI/1.0' }
  });
  const html = await response.text();
  const $ = cheerio.load(html);
  const results = [];

  $('.result').each((_, el) => {
    const title = $(el).find('.result__title').text().trim();
    const href = $(el).find('.result__title a').attr('href');
    const snippet = $(el).find('.result__snippet').text().trim();
    if (title && href) results.push({ title, url: href, snippet });
  });

  return results;
}

async function fetchReadablePage(url) {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 MedScopeAI/1.0' }
    });
    const html = await response.text();
    const $ = cheerio.load(html);
    const text = $('main').text() || $('article').text() || $('body').text() || '';
    return text.replace(/\s+/g, ' ').trim();
  } catch {
    return '';
  }
}

export async function searchTrustedWeb(question, limit = 6) {
  const allResults = [];
  const queries = buildSearchQueries(question).slice(0, 4);

  for (const query of queries) {
    const results = await searchDuckDuckGo(query);
    allResults.push(...results);
  }

  const seen = new Set();
  const filtered = allResults.filter((item) => {
    if (!item.url) return false;
    if (seen.has(item.url)) return false;
    seen.add(item.url);
    return TRUSTED_WEB_SOURCES.some((domain) => item.url.includes(domain));
  }).slice(0, 8);

  const enriched = [];
  for (const item of filtered) {
    const pageText = await fetchReadablePage(item.url);
    const haystack = `${item.title} ${item.snippet} ${pageText}`;
    enriched.push({
      id: item.url,
      sourceType: 'internet',
      sourceName: item.url,
      title: item.title,
      url: item.url,
      content: pageText || item.snippet,
      preview: truncate(item.snippet || pageText, 260),
      score: keywordScore(question, haystack)
    });
  }

  return enriched
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
