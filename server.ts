import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

import { generateAdvancedFinancialAdvice } from './src/utils/financialIntelligence';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // Shared Gemini client instance with telemetry header
  const getGeminiClient = (apiKey: string) =>
    new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // AI Financial Advisor Endpoint (Fast, Responsive, and Specialized)
  app.post('/api/ai/advisor', async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      const { prompt, context, userName } = req.body;
      if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({ error: 'A valid text prompt is required.' });
      }

      if (prompt.length > 2000) {
        return res.status(400).json({ error: 'Prompt is too long (maximum 2,000 characters).' });
      }

      const userNameClean = typeof userName === 'string' && userName.trim() ? userName.trim() : '';

      const income = Number(context?.income || 0);
      const expenses = Number(context?.expenses || 0);
      const net = income - expenses;
      const rate = context?.savingsRatePercentage || (income > 0 ? ((net / income) * 100).toFixed(1) : '0');
      const monthLabel = context?.selectedMonth || 'this month';
      const symbol = context?.currencySymbol || '₹';

      // If no API key is configured, instantly run specialized FinPilot intelligence engine
      if (!apiKey) {
        const fallbackReply = generateAdvancedFinancialAdvice(context || {}, prompt, userNameClean);
        return res.json({ reply: fallbackReply });
      }

      const ai = getGeminiClient(apiKey);
      const personalizationRule = userNameClean
        ? `The user is logged in as "${userNameClean}". Integrate their name naturally in your response (e.g. "${userNameClean}, looking at your October finances..." or "Here is an audit of your budgets, ${userNameClean}:"). Do NOT start every reply with a robotic "Hello ${userNameClean}!". Speak to them as their dedicated personal financial copilot.`
        : `The user has not logged in with a name. Address them conversationally and directly as their FinPilot AI Copilot. Do NOT use stiff generic openers like "Hello FinPilot user!". Jump straight into actionable insights.`;

      const systemInstruction = `You are FinPilot AI Copilot, an elite, lightning-fast personal financial advisor embedded inside the FinPilot personal finance app.
You provide deep, hyper-actionable financial guidance based on the user's recorded ledger, budgets, goals, and recurring rules.

CORE RULES:
1. ${personalizationRule}
2. Be concise, fast, and highly structured (under 280 words). Use clean Markdown bullet points, bold numbers with ${symbol}, and comparison tables where helpful.
3. Specialize in FinPilot features:
   - Cashflow & Net Margin: Income ${symbol}${income.toLocaleString()}, Expenses ${symbol}${expenses.toLocaleString()}, Net ${symbol}${net.toLocaleString()} (${net >= 0 ? 'Surplus' : 'Deficit'}).
   - Savings Rate vs Target: Current rate ${rate}% vs target ${context?.targetSavingsRate || 20}%.
   - 50/30/20 Framework: Categorize into Needs (Bills, Food, Transport, Health), Wants (Shopping, Entertainment), Savings & Goals.
   - Budget Guardrails: Identify any categories exceeding limits or nearing 80% capacity.
   - Goal Acceleration: Calculate exact monthly contributions to hit savings milestones.
   - Recurring Fixed Costs: Audit monthly subscriptions and utilities.
4. If income or expenses are 0 for the selected month, note that contextually and guide the user to log transactions or evaluate their baseline recurring setup.
5. Never guarantee tax or legal outcomes or promise investment returns.`;

      // Run Gemini 2.5 Flash with an 8-second timeout guard
      try {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('AI response timeout')), 8000)
        );

        const geminiPromise = ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `USER FINANCIAL LEDGER SNAPSHOT:\n` +
                    `- User Name: ${userNameClean || 'None'}\n` +
                    `- Reporting Month: ${monthLabel}\n` +
                    `- Currency: ${symbol}\n` +
                    `- Total Recorded Inflow: ${symbol}${income.toLocaleString()}\n` +
                    `- Total Recorded Outflow: ${symbol}${expenses.toLocaleString()}\n` +
                    `- Net Cash Flow: ${net >= 0 ? '+' : ''}${symbol}${net.toLocaleString()}\n` +
                    `- Savings Rate: ${rate}%\n` +
                    `- Needs Outflow: ${symbol}${context?.needsTotal || 0}\n` +
                    `- Wants Outflow: ${symbol}${context?.wantsTotal || 0}\n` +
                    `- Top Expense Category: ${JSON.stringify(context?.topExpenseCategory || 'None')}\n` +
                    `- Expense Categories Breakdown: ${JSON.stringify(context?.expensesByCategory || {})}\n` +
                    `- Budgets Status: ${JSON.stringify(context?.budgets || [])}\n` +
                    `- Active Savings Goals: ${JSON.stringify(context?.savingsGoals || [])}\n` +
                    `- Recurring Rules: ${JSON.stringify(context?.recurringRules || [])}\n` +
                    `- Total Database Transactions: ${context?.totalTransactionsCount || 0}\n` +
                    `- Recent Transactions: ${JSON.stringify(context?.recentTransactions || [])}\n\n` +
                    `USER INQUIRY:\n${prompt}`,
                },
              ],
            },
          ],
          config: {
            systemInstruction,
            maxOutputTokens: 2048,
            temperature: 0.6,
          },
        });

        const response: any = await Promise.race([geminiPromise, timeoutPromise]);
        const reply = response.text?.trim();
        if (reply && reply.length > 50) {
          return res.json({ reply });
        }
      } catch (err: any) {
        console.warn('Gemini advisor call timed out or failed, using specialized financial intelligence engine:', err?.message?.slice(0, 100));
      }

      // High-precision specialized financial intelligence fallback
      const fallbackReply = generateAdvancedFinancialAdvice(context || {}, prompt, userNameClean);
      return res.json({ reply: fallbackReply });
    } catch (err: any) {
      console.error('Gemini Advisor Error:', err);
      return res.status(500).json({
        error: 'Unable to connect to AI advisor. Please verify your connection or try again shortly.',
      });
    }
  });

  // Smart categorization endpoint
  app.post('/api/ai/categorize', async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      const { description, amount, type } = req.body;

      if (!apiKey) {
        // Fallback rule-based matching if no API key
        return res.json({ category: 'Other', suggestedBudget: 0 });
      }

      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `Given the transaction description "${description}" of amount ${amount} and type "${type}", classify it into one of these standard categories:
Food, Transport, Shopping, Bills, Health, Education, Entertainment, Savings, Salary, Freelance, Business, Investments, Gifts, Refunds, Other.
Return ONLY a valid JSON object in this exact format:
{"category": "CategoryName", "confidence": 0.95}`,
              },
            ],
          },
        ],
        config: {
          responseMimeType: 'application/json',
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      return res.json({ category: parsed.category || 'Other' });
    } catch {
      return res.json({ category: 'Other' });
    }
  });

  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FinPilot server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start FinPilot server:', err);
  process.exit(1);
});
