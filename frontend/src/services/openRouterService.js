import { env } from '../config/env.js';

export async function generateClinicalAnswer({ systemPrompt, userPrompt }) {
  if (!env.openRouterApiKey) {
    return {
      content: 'OPENROUTER_API_KEY não configurada. Configure a chave para habilitar a geração final pela LLM. Enquanto isso, a API está retornando as fontes recuperadas e um resumo bruto não-LLM.'
    };
  }

  const response = await fetch(`${env.openRouterBaseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.openRouterApiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': env.openRouterSiteUrl,
      'X-Title': env.openRouterAppName
    },
    body: JSON.stringify({
      model: env.openRouterModel,
      temperature: 0.1,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Falha OpenRouter: ${response.status} ${text}`);
  }

  const data = await response.json();
  return { content: data.choices?.[0]?.message?.content || 'Sem resposta da LLM.' };
}
