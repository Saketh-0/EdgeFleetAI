import { Router } from 'express';
import { getFinancialSummary, chatWithAssistant, categorizeTransaction } from '../controllers/ai.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/summary', getFinancialSummary);
router.post('/chat', chatWithAssistant);
router.post('/categorize', categorizeTransaction);

export default router;

