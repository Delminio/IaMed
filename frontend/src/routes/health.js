import { Router } from 'express';
const router = Router();
router.get('/', (_, res) => res.json({ ok: true, service: 'MedScope AI API' }));
export default router;
