import { Router } from 'express';
import { askClinicalQuestion } from '../services/clinicalOrchestrator.js';

const router = Router();
router.post('/', async (req, res, next) => {
  try {
    const { question, mode } = req.body || {};
    if (!question || typeof question !== 'string') {
      return res.status(400).json({ error: 'Envie um campo question em texto.' });
    }
    const result = await askClinicalQuestion({ question, mode });
    return res.json(result);
  } catch (error) {
    next(error);
  }
});
export default router;
