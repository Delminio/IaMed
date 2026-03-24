import { clinicalSystemPrompt } from '../prompts/clinicalSystemPrompt.js';
import { searchLocalKnowledge } from './localKnowledgeService.js';
import { searchTrustedWeb } from './webKnowledgeService.js';
import { generateClinicalAnswer } from './openRouterService.js';

function buildEvidenceBlock(items, label) {
  if (!items.length) return `${label}: nenhuma evidência encontrada.`;
  return `${label}:\n${items.map((item, index) => `${index + 1}. ${item.title || item.sourceName}\nFonte: ${item.url || item.sourceName}\nTrecho: ${item.preview}`).join('\n\n')}`;
}

function buildRiskHint(question) {
  const q = question.toLowerCase();
  const redFlags = ['145/95', '160/110', 'cefaleia', 'dor de cabeca', 'oliguria', 'proteinuria', 'convuls', 'visao turva', 'edema pulmonar'];
  const hits = redFlags.filter((flag) => q.includes(flag)).length;
  if (hits >= 3) return 'alto';
  if (hits >= 1) return 'moderado';
  return 'baixo';
}

function fallbackAnswer(question, localSources, internetSources, mode) {
  return [
    `Modo: ${mode}`,
    `Pergunta: ${question}`,
    `Risco inicial: ${buildRiskHint(question)}`,
    '',
    'Resumo de recuperação:',
    `- Fontes locais: ${localSources.length}`,
    `- Fontes internet: ${internetSources.length}`,
    '',
    'Configure a OPENROUTER_API_KEY para receber a resposta clínica completa gerada pela LLM.'
  ].join('\n');
}

export async function askClinicalQuestion({ question, mode = 'hybrid' }) {
  const normalizedMode = ['local', 'internet', 'hybrid'].includes(mode) ? mode : 'hybrid';
  const localSources = normalizedMode === 'internet' ? [] : await searchLocalKnowledge(question);
  const internetSources = normalizedMode === 'local' ? [] : await searchTrustedWeb(question);

  const userPrompt = `Pergunta clínica:\n${question}\n\nModo solicitado: ${normalizedMode}\nRisco inicial estimado pela triagem: ${buildRiskHint(question)}\n\n${buildEvidenceBlock(localSources, 'EVIDÊNCIAS LOCAIS')}\n\n${buildEvidenceBlock(internetSources, 'EVIDÊNCIAS INTERNET')}\n\nGere uma resposta clínica estruturada em português do Brasil.`;

  const llm = await generateClinicalAnswer({ systemPrompt: clinicalSystemPrompt, userPrompt });
  const answer = llm.content.includes('OPENROUTER_API_KEY não configurada')
    ? fallbackAnswer(question, localSources, internetSources, normalizedMode)
    : llm.content;

  return {
    mode: normalizedMode,
    answer,
    localSources: localSources.map((item) => ({ title: item.title, sourceName: item.sourceName, preview: item.preview, score: item.score })),
    internetSources: internetSources.map((item) => ({ title: item.title, url: item.url, preview: item.preview, score: item.score }))
  };
}
