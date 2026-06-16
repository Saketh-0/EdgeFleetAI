import { Response } from 'express';
import { prisma } from '../services/db.service';
import { AuthRequest } from '../middleware/auth.middleware';

export const getBudgets = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const budgets = await prisma.budget.findMany({
      where: { userId },
    });

    return res.status(200).json(budgets);
  } catch (error: any) {
    console.error('Fetch budgets error:', error);
    return res.status(500).json({ error: 'Failed to retrieve budgets' });
  }
};

export const upsertBudget = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { category, limitAmount, period } = req.body;

    if (!category || limitAmount === undefined) {
      return res.status(400).json({ error: 'Category and limitAmount are required' });
    }

    const budget = await prisma.budget.upsert({
      where: {
        userId_category: {
          userId,
          category,
        },
      },
      update: {
        limitAmount: parseFloat(limitAmount),
        period: period ?? 'monthly',
      },
      create: {
        userId,
        category,
        limitAmount: parseFloat(limitAmount),
        period: period ?? 'monthly',
      },
    });

    return res.status(200).json(budget);
  } catch (error: any) {
    console.error('Upsert budget error:', error);
    return res.status(500).json({ error: 'Failed to update budget' });
  }
};

export const deleteBudget = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;

    const existingBudget = await prisma.budget.findUnique({
      where: { id },
    });

    if (!existingBudget || existingBudget.userId !== userId) {
      return res.status(404).json({ error: 'Budget not found' });
    }

    await prisma.budget.delete({
      where: { id },
    });

    return res.status(200).json({ message: 'Budget deleted successfully' });
  } catch (error: any) {
    console.error('Delete budget error:', error);
    return res.status(500).json({ error: 'Failed to delete budget' });
  }
};
