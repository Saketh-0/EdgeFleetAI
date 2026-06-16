import { Response } from 'express';
import { prisma } from '../services/db.service';
import { AIService } from '../services/ai.service';
import { AuthRequest } from '../middleware/auth.middleware';

export const getFinancialSummary = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Fetch all user transactions and budgets
    const transactions = await prisma.transaction.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
    });

    const budgets = await prisma.budget.findMany({
      where: { userId },
    });

    const summary = await AIService.generateSummary(transactions, budgets);
    return res.status(200).json({ summary });
  } catch (error: any) {
    console.error('AI Summary error:', error);
    return res.status(500).json({ error: 'Failed to generate financial summary' });
  }
};

export const chatWithAssistant = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { message, history } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message query is required' });
    }

    // Fetch all transactions and budgets
    const transactions = await prisma.transaction.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
    });

    const budgets = await prisma.budget.findMany({
      where: { userId },
    });

    const chatHistory = history || [];

    const reply = await AIService.chatWithAssistant(transactions, budgets, chatHistory, message);
    return res.status(200).json({ reply });
  } catch (error: any) {
    console.error('AI Chatbot error:', error);
    return res.status(500).json({ error: 'Failed to process AI chat query' });
  }
};

export const categorizeTransaction = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { description } = req.body;
    if (!description) {
      return res.status(400).json({ error: 'Description is required' });
    }

    const category = await AIService.categorizeDescription(description);
    return res.status(200).json({ category });
  } catch (error: any) {
    console.error('AI Categorization controller error:', error);
    return res.status(500).json({ error: 'Failed to categorize transaction description' });
  }
};

