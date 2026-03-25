import { Router } from 'express';
import { askClinicalQuestion } from '../services/clinicalOrchestrator.js';

const router = Router();

router.post('/', async (req, res, next) => {
  try {
    const { question, mode, chartData } = req.body || {};
    if (!question || typeof question !== 'string') {
      return res.status(400).json({ error: 'Envie uma pergunta clínica em texto.' });
    }

    const result = await askClinicalQuestion({ question, mode, chartData: chartData || {} });
    return res.json(result);
  } catch (error) {
    return next(error);
  }
});

export default router;
