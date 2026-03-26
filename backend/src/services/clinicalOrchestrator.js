import { clinicalSystemPrompt } from '../prompts/clinicalSystemPrompt.js';
import { searchLocalKnowledge } from './localKnowledgeService.js';
import { searchTrustedWeb } from './webKnowledgeService.js';
import { generateClinicalAnswer } from './openRouterService.js';
import { analyzeClinicalContext } from './clinicalRulesService.js';

function buildEvidenceBlock(items, label) {
  if (!items.length) return `${label}: nenhuma evidência encontrada.`;

  return `${label}:\n${items
    .map(
      (item, index) =>
        `${index + 1}. ${item.title || item.sourceName}\nFonte: ${item.url || item.sourceName}\nTrecho: ${item.preview}`
    )
    .join('\n\n')}`;
}

function buildStructuredFallback(analysis, mode, localSources, internetSources, technicalNotes = []) {
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
    ...(analysis.examInterpretation.length
      ? analysis.examInterpretation.map((item) => `- ${item}`)
      : ['- Sem exames suficientes para interpretação detalhada.']),
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
    `Fontes de internet recuperadas: ${internetSources.length}`,
    '',
    'Observações técnicas:',
    ...(technicalNotes.length ? technicalNotes.map((item) => `- ${item}`) : ['- Nenhuma observação técnica adicional.'])
  ].join('\n');
}

export async function askClinicalQuestion({ question, mode = 'hybrid', chartData = {} }) {
  const normalizedMode = ['local', 'internet', 'hybrid'].includes(mode) ? mode : 'hybrid';
  const analysis = analyzeClinicalContext({ question, chartData });
  const technicalNotes = [];

  const searchQuery = [
    question,
    chartData.symptoms,
    chartData.exams,
    chartData.notes,
    analysis.probableDiagnosis,
    analysis.type
  ]
    .filter(Boolean)
    .join(' ');

  let localSources = [];
  let internetSources = [];

  if (normalizedMode !== 'internet') {
    try {
      localSources = await searchLocalKnowledge(searchQuery, 8);
    } catch (error) {
      console.error('Falha na busca local:', error);
      localSources = [];
      technicalNotes.push(`A busca local falhou: ${error.message}`);
    }
  }

  if (normalizedMode !== 'local') {
    try {
      internetSources = await searchTrustedWeb(searchQuery, 8);
    } catch (error) {
      console.error('Falha na busca web:', error);
      internetSources = [];
      technicalNotes.push(`A busca na internet falhou: ${error.message}`);
    }
  }

  // Fallback: se o modo for internet e a web falhar, tenta usar a base local
  if (normalizedMode === 'internet' && internetSources.length === 0) {
    try {
      localSources = await searchLocalKnowledge(searchQuery, 8);
      technicalNotes.push('A pesquisa web não respondeu a tempo; a resposta foi apoiada na base local disponível.');
    } catch (error) {
      console.error('Falha no fallback local após erro na web:', error);
      technicalNotes.push(`O fallback para a base local também falhou: ${error.message}`);
    }
  }

  const effectiveMode =
    normalizedMode === 'internet' && internetSources.length === 0 && localSources.length > 0
      ? 'internet (com fallback local)'
      : normalizedMode;

  const userPrompt = `Caso clínico livre:
${question}

Dados estruturados do prontuário:
${JSON.stringify(chartData, null, 2)}

Pré-análise por regras:
${JSON.stringify(analysis, null, 2)}

Modo solicitado: ${effectiveMode}

${buildEvidenceBlock(localSources, 'EVIDÊNCIAS LOCAIS')}

${buildEvidenceBlock(internetSources, 'EVIDÊNCIAS INTERNET')}

Observações técnicas:
${technicalNotes.length ? technicalNotes.map((item) => `- ${item}`).join('\n') : '- Nenhuma observação técnica.'}

Gere uma resposta clínica estruturada, objetiva e cuidadosa. Se a busca web tiver falhado, informe isso de forma breve e siga com o melhor apoio possível das evidências disponíveis.`;

  let answer;

  try {
    const llm = await generateClinicalAnswer({
      systemPrompt: clinicalSystemPrompt,
      userPrompt
    });

    answer = llm.content;
  } catch (error) {
    answer = `${buildStructuredFallback(
      analysis,
      effectiveMode,
      localSources,
      internetSources,
      technicalNotes
    )}\n\nObservação técnica adicional: ${error.message}`;
  }

  return {
    mode: effectiveMode,
    answer,
    structuredAnalysis: analysis,
    localSources: localSources.map((item) => ({
      title: item.title,
      sourceName: item.sourceName,
      preview: item.preview,
      score: item.score
    })),
    internetSources: internetSources.map((item) => ({
      title: item.title,
      url: item.url,
      preview: item.preview,
      score: item.score
    })),
    technicalNotes
  };
}
