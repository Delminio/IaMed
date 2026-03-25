import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import healthRoute from './routes/health.js';
import sourcesRoute from './routes/sources.js';
import askRoute from './routes/ask.js';
import { loadLocalKnowledge } from './services/localKnowledgeService.js';

const app = express();
app.use(cors({ origin: env.clientOrigin }));
app.use(express.json({ limit: '2mb' }));

app.use('/api/health', healthRoute);
app.use('/api/sources', sourcesRoute);
app.use('/api/ask', askRoute);

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: error.message || 'Erro interno.' });
});

loadLocalKnowledge()
  .then(() => {
    app.listen(env.port, () => {
      console.log(`MedScope AI API rodando em http://localhost:${env.port}`);
    });
  })
  .catch((error) => {
    console.error('Falha ao carregar PDFs locais:', error);
    process.exit(1);
  });
