import { Router } from 'express';
import { TRUSTED_WEB_SOURCES } from '../config/whitelist.js';
import { loadLocalKnowledge } from '../services/localKnowledgeService.js';

const router = Router();
router.get('/', async (_, res, next) => {
  try {
    const local = await loadLocalKnowledge();
    const grouped = [...new Set(local.map((item) => item.sourceName))];
    res.json({ localPdfSources: grouped, trustedInternetSources: TRUSTED_WEB_SOURCES, userCanUploadPdf: false });
  } catch (error) {
    next(error);
  }
});
export default router;
