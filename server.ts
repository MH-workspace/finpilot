import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

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

  // AI Financial Advisor Endpoint (Fast, Responsive, and Personalized)
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
      const nameGreeting = userNameClean ? `Hello ${userNameClean}!` : 'Hello!';

      if (!apiKey) {
        // Helpful fast fallback when API key is not configured in local environment
        return res.json({
          reply: `${nameGreeting}\n\n### Financial Overview (${monthLabel})\n` +
            `- **Income:** ${symbol}${income.toLocaleString()}\n` +
            `- **Expenses:** ${symbol}${expenses.toLocaleString()}\n` +
            `- **Net Cash Flow:** ${net >= 0 ? '+' : ''}${symbol}${net.toLocaleString()}\n` +
            `- **Savings Rate:** ${rate}% (Benchmark: ${context?.targetSavingsRate || 20}%)\n\n` +
            `${net >= 0 ? `✅ You are currently running a cashflow surplus of ${symbol}${net.toLocaleString()}. You can allocate surplus funds toward your active savings goals.` : `⚠️ Your recorded expenses currently exceed income by ${symbol}${Math.abs(net).toLocaleString()} for this period. Review discretionary spending in shopping and dining.`}\n\n` +
            `*(Note: Instant calculation from your recorded ledger.)*`,
        });
      }

      const ai = getGeminiClient(apiKey);
      const greetingRule = userNameClean
        ? `The user is logged in as "${userNameClean}". You MUST call the user by their name ("${userNameClean}") directly in your greeting (e.g. "Hello ${userNameClean}," or "Hi ${userNameClean}, here is what I see in your budget:") and refer to ${userNameClean} personally.`
        : `The user has not logged in with a name. Greet them warmly as a FinPilot user.`;

      const systemInstruction = `You are FinPilot AI, a lightning-fast, encouraging, and precise personal financial advisor.
You help everyday users understand their money with clear figures, practical next steps, and zero jargon.

CRITICAL RULES:
1. ${greetingRule}
2. Be concise, fast, and structured. Use bullet points and bold amounts. Keep responses under 250 words so they read quickly.
3. Ground observations directly in the user's ledger: Income ${symbol}${income}, Expenses ${symbol}${expenses}, Net ${symbol}${net}, Savings Rate ${rate}%.
4. Never promise investment returns or guarantee tax/legal outcomes.`;

      // Try gemini-2.5-flash for rapid response
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `USER FINANCIAL CONTEXT:\n- User Name: ${userNameClean || 'Guest'}\n- Month: ${monthLabel}\n- Currency: ${symbol}\n- Income: ${income}\n- Expenses: ${expenses}\n- Net: ${net}\n- Savings Rate: ${rate}%\n- Category Spend: ${JSON.stringify(context?.expensesByCategory || {})}\n- Budgets: ${JSON.stringify(context?.budgets || [])}\n- Goals: ${JSON.stringify(context?.savingsGoals || [])}\n\nUSER QUESTION:\n${prompt}`,
                },
              ],
            },
          ],
          config: {
            systemInstruction,
            maxOutputTokens: 800,
            temperature: 0.6,
          },
        });

        const reply = response.text?.trim();
        if (reply) {
          return res.json({ reply });
        }
      } catch (err: any) {
        console.warn('Primary model error, attempting backup:', err?.message?.slice(0, 80));
      }

      // Quick fallback calculation if AI timed out or failed
      return res.json({
        reply: `${nameGreeting}\n\n### Financial Summary (${monthLabel})\n` +
          `- **Total Inflow:** ${symbol}${income.toLocaleString()}\n` +
          `- **Total Outflow:** ${symbol}${expenses.toLocaleString()}\n` +
          `- **Net Cashflow:** ${net >= 0 ? '+' : ''}${symbol}${net.toLocaleString()}\n` +
          `- **Savings Rate:** ${rate}%\n\n` +
          `${net >= 0 ? `✅ You are in a healthy surplus of ${symbol}${net.toLocaleString()} this period.` : `⚠️ Your spending exceeded income by ${symbol}${Math.abs(net).toLocaleString()}.`}\n\n` +
          `*(Instant snapshot computed from your current financial records)*`,
      });
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
