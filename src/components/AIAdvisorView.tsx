import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Sparkles,
  Send,
  Bot,
  User,
  RefreshCw,
  AlertCircle,
  Clock,
  CheckCircle2,
  Trash2,
} from 'lucide-react';
import { Transaction, Budget, SavingsGoal, RecurringRule } from '../types/finance';
import {
  formatCurrency,
  getMonthLabel,
} from '../utils/formatters';

interface AIAdvisorViewProps {
  transactions: Transaction[];
  budgets: Budget[];
  goals: SavingsGoal[];
  recurring: RecurringRule[];
  selectedMonth: string;
  currencySymbol: string;
  targetSavingsRate: number;
  userName?: string;
}

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

const PROMPT_SUGGESTIONS = [
  'Summarize this month’s cashflow and spending',
  'Where am I overspending and how can I fix it?',
  'Calculate a 50/30/20 budget recommendation for my income',
  'Audit my recurring subscriptions and fixed bills',
  'How can I reach my savings goals faster?',
];

export const AIAdvisorView: React.FC<AIAdvisorViewProps> = ({
  transactions,
  budgets,
  goals,
  recurring,
  selectedMonth,
  currencySymbol,
  targetSavingsRate,
  userName = '',
}) => {
  const storageKey = `finpilot_ai_chat_v3_${userName || 'guest'}`;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Generate personalized welcome message
  const createWelcomeMessage = (name: string): Message => {
    const greeting = name ? `Hello ${name}!` : 'Hello!';
    return {
      id: 'welcome',
      sender: 'assistant',
      text: `${greeting} I am your FinPilot Financial Copilot powered by Gemini.
I am actively synced with your ledger for **${getMonthLabel(
        selectedMonth
      )}**, including ${transactions.length} recorded transactions, ${budgets.length} category budgets, and ${goals.length} active savings goals.

Ask me anything about your spending, or tap one of the quick analysis inquiries below to start.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
  };

  // Initialize messages from localStorage or default
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Fallback
    }
    return [createWelcomeMessage(userName)];
  });

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  // Auto-scroll chat to bottom smoothly
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Persist messages to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(messages));
    } catch {
      // Ignore quota errors
    }
  }, [messages, storageKey]);

  // Update welcome message if user logs in on first view
  useEffect(() => {
    if (userName && messages.length === 1 && messages[0].id === 'welcome') {
      setMessages([createWelcomeMessage(userName)]);
    }
  }, [userName]);

  // Clear conversation
  const handleClearChat = () => {
    const initial = [createWelcomeMessage(userName)];
    setMessages(initial);
    try {
      localStorage.setItem(storageKey, JSON.stringify(initial));
    } catch {}
    inputRef.current?.focus();
  };

  // Compile full financial context for Gemini
  const monthTx = useMemo(
    () => transactions.filter((tx) => tx.date.startsWith(selectedMonth)),
    [transactions, selectedMonth]
  );

  const monthIncome = useMemo(
    () =>
      monthTx
        .filter((tx) => tx.type === 'Income')
        .reduce((sum, tx) => sum + tx.amount, 0),
    [monthTx]
  );

  const monthExpenses = useMemo(
    () =>
      monthTx
        .filter((tx) => tx.type === 'Expense')
        .reduce((sum, tx) => sum + tx.amount, 0),
    [monthTx]
  );

  const monthNet = monthIncome - monthExpenses;
  const savingsRate = monthIncome > 0 ? (monthNet / monthIncome) * 100 : 0;

  const categoryTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    monthTx
      .filter((tx) => tx.type === 'Expense')
      .forEach((tx) => {
        totals[tx.category] = (totals[tx.category] || 0) + tx.amount;
      });
    return totals;
  }, [monthTx]);

  const financialSnapshot = useMemo(() => {
    return {
      userName,
      selectedMonth,
      currencySymbol,
      income: monthIncome,
      expenses: monthExpenses,
      net: monthNet,
      savingsRatePercentage: savingsRate.toFixed(1),
      targetSavingsRate,
      expensesByCategory: categoryTotals,
      budgets: budgets.map((b) => ({
        category: b.category,
        monthlyLimit: b.monthlyLimit,
        spentThisMonth: categoryTotals[b.category] || 0,
        isOver: (categoryTotals[b.category] || 0) > b.monthlyLimit,
      })),
      savingsGoals: goals.map((g) => ({
        name: g.name,
        targetAmount: g.targetAmount,
        savedAmount: g.savedAmount,
        targetDate: g.targetDate,
        percentComplete:
          g.targetAmount > 0
            ? ((g.savedAmount / g.targetAmount) * 100).toFixed(0)
            : '0',
      })),
      recurringRules: recurring
        .filter((r) => r.active)
        .map((r) => ({
          description: r.description,
          category: r.category,
          amount: r.amount,
          type: r.type,
          frequency: r.frequency,
          nextDate: r.nextDate,
        })),
    };
  }, [
    userName,
    selectedMonth,
    currencySymbol,
    monthIncome,
    monthExpenses,
    monthNet,
    savingsRate,
    targetSavingsRate,
    categoryTotals,
    budgets,
    goals,
    recurring,
  ]);

  // Fast rule-based fallback if offline or API key absent
  const generateRuleBasedFallback = (prompt: string): string => {
    const p = prompt.toLowerCase();
    const namePrefix = userName ? `${userName}, ` : '';

    if (p.includes('summarize')) {
      return `### Financial Summary for ${namePrefix}${getMonthLabel(selectedMonth)}
- **Total Inflow:** ${formatCurrency(monthIncome, currencySymbol)}
- **Total Outflow:** ${formatCurrency(monthExpenses, currencySymbol)}
- **Net Cashflow:** ${formatCurrency(monthNet, currencySymbol)}
- **Savings Rate:** ${savingsRate.toFixed(1)}% (Your benchmark: ${targetSavingsRate}%)

${
  monthNet < 0
    ? `⚠️ **Action required:** Your expenses exceed income by ${formatCurrency(
        Math.abs(monthNet),
        currencySymbol
      )}. Consider freezing non-essential spending in categories like Shopping or Entertainment.`
    : `✅ **Positive cashflow:** You retained ${formatCurrency(
        monthNet,
        currencySymbol
      )}. You could assign part of this toward your active savings goals.`
}`;
    }

    if (p.includes('overspending') || p.includes('trim') || p.includes('budget')) {
      const overBudgets = budgets.filter((b) => (categoryTotals[b.category] || 0) > b.monthlyLimit);
      if (overBudgets.length > 0) {
        return `### Budget Review for ${namePrefix}${getMonthLabel(selectedMonth)}
You have **${overBudgets.length} category** exceeding defined limits:
${overBudgets
  .map(
    (b) =>
      `- **${b.category}:** Spent ${formatCurrency(
        categoryTotals[b.category] || 0,
        currencySymbol
      )} against limit of ${formatCurrency(b.monthlyLimit, currencySymbol)} (Over by ${formatCurrency(
        (categoryTotals[b.category] || 0) - b.monthlyLimit,
        currencySymbol
      )})`
  )
  .join('\n')}

**Recommendation:** Review these transactions in the Transactions tab and consider lowering flexible subscriptions.`;
      }
      return `Good news, ${userName || 'friend'}! None of your budgeted categories have exceeded their monthly limits in ${getMonthLabel(
        selectedMonth
      )}. Your highest category spend is **${
        Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'
      }**.`;
    }

    if (p.includes('50/30/20')) {
      const needs = monthIncome * 0.5;
      const wants = monthIncome * 0.3;
      const savings = monthIncome * 0.2;
      return `### 50/30/20 Budget Framework for ${namePrefix}${formatCurrency(
        monthIncome,
        currencySymbol
      )}
1. **Essential Needs (50% max):** ${formatCurrency(
        needs,
        currencySymbol
      )} — Rent, groceries, healthcare, utilities.
2. **Discretionary Wants (30% max):** ${formatCurrency(
        wants,
        currencySymbol
      )} — Dining out, entertainment, shopping, hobbies.
3. **Wealth Building & Savings (20% min):** ${formatCurrency(
        savings,
        currencySymbol
      )} — Emergency fund, investments, debt prepayment.`;
    }

    return `Based on your records, ${namePrefix}your net balance in ${getMonthLabel(
      selectedMonth
    )} is ${formatCurrency(
      monthNet,
      currencySymbol
    )} with a savings rate of ${savingsRate.toFixed(1)}%.
You have ${goals.length} active savings goals and ${recurring.length} recurring rules set up.`;
  };

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    const userMsg: Message = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: textToSend,
          context: financialSnapshot,
          userName: userName || undefined,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();
      const botMsg: Message = {
        id: `bot_${Date.now()}`,
        sender: 'assistant',
        text: data.reply || generateRuleBasedFallback(textToSend),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch {
      // Graceful instant fallback
      const fallbackReply = generateRuleBasedFallback(textToSend);
      const botMsg: Message = {
        id: `bot_${Date.now()}`,
        sender: 'assistant',
        text: `${fallbackReply}\n\n*(Note: Instant calculation from your local financial records)*`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, botMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="rounded-3xl border border-white/90 bg-white p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-[10px] font-bold tracking-[0.16em] uppercase text-[#7867B5]">
              GEMINI FINANCIAL INTELLIGENCE
            </div>
            <h2 className="mt-1 font-['Plus_Jakarta_Sans'] text-2xl font-bold tracking-tight text-[#29272F]">
              AI Financial Copilot
            </h2>
            <p className="text-xs text-[#7A7285]">
              Personalized financial analysis grounded in your actual numbers, category trends, budgets, and goals.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {userName ? (
              <div className="flex items-center gap-1.5 rounded-xl border border-[#D5CBE5] bg-[#F7F3FB] px-3 py-1.5 text-xs font-semibold text-[#533E8E]">
                <User className="h-3.5 w-3.5 text-[#7867B5]" />
                <span>Personalized for {userName}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 rounded-xl bg-[#F0ECFA] px-3 py-1.5 text-xs font-semibold text-[#7867B5]">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Grounded in {getMonthLabel(selectedMonth)}</span>
              </div>
            )}

            <button
              onClick={handleClearChat}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#D5CBE5] bg-white px-3 py-1.5 text-xs font-semibold text-[#5B4E80] shadow-xs hover:bg-[#F8F5FC] transition-colors"
              title="Start a fresh conversation"
            >
              <RefreshCw className="h-3 w-3" />
              <span>New Conversation</span>
            </button>
          </div>
        </div>

        {/* Suggestion Chips */}
        <div className="mt-6 pt-4 border-t border-[#F0EBF2]">
          <div className="text-[11px] font-semibold text-[#6E6678] mb-2.5">
            Quick analysis inquiries:
          </div>
          <div className="flex flex-wrap gap-2">
            {PROMPT_SUGGESTIONS.map((s, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(s)}
                disabled={loading}
                className="rounded-xl border border-[#E2D9E8] bg-[#FAF8FB] px-3 py-1.5 text-xs font-medium text-[#4D4556] hover:bg-white hover:border-[#A99BEA] hover:text-[#7867B5] disabled:opacity-50 transition-all text-left"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chat Thread */}
      <div className="rounded-3xl border border-white/90 bg-white shadow-xs overflow-hidden flex flex-col h-[520px]">
        {/* Messages scroll pane */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-3 max-w-3xl ${
                m.sender === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
              }`}
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                  m.sender === 'user'
                    ? 'bg-[#7867B5] text-white shadow-xs'
                    : 'bg-gradient-to-br from-[#A99BEA] to-[#8C7BD0] text-white shadow-xs'
                }`}
              >
                {m.sender === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </div>

              <div
                className={`rounded-2xl p-4 text-xs leading-relaxed shadow-xs ${
                  m.sender === 'user'
                    ? 'bg-[#7867B5] text-white'
                    : 'border border-[#ECE7F0] bg-[#FAF8FC] text-[#29272F]'
                }`}
              >
                <div className="whitespace-pre-wrap space-y-2">{m.text}</div>
                <div
                  className={`mt-2 text-[10px] ${
                    m.sender === 'user' ? 'text-white/70 text-right' : 'text-[#898393]'
                  }`}
                >
                  {m.timestamp}
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-3 text-xs text-[#7A7285] mr-auto">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#A99BEA] to-[#8C7BD0] text-white animate-pulse">
                <Bot className="h-4 w-4" />
              </div>
              <div className="flex items-center gap-2.5 rounded-2xl border border-[#ECE7F0] bg-[#FAF8FC] px-4 py-3 shadow-xs">
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-[#7867B5]" />
                <span className="font-medium text-[#534C5D]">
                  FinPilot AI is analyzing your ledger...
                </span>
                <span className="text-[10px] text-[#8C8397] hidden sm:inline">
                  (You can switch tabs anytime without losing your chat)
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="border-t border-[#F0EBF2] bg-[#FAF8FB] p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(input);
            }}
            className="flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              placeholder={
                userName
                  ? `Ask a financial question, ${userName}...`
                  : 'Ask about spending cuts, budgeting strategies, or goal timelines...'
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 rounded-xl border border-[#E2D9E8] bg-white px-4 py-2.5 text-xs text-[#29272F] outline-none focus:border-[#7867B5] focus:ring-2 focus:ring-[#7867B5]/20 transition-all shadow-inner"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-[#A99BEA] to-[#7867B5] text-white shadow-xs disabled:opacity-50 hover:brightness-105 active:scale-95 transition-all"
              title="Send inquiry"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
          <div className="mt-2 text-[10px] text-center text-[#898393]">
            FinPilot AI provides educational financial analysis based on your records, not certified tax or investment advice.
          </div>
        </div>
      </div>
    </div>
  );
};
