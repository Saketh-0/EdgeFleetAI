import { Router } from 'express';
import { getBudgets, upsertBudget, deleteBudget } from '../controllers/budget.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/', getBudgets);
router.post('/', upsertBudget); // Using POST to upsert
router.delete('/:id', deleteBudget);

export default router;
