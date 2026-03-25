import { clinicalSystemPrompt } from '../prompts/clinicalSystemPrompt.js';
import { searchLocalKnowledge } from './localKnowledgeService.js';
import { searchTrustedWeb } from './webKnowledgeService.js';
import { generateClinicalAnswer } from './openRouterService.js';
import { analyzeClinicalContext } from './clinicalRulesService.js';

function buildEvidenceBlock(items, label) {
  if (!items.length) return `${label}: nenhuma evidência encontrada.`;
  return `${label}:\n${items.map((item, index) => `${index + 1}. ${item.title || item.sourceName}\nFonte: ${item.url || item.sourceName}\nTrecho: ${item.preview}`).join('\n\n')}`;
}

function buildStructuredFallback(analysis, mode, localSources, internetSources) {
  return [
    `Classificação do caso: ${analysis.classification}`,
    `Tipo: ${analysis.type}`,
    `Diagnóstico provável: ${analysis.probableDiagnosis}`,
    `Score de risco: ${analysis.riskScore}/10`,
    '',
    'Fundamentos principais:',
    ...analysis.rationale.map((item) => `- ${item}`),
    '',
    'Interpretação de exames:',
    ...(analysis.examInterpretation.length ? analysis.examInterpretation.map((item) => `- ${item}`) : ['- Sem exames suficientes para interpretação detalhada.']),
    '',
    'Recomendações:',
    ...analysis.recommendations.map((item) => `- ${item}`),
    '',
    'Conduta provável:',
    ...analysis.conduct.map((item) => `- ${item}`),
    '',
    'Dados que ajudariam a acompanhar a evolução:',
    ...analysis.suggestedNextData.map((item) => `- ${item}`),
    '',
    `Modo consultado: ${mode}`,
    `Fontes locais recuperadas: ${localSources.length}`,
    `Fontes de internet recuperadas: ${internetSources.length}`
  ].join('\n');
}

export async function askClinicalQuestion({ question, mode = 'hybrid', chartData = {} }) {
  const normalizedMode = ['local', 'internet', 'hybrid'].includes(mode) ? mode : 'hybrid';
  const analysis = analyzeClinicalContext({ question, chartData });

  const searchQuery = [
    question,
    chartData.symptoms,
    chartData.exams,
    chartData.notes,
    analysis.probableDiagnosis,
    analysis.type
  ].filter(Boolean).join(' ');

  const localSources = normalizedMode === 'internet' ? [] : await searchLocalKnowledge(searchQuery, 8);
  const internetSources = normalizedMode === 'local' ? [] : await searchTrustedWeb(searchQuery, 8);

  const userPrompt = `Caso clínico livre:\n${question}\n\nDados estruturados do prontuário:\n${JSON.stringify(chartData, null, 2)}\n\nPré-análise por regras:\n${JSON.stringify(analysis, null, 2)}\n\nModo solicitado: ${normalizedMode}\n\n${buildEvidenceBlock(localSources, 'EVIDÊNCIAS LOCAIS')}\n\n${buildEvidenceBlock(internetSources, 'EVIDÊNCIAS INTERNET')}\n\nGere uma resposta clínica estruturada, objetiva e cuidadosa.`;

  let answer;
  try {
    const llm = await generateClinicalAnswer({ systemPrompt: clinicalSystemPrompt, userPrompt });
    answer = llm.content;
  } catch (error) {
    answer = `${buildStructuredFallback(analysis, normalizedMode, localSources, internetSources)}\n\nObservação técnica: ${error.message}`;
  }

  return {
    mode: normalizedMode,
    answer,
    structuredAnalysis: analysis,
    localSources: localSources.map((item) => ({ title: item.title, sourceName: item.sourceName, preview: item.preview, score: item.score })),
    internetSources: internetSources.map((item) => ({ title: item.title, url: item.url, preview: item.preview, score: item.score }))
  };
}
