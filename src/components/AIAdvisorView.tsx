import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Sparkles,
  Send,
  Bot,
  User,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Transaction, Budget, SavingsGoal, RecurringRule } from '../types/finance';
import { formatCurrency, getMonthLabel } from '../utils/formatters';
import { useAIChat } from '../context/AIChatContext';

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
  const {
    messages,
    isLoading,
    sendMessage,
    clearChat,
    markChatAsRead,
    setWelcomeIfNeeded,
  } = useAIChat();

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto scroll when messages update
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Mark chat as read when viewing this component
  useEffect(() => {
    markChatAsRead();
  }, [markChatAsRead]);

  // Update welcome message with user name if newly available
  useEffect(() => {
    setWelcomeIfNeeded(userName, getMonthLabel(selectedMonth), transactions.length);
  }, [userName, selectedMonth, transactions.length, setWelcomeIfNeeded]);

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

  const handleSend = (text: string) => {
    if (!text.trim() || isLoading) return;
    sendMessage(text, financialSnapshot, userName);
    setInput('');
  };

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="rounded-3xl border border-white/90 bg-white p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-[10px] font-bold tracking-[0.16em] uppercase text-[#7867B5]">
              GEMINI FINANCIAL INTELLIGENCE
            </div>
            <h2 className="mt-1 font-['Plus_Jakarta_Sans'] text-2xl font-bold tracking-tight text-[#29272F]">
              AI Financial Copilot
            </h2>
            <p className="text-xs text-[#7A7285]">
              Personalized guidance grounded in your actual ledger for {getMonthLabel(selectedMonth)}.
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
              onClick={clearChat}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#D5CBE5] bg-white px-3 py-1.5 text-xs font-semibold text-[#5B4E80] shadow-xs hover:bg-[#F8F5FC] transition-colors"
              title="Start a fresh conversation"
            >
              <RefreshCw className="h-3 w-3" />
              <span>New Conversation</span>
            </button>
          </div>
        </div>

        {/* Suggestion Chips */}
        <div className="mt-5 pt-4 border-t border-[#F0EBF2]">
          <div className="text-[11px] font-semibold text-[#6E6678] mb-2.5">
            Quick analysis inquiries:
          </div>
          <div className="flex flex-wrap gap-2">
            {PROMPT_SUGGESTIONS.map((s, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(s)}
                disabled={isLoading}
                className="rounded-xl border border-[#E2D9E8] bg-[#FAF8FB] px-3 py-1.5 text-xs font-medium text-[#4D4556] hover:bg-white hover:border-[#A99BEA] hover:text-[#7867B5] disabled:opacity-50 transition-all text-left active:scale-[0.98]"
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
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
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

          {isLoading && (
            <div className="flex items-center gap-3 text-xs text-[#7A7285] mr-auto animate-in fade-in">
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
        <div className="border-t border-[#F0EBF2] bg-[#FAF8FB] p-3 sm:p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(input);
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
              className="flex-1 rounded-xl border border-[#E2D9E8] bg-white px-3.5 sm:px-4 py-2.5 text-xs text-[#29272F] outline-none focus:border-[#7867B5] focus:ring-2 focus:ring-[#7867B5]/20 transition-all shadow-inner"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
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
