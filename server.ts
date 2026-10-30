import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Content } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface IncomingHistoryItem {
  sender?: string;
  text?: string;
}

function getValidApiKey(): string | null {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key || key === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return key;
}

function buildConversationContents(
  history: unknown,
  ledgerContextBlock: string,
  userPrompt: string
): Content[] {
  const contents: Content[] = [];

  if (Array.isArray(history)) {
    const recentTurns = (history as IncomingHistoryItem[])
      .filter(
        (m) =>
          m &&
          (m.sender === 'user' || m.sender === 'assistant') &&
          typeof m.text === 'string' &&
          m.text.trim().length > 0
      )
      .slice(-10);

    for (const turn of recentTurns) {
      const role = turn.sender === 'user' ? 'user' : 'model';
      const cleanText = String(turn.text).trim().slice(0, 2500);
      // Coalesce consecutive turns of the same role to satisfy Gemini's alternating turn contract
      const prev = contents[contents.length - 1];
      if (prev && prev.role === role && prev.parts?.[0]?.text) {
        prev.parts[0].text = `${prev.parts[0].text}\n\n${cleanText}`;
      } else {
        contents.push({
          role,
          parts: [{ text: cleanText }],
        });
      }
    }

    // Gemini multi-turn history must begin with a 'user' message
    while (contents.length > 0 && contents[0].role !== 'user') {
      contents.shift();
    }
    // Since we are appending the new 'user' turn next, if the last item in history is also 'user', merge or drop trailing duplicate
    if (contents.length > 0 && contents[contents.length - 1].role === 'user') {
      contents.pop();
    }
  }

  contents.push({
    role: 'user',
    parts: [
      {
        text: `${ledgerContextBlock}\n\nUSER QUESTION:\n${userPrompt}`,
      },
    ],
  });

  return contents;
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '256kb' }));

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
    res.json({
      status: 'ok',
      aiConfigured: Boolean(getValidApiKey()),
      time: new Date().toISOString(),
    });
  });

  // FinPilot AI Financial Assistant Endpoint
  app.post('/api/ai/advisor', async (req, res) => {
    try {
      const apiKey = getValidApiKey();
      if (!apiKey) {
        return res.status(503).json({
          error:
            'FinPilot AI Assistant is unavailable because GEMINI_API_KEY is not configured on the server. Add GEMINI_API_KEY in your environment secrets and restart.',
        });
      }

      const { prompt, context, history, userName } = req.body || {};
      const cleanPrompt = typeof prompt === 'string' ? prompt.trim() : '';

      if (!cleanPrompt) {
        return res.status(400).json({ error: 'Please enter a financial question before sending.' });
      }

      if (cleanPrompt.length > 2000) {
        return res.status(400).json({ error: 'Message is too long (maximum 2,000 characters).' });
      }

      const userNameClean =
        typeof userName === 'string' && userName.trim() ? userName.trim().slice(0, 80) : '';

      const safeContext = context && typeof context === 'object' ? context : {};
      const income = Number(safeContext.income || 0);
      const expenses = Number(safeContext.expenses || 0);
      const net = income - expenses;
      const rate =
        typeof safeContext.savingsRatePercentage === 'string'
          ? safeContext.savingsRatePercentage
          : income > 0
          ? ((net / income) * 100).toFixed(1)
          : '0.0';
      const monthLabel = String(safeContext.selectedMonth || 'current month').slice(0, 32);
      const symbol = String(safeContext.currencySymbol || '₹').slice(0, 8);
      const targetSavingsRate = Number(safeContext.targetSavingsRate ?? 20);
      const monthTxCount = Number(safeContext.monthTransactionsCount ?? 0);
      const totalTxCount = Number(safeContext.totalTransactionsCount ?? 0);

      // Construct minimal, strictly user-scoped financial context
      const ledgerSnapshotText = [
        `AUTHENTICATED USER FINANCIAL SNAPSHOT (STRICTLY SCOPED TO CURRENT USER):`,
        `- User Name: ${userNameClean || 'Not specified'}`,
        `- Active Reporting Month: ${monthLabel}`,
        `- Currency Symbol: ${symbol}`,
        `- Transactions Logged in ${monthLabel}: ${monthTxCount} (Total across all months: ${totalTxCount})`,
        `- Recorded Monthly Income: ${symbol}${income.toLocaleString()}`,
        `- Recorded Monthly Expenses: ${symbol}${expenses.toLocaleString()}`,
        `- Net Monthly Cash Flow: ${net >= 0 ? '+' : '-'}${symbol}${Math.abs(net).toLocaleString()} (${
          net > 0 ? 'Surplus' : net < 0 ? 'Deficit' : 'Break-even'
        })`,
        `- Recorded Savings Rate: ${rate}% (User Target: ${targetSavingsRate}%)`,
        `- 50/30/20 Recorded Breakdown: Needs=${symbol}${Number(safeContext.needsTotal || 0).toLocaleString()}, Wants=${symbol}${Number(safeContext.wantsTotal || 0).toLocaleString()}, Positive Savings=${symbol}${Number(safeContext.savingsTotal || 0).toLocaleString()}`,
        `- Income by Category (${monthLabel}): ${JSON.stringify(safeContext.incomeByCategory || {})}`,
        `- Expenses by Category (${monthLabel}): ${JSON.stringify(safeContext.expensesByCategory || {})}`,
        `- Top Expense Category: ${JSON.stringify(safeContext.topExpenseCategory || null)}`,
        `- Category Budgets Status: ${JSON.stringify(
          Array.isArray(safeContext.budgets) ? safeContext.budgets.slice(0, 20) : []
        )}`,
        `- Unusual Spending Indicators: ${JSON.stringify(
          safeContext.unusualSpending || { categorySpikes: [], largeSingleExpenses: [] }
        )}`,
        `- Active Savings Goals: ${JSON.stringify(
          Array.isArray(safeContext.savingsGoals) ? safeContext.savingsGoals.slice(0, 15) : []
        )}`,
        `- Active Recurring Rules (Est. Monthly Fixed Expense=${symbol}${Number(
          safeContext.totalMonthlyRecurringExpense || 0
        ).toLocaleString()}, Est. Monthly Fixed Income=${symbol}${Number(
          safeContext.totalMonthlyRecurringIncome || 0
        ).toLocaleString()}): ${JSON.stringify(
          Array.isArray(safeContext.recurringRules) ? safeContext.recurringRules.slice(0, 15) : []
        )}`,
        `- Recent Ledger Entries (up to 12): ${JSON.stringify(
          Array.isArray(safeContext.recentTransactions)
            ? safeContext.recentTransactions.slice(0, 12)
            : []
        )}`,
      ].join('\n');

      const systemInstruction = `You are FinPilot AI Copilot, the dedicated personal finance assistant inside FinPilot.

YOUR CORE RESPONSIBILITIES:
1. Understand natural-language financial questions and answer the user's specific question directly.
2. Explain recorded income, expenses, net cash flow, and category breakdowns clearly.
3. Analyze spending patterns, budget utilization, savings goals, and recurring obligations using ONLY the user's actual financial snapshot provided in the prompt.
4. Identify unusual spending patterns when relevant (such as budget overruns, categories spiking above historical averages, or large single expenses).
5. Offer practical, personalized budgeting suggestions and explain financial summaries in simple, approachable language.
6. Use the prior conversation history to answer follow-up questions naturally without repeating the entire financial summary unless asked.
7. When the user has limited or zero recorded financial data (e.g., 0 transactions or 0 income/expenses for ${monthLabel}), state clearly what is currently recorded (${symbol}0 / 0 entries) and give helpful percentage-based guidance (such as the 50/30/20 framework) plus simple steps to start logging transactions, budgets, or goals in FinPilot.

STRICT DATA INTEGRITY & SECURITY RULES:
- NEVER invent, guess, or fabricate financial figures, balances, transactions, or income amounts.
- Clearly distinguish **actual recorded data** from **general suggestions or hypothetical projections** (for example: "Recorded in your ${monthLabel} ledger: **${symbol}${expenses.toLocaleString()}**" vs. "Suggested target: ...").
- Never start with generic filler like "Hello! How can I assist you today?". Jump straight into answering the user's question warmly, clearly, and concisely.
- Format responses cleanly in Markdown (use short headings \`###\`, bullet points, bold currency amounts with \`${symbol}\`, and Markdown tables only when comparing multiple categories or budgets adds clarity). Keep answers focused and easy to read on both mobile and desktop.`;

      const ai = getGeminiClient(apiKey);
      const contents = buildConversationContents(history, ledgerSnapshotText, cleanPrompt);

      const callModel = async (modelName: string) => {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('GEMINI_TIMEOUT')), 25000)
        );

        const requestPromise = ai.models.generateContent({
          model: modelName,
          contents,
          config: {
            systemInstruction,
            maxOutputTokens: 1500,
            temperature: 0.4,
            thinkingConfig: { thinkingBudget: 0 },
          },
        });

        return await Promise.race([requestPromise, timeoutPromise]);
      };

      let response;
      try {
        response = await callModel('gemini-2.5-flash');
      } catch (primaryErr: any) {
        const status = Number(primaryErr?.status || 0);
        const msg = String(primaryErr?.message || '');
        // Only try compatible Gemini Flash alias if gemini-2.5-flash is unavailable/not-found
        if (status === 404 || msg.toLowerCase().includes('not found')) {
          response = await callModel('gemini-flash-latest');
        } else {
          throw primaryErr;
        }
      }

      const reply = response?.text?.trim() || '';
      if (!reply) {
        return res.status(502).json({
          error:
            'The AI Assistant returned an empty response. Please rephrase your question and try again.',
        });
      }

      return res.json({ reply });
    } catch (err: any) {
      const msg = String(err?.message || '');
      const status = Number(err?.status || 0);
      console.error('Gemini Advisor API Error:', status || 'ERR', msg);

      if (msg === 'GEMINI_TIMEOUT') {
        return res.status(504).json({
          error: 'The AI Assistant timed out while analyzing your request. Please click Retry.',
        });
      }
      if (status === 429 || msg.includes('RESOURCE_EXHAUSTED') || msg.toLowerCase().includes('quota')) {
        return res.status(429).json({
          error: 'Gemini API rate limit reached. Please wait a few seconds and retry.',
        });
      }
      if (status === 401 || status === 403 || msg.includes('API_KEY_INVALID')) {
        return res.status(502).json({
          error: 'Server Gemini API key is invalid or unauthorized. Please verify GEMINI_API_KEY configuration.',
        });
      }

      return res.status(502).json({
        error: 'Unable to reach FinPilot AI right now. Please check your connection and retry.',
      });
    }
  });

  // Smart categorization endpoint
  app.post('/api/ai/categorize', async (req, res) => {
    try {
      const apiKey = getValidApiKey();
      const { description, amount, type } = req.body || {};

      if (!description || typeof description !== 'string') {
        return res.status(400).json({ error: 'Transaction description is required.' });
      }

      if (!apiKey) {
        return res.status(503).json({ error: 'Gemini API key is not configured.' });
      }

      const ai = getGeminiClient(apiKey);
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `Given the transaction description "${description.slice(0, 200)}" of amount ${Number(
                  amount || 0
                )} and type "${type === 'Income' ? 'Income' : 'Expense'}", classify it into one of these standard categories:
Food, Transport, Shopping, Bills, Health, Education, Entertainment, Savings, Salary, Freelance, Business, Investments, Gifts, Refunds, Other.
Return ONLY a valid JSON object in this exact format:
{"category": "CategoryName", "confidence": 0.95}`,
              },
            ],
          },
        ],
        config: {
          responseMimeType: 'application/json',
          thinkingConfig: { thinkingBudget: 0 },
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      return res.json({
        category: typeof parsed.category === 'string' ? parsed.category : 'Other',
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.8,
      });
    } catch (err: any) {
      console.error('Categorize API Error:', err?.message || err);
      return res.status(502).json({ error: 'Unable to categorize transaction right now.' });
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
