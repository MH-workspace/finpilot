import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Sparkles,
  Send,
  Bot,
  User,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  PieChart,
  Target,
  Repeat,
  ShieldCheck,
  AlertTriangle,
  Copy,
  Check,
  ArrowRight,
} from 'lucide-react';
import { Transaction, Budget, SavingsGoal, RecurringRule } from '../types/finance';
import { formatCurrency, getMonthLabel } from '../utils/formatters';
import { useAIChat } from '../context/AIChatContext';
import { buildDetailedFinancialSnapshot } from '../utils/financialIntelligence';

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

const CATEGORIZED_PROMPTS = [
  {
    category: 'Cashflow',
    icon: TrendingUp,
    text: "Summarize this month's cashflow and spending",
  },
  {
    category: '50/30/20',
    icon: PieChart,
    text: 'Calculate a 50/30/20 budget recommendation for my income',
  },
  {
    category: 'Budget Audit',
    icon: AlertTriangle,
    text: 'Where am I overspending and how can I fix it?',
  },
  {
    category: 'Subscriptions',
    icon: Repeat,
    text: 'Audit my recurring subscriptions and fixed bills',
  },
  {
    category: 'Goals',
    icon: Target,
    text: 'How can I reach my savings goals faster?',
  },
  {
    category: 'Wealth Habits',
    icon: ShieldCheck,
    text: 'What are 3 practical steps to increase my savings rate this month?',
  },
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
  const [copiedId, setCopiedId] = useState<string | null>(null);
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

  // Build comprehensive financial snapshot
  const financialSnapshot = useMemo(() => {
    return buildDetailedFinancialSnapshot(
      transactions,
      budgets,
      goals,
      recurring,
      selectedMonth,
      currencySymbol,
      targetSavingsRate,
      userName
    );
  }, [
    transactions,
    budgets,
    goals,
    recurring,
    selectedMonth,
    currencySymbol,
    targetSavingsRate,
    userName,
  ]);

  const handleSend = (text: string) => {
    if (!text.trim() || isLoading) return;
    sendMessage(text, financialSnapshot, userName);
    setInput('');
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Render markdown text cleanly
  const renderMessageContent = (text: string) => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let tableRows: string[] = [];
    let inTable = false;

    const flushTable = () => {
      if (tableRows.length > 0) {
        const rows = tableRows.map((r) =>
          r
            .split('|')
            .map((c) => c.trim())
            .filter((c, i, arr) => (i > 0 && i < arr.length - 1) || c.length > 0)
        );

        if (rows.length >= 2) {
          const header = rows[0];
          const body = rows.slice(1).filter((r) => !r.every((c) => c.startsWith(':---') || c.startsWith('---')));
          elements.push(
            <div key={`table_${elements.length}`} className="my-3 overflow-x-auto rounded-xl border border-[#ECE7F0] bg-white">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#F8F6FA] border-b border-[#ECE7F0] text-[#554C63]">
                    {header.map((col, idx) => (
                      <th key={idx} className="px-3 py-2 font-semibold text-[11px]">
                        {col.replace(/\*\*/g, '')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0ECF4]">
                  {body.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-[#FAF8FC]/80">
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="px-3 py-2 text-[#2D2838]">
                          {formatInlineMarkdown(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        tableRows = [];
        inTable = false;
      }
    };

    lines.forEach((line, idx) => {
      const trimmed = line.trim();

      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        inTable = true;
        tableRows.push(trimmed);
        return;
      } else if (inTable) {
        flushTable();
      }

      if (trimmed.startsWith('### ')) {
        elements.push(
          <h4 key={idx} className="mt-3 mb-1.5 font-['Plus_Jakarta_Sans'] text-sm font-bold text-[#2A2338]">
            {trimmed.replace('### ', '')}
          </h4>
        );
      } else if (trimmed.startsWith('## ')) {
        elements.push(
          <h3 key={idx} className="mt-3.5 mb-2 font-['Plus_Jakarta_Sans'] text-base font-bold text-[#2A2338]">
            {trimmed.replace('## ', '')}
          </h3>
        );
      } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        elements.push(
          <div key={idx} className="flex items-start gap-2 my-1 text-xs text-[#373144] pl-1">
            <span className="text-[#7867B5] mt-1 shrink-0 font-bold">•</span>
            <div className="flex-1">{formatInlineMarkdown(trimmed.slice(2))}</div>
          </div>
        );
      } else if (/^\d+\.\s/.test(trimmed)) {
        const numberMatch = trimmed.match(/^(\d+)\.\s(.*)/);
        if (numberMatch) {
          elements.push(
            <div key={idx} className="flex items-start gap-2 my-1 text-xs text-[#373144] pl-1">
              <span className="font-semibold text-[#7867B5] shrink-0">{numberMatch[1]}.</span>
              <div className="flex-1">{formatInlineMarkdown(numberMatch[2])}</div>
            </div>
          );
        }
      } else if (trimmed === '') {
        elements.push(<div key={idx} className="h-1.5" />);
      } else {
        elements.push(
          <p key={idx} className="my-1 text-xs text-[#373144] leading-relaxed">
            {formatInlineMarkdown(trimmed)}
          </p>
        );
      }
    });

    if (inTable) {
      flushTable();
    }

    return elements;
  };

  const formatInlineMarkdown = (text: string) => {
    // Replace **bold**
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-semibold text-[#1F192B]">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  return (
    <div className="space-y-6">
      {/* Hero Header & Live Financial Intelligence Strip */}
      <div className="rounded-3xl border border-white/90 bg-white p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EFEAF6] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#7867B5]">
                <Sparkles className="h-3 w-3 text-[#7867B5]" />
                FinPilot AI Copilot
              </span>
              <span className="text-[11px] font-medium text-[#7D768A]">
                Connected to {getMonthLabel(selectedMonth)}
              </span>
            </div>
            <h2 className="mt-1.5 font-['Plus_Jakarta_Sans'] text-2xl font-bold tracking-tight text-[#29272F]">
              Financial Advisor & Intelligence
            </h2>
            <p className="mt-1 text-xs text-[#6F677A] max-w-xl">
              Real-time cashflow analysis, 50/30/20 allocation blueprints, budget audits, and savings goals acceleration.
            </p>
          </div>

          <div className="flex items-center gap-2 sm:self-center">
            <button
              onClick={clearChat}
              className="flex items-center gap-1.5 rounded-xl border border-[#E4DDEB] bg-white px-3 py-1.5 text-xs font-semibold text-[#665D73] hover:bg-[#F9F7FA] hover:text-[#2A2338] transition-all"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Reset Chat
            </button>
          </div>
        </div>

        {/* Live Metrics Quick Strip */}
        <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4 pt-4 border-t border-[#F2EDF5]">
          <div className="rounded-2xl border border-[#EFEBF4] bg-[#FAF8FC] p-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#797285]">Recorded Inflow</div>
            <div className="mt-1 font-['Plus_Jakarta_Sans'] text-sm font-bold text-[#3B7A57]">
              {formatCurrency(financialSnapshot.income, currencySymbol)}
            </div>
          </div>
          <div className="rounded-2xl border border-[#EFEBF4] bg-[#FAF8FC] p-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#797285]">Recorded Outflow</div>
            <div className="mt-1 font-['Plus_Jakarta_Sans'] text-sm font-bold text-[#8C3A4F]">
              {formatCurrency(financialSnapshot.expenses, currencySymbol)}
            </div>
          </div>
          <div className="rounded-2xl border border-[#EFEBF4] bg-[#FAF8FC] p-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#797285]">Net Cashflow</div>
            <div className={`mt-1 font-['Plus_Jakarta_Sans'] text-sm font-bold ${financialSnapshot.net >= 0 ? 'text-[#3B7A57]' : 'text-[#8C3A4F]'}`}>
              {financialSnapshot.net >= 0 ? '+' : ''}{formatCurrency(financialSnapshot.net, currencySymbol)}
            </div>
          </div>
          <div className="rounded-2xl border border-[#EFEBF4] bg-[#FAF8FC] p-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#797285]">Health Score</div>
            <div className="mt-1 font-['Plus_Jakarta_Sans'] text-sm font-bold text-[#7867B5] flex items-center gap-1.5">
              <span>{financialSnapshot.healthScore}/100</span>
              <span className="text-[10px] font-normal text-[#797285]">
                ({financialSnapshot.healthScore >= 75 ? 'Strong' : 'Moderate'})
              </span>
            </div>
          </div>
        </div>

        {/* Quick Topics */}
        <div className="mt-4 pt-4 border-t border-[#F2EDF5]">
          <div className="text-[11px] font-semibold text-[#483F57] mb-2 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-[#7867B5]" />
            Specialized Financial Inquiries:
          </div>
          <div className="flex flex-wrap gap-2">
            {CATEGORIZED_PROMPTS.map((item, idx) => {
              const Icon = item.icon;
              return (
                <button
                  key={idx}
                  onClick={() => handleSend(item.text)}
                  disabled={isLoading}
                  className="group flex items-center gap-1.5 rounded-xl border border-[#E4DDEB] bg-white px-3 py-1.5 text-xs text-[#483F57] hover:border-[#7867B5] hover:bg-[#F7F4FB] hover:text-[#7867B5] active:scale-95 transition-all text-left disabled:opacity-50"
                >
                  <Icon className="h-3 w-3 text-[#7867B5] shrink-0" />
                  <span>{item.text}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Chat Thread */}
      <div className="rounded-3xl border border-white/90 bg-white shadow-xs overflow-hidden flex flex-col min-h-[480px]">
        {/* Messages */}
        <div className="flex-1 p-4 sm:p-6 space-y-4 overflow-y-auto max-h-[580px]">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-3 max-w-[92%] sm:max-w-[85%] ${
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
                className={`relative group rounded-2xl p-4 text-xs leading-relaxed shadow-xs ${
                  m.sender === 'user'
                    ? 'bg-[#7867B5] text-white'
                    : 'border border-[#ECE7F0] bg-[#FAF8FC] text-[#29272F]'
                }`}
              >
                {m.sender === 'assistant' ? (
                  <div className="space-y-1">{renderMessageContent(m.text)}</div>
                ) : (
                  <div className="whitespace-pre-wrap">{m.text}</div>
                )}

                <div
                  className={`mt-2 flex items-center justify-between gap-3 text-[10px] ${
                    m.sender === 'user' ? 'text-white/70' : 'text-[#898393]'
                  }`}
                >
                  <span>{m.timestamp}</span>
                  {m.sender === 'assistant' && (
                    <button
                      onClick={() => handleCopy(m.id, m.text)}
                      className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-[10px] text-[#7867B5] hover:underline transition-opacity"
                    >
                      {copiedId === m.id ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-600" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          <span>Copy analysis</span>
                        </>
                      )}
                    </button>
                  )}
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
                <span className="font-medium text-[#4D4559]">
                  FinPilot AI is synthesizing your financial data...
                </span>
                <span className="text-[10px] text-[#8C8397] hidden sm:inline">
                  (Safe to navigate across tabs anytime)
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
                  ? `Ask your financial copilot, ${userName}...`
                  : 'Ask about cashflow, 50/30/20 breakdown, budget cuts, or savings...'
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
            FinPilot AI Copilot provides educational financial planning based on your recorded ledger, not certified tax or legal advice.
          </div>
        </div>
      </div>
    </div>
  );
};
