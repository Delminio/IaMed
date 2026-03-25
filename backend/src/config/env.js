import dotenv from 'dotenv';
dotenv.config();

export const env = {
  port: Number(process.env.PORT || 8080),
  openRouterApiKey: process.env.OPENROUTER_API_KEY || '',
  openRouterModel: process.env.OPENROUTER_MODEL || 'openai/gpt-4.1-mini',
  openRouterBaseUrl: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
  openRouterSiteUrl: process.env.OPENROUTER_SITE_URL || 'http://localhost:5173',
  openRouterAppName: process.env.OPENROUTER_APP_NAME || 'MedScope AI',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173'
};
