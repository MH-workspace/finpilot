import React, { useState } from 'react';
import {
  Repeat,
  Plus,
  Trash2,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Play,
  Pause,
  ArrowRight,
} from 'lucide-react';
import { RecurringRule, TransactionType, Frequency } from '../types/finance';
import {
  formatCurrency,
  formatDate,
  getTodayString,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  CATEGORY_GLYPHS,
} from '../utils/formatters';

interface RecurringViewProps {
  rules: RecurringRule[];
  currencySymbol: string;
  onAddRule: (rule: Omit<RecurringRule, 'id'>) => void;
  onUpdateRule: (id: string, updates: Partial<RecurringRule>) => void;
  onDeleteRule: (id: string) => void;
  onProcessDue: () => void;
}

export const RecurringView: React.FC<RecurringViewProps> = ({
  rules,
  currencySymbol,
  onAddRule,
  onUpdateRule,
  onDeleteRule,
  onProcessDue,
}) => {
  // New Rule Form State
  const [desc, setDesc] = useState('');
  const [type, setType] = useState<TransactionType>('Expense');
  const [category, setCategory] = useState('Bills');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<Frequency>('Monthly');
  const [nextDate, setNextDate] = useState(getTodayString());
  const [error, setError] = useState<string | null>(null);

  const today = getTodayString();
  const dueRules = rules.filter((r) => r.active && r.nextDate <= today);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const amt = parseFloat(amount);
    if (!desc.trim()) {
      setError('Please provide a description.');
      return;
    }
    if (isNaN(amt) || amt <= 0) {
      setError('Amount must be greater than zero.');
      return;
    }
    if (!nextDate) {
      setError('Please select the next scheduled date.');
      return;
    }

    onAddRule({
      description: desc.trim(),
      category,
      type,
      amount: amt,
      frequency,
      nextDate,
      active: true,
    });

    setDesc('');
    setAmount('');
    setNextDate(today);
  };

  const categories = type === 'Income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-3xl border border-white/90 bg-white p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-[10px] font-bold tracking-[0.16em] uppercase text-[#7867B5]">
              AUTOMATE THE ROUTINE
            </div>
            <h2 className="mt-1 font-['Plus_Jakarta_Sans'] text-2xl font-bold tracking-tight text-[#29272F]">
              Recurring Transactions
            </h2>
            <p className="text-xs text-[#7A7285]">
              Manage scheduled subscriptions, rent, payroll, and recurring cash flow without blind auto-debits.
            </p>
          </div>
        </div>

        {/* Due Processing Banner */}
        {dueRules.length > 0 && (
          <div className="mt-6 rounded-2xl border border-[#AA9FF1]/50 bg-[#FAF7FD] p-5 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#A99BEA]/20 text-[#6857A4] mt-0.5">
                  <AlertCircle className="h-5 w-5" />
                </span>
                <div>
                  <h4 className="font-semibold text-sm text-[#29272F]">
                    {dueRules.length} recurring rule{dueRules.length > 1 ? 's are' : ' is'} due for posting
                  </h4>
                  <p className="text-xs text-[#7A7285] mt-0.5">
                    FinPilot does not silently touch your bank accounts. You decide when to post due items to your ledger.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-[#585060]">
                    {dueRules.map((r) => (
                      <span
                        key={r.id}
                        className="rounded-lg bg-white/90 border border-[#E5DEE8] px-2.5 py-1 font-medium"
                      >
                        {r.description} · {formatCurrency(r.amount, currencySymbol)} ({r.frequency})
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={onProcessDue}
                className="rounded-xl bg-gradient-to-r from-[#7867B5] to-[#6857A4] px-5 py-2.5 text-xs font-semibold text-white shadow-sm shadow-[#7867B5]/30 hover:brightness-105 active:scale-95 transition-all whitespace-nowrap self-start md:self-center"
              >
                Post {dueRules.length} Due Item{dueRules.length > 1 ? 's' : ''} to Ledger
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Grid: Add Recurring Form + Rules List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Create Rule Form */}
        <div className="lg:col-span-5 rounded-3xl border border-white/90 bg-white p-6 shadow-xs h-fit">
          <div className="flex items-center gap-2 text-xs font-bold text-[#7867B5] uppercase tracking-wider mb-1">
            <Plus className="h-4 w-4" />
            <span>New Schedule</span>
          </div>
          <h3 className="font-['Plus_Jakarta_Sans'] text-base font-bold text-[#29272F]">
            Create Recurring Rule
          </h3>
          <p className="text-xs text-[#7A7285] mb-4">
            Schedule a repeated income or expense with automatic date advances.
          </p>

          {error && (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-800">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-2 rounded-2xl border border-[#E5DEE8] bg-[#F1EBF3] p-1">
              <button
                type="button"
                onClick={() => {
                  setType('Expense');
                  setCategory('Bills');
                }}
                className={`rounded-xl py-2 text-xs font-semibold transition-all ${
                  type === 'Expense' ? 'bg-white text-[#8A3A54] shadow-xs' : 'text-[#6D6577]'
                }`}
              >
                Expense (−)
              </button>
              <button
                type="button"
                onClick={() => {
                  setType('Income');
                  setCategory('Salary');
                }}
                className={`rounded-xl py-2 text-xs font-semibold transition-all ${
                  type === 'Income' ? 'bg-white text-[#2B6849] shadow-xs' : 'text-[#6D6577]'
                }`}
              >
                Income (+)
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#534C5D] mb-1">
                Description
              </label>
              <input
                type="text"
                placeholder={type === 'Expense' ? 'e.g. Fiber Internet' : 'e.g. Salary'}
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                className="w-full rounded-xl border border-[#E2D9E8] bg-white px-3.5 py-2.5 text-xs text-[#29272F] outline-none focus:border-[#A99BEA] focus:ring-2 focus:ring-[#A99BEA]/20"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#534C5D] mb-1">
                  Amount ({currencySymbol})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="1499"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-xl border border-[#E2D9E8] bg-white px-3 py-2.5 text-xs font-semibold tabular-nums text-[#29272F] outline-none focus:border-[#A99BEA] focus:ring-2 focus:ring-[#A99BEA]/20"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#534C5D] mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-xl border border-[#E2D9E8] bg-white px-3 py-2.5 text-xs text-[#29272F] outline-none focus:border-[#A99BEA] focus:ring-2 focus:ring-[#A99BEA]/20"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#534C5D] mb-1">
                  Frequency
                </label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as any)}
                  className="w-full rounded-xl border border-[#E2D9E8] bg-white px-3 py-2.5 text-xs text-[#29272F] outline-none focus:border-[#A99BEA] focus:ring-2 focus:ring-[#A99BEA]/20"
                >
                  <option value="Weekly">Weekly</option>
                  <option value="Bi-Weekly">Bi-Weekly</option>
                  <option value="Monthly">Monthly</option>
                  <option value="Yearly">Yearly</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#534C5D] mb-1">
                  Next Due Date
                </label>
                <input
                  type="date"
                  value={nextDate}
                  onChange={(e) => setNextDate(e.target.value)}
                  className="w-full rounded-xl border border-[#E2D9E8] bg-white px-3 py-2.5 text-xs text-[#29272F] outline-none focus:border-[#A99BEA] focus:ring-2 focus:ring-[#A99BEA]/20"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-gradient-to-r from-[#A99BEA] to-[#9282D7] py-2.5 text-xs font-semibold text-white shadow-xs hover:brightness-105 active:scale-95 transition-all"
            >
              Add Scheduled Rule
            </button>
          </form>
        </div>

        {/* Rules List */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-3xl border border-white/90 bg-white p-6 shadow-xs">
            <h3 className="font-['Plus_Jakarta_Sans'] text-base font-bold text-[#29272F] mb-1">
              Active & Paused Schedules
            </h3>
            <p className="text-xs text-[#7A7285] mb-5">
              Rules will remind you when due and advance automatically once posted.
            </p>

            {rules.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#7A7285]">
                No recurring rules set. Add regular rent, salaries, or subscriptions.
              </div>
            ) : (
              <div className="space-y-3">
                {rules.map((r) => {
                  const isDue = r.active && r.nextDate <= today;
                  return (
                    <div
                      key={r.id}
                      className={`rounded-2xl border p-4 transition-all hover:shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isDue
                          ? 'border-[#AA9FF1]/60 bg-[#FAF7FD]'
                          : r.active
                          ? 'border-[#ECE7F0] bg-white'
                          : 'border-[#ECE7F0] bg-[#F7F4F9] opacity-75'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F0EBF5] font-mono text-sm text-[#7867B5]">
                          {CATEGORY_GLYPHS[r.category] || '•'}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-[#29272F] truncate">
                              {r.description}
                            </span>
                            {isDue && (
                              <span className="text-[10px] font-bold text-[#7867B5] bg-[#F0ECFA] px-2 py-0.5 rounded-full">
                                Due now
                              </span>
                            )}
                            {!r.active && (
                              <span className="text-[10px] font-medium text-[#898393] bg-[#EAE5EC] px-2 py-0.5 rounded-full">
                                Paused
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-[#898393] mt-0.5">
                            <span>{r.frequency}</span>
                            <span className="mx-1">·</span>
                            <span>Next: {formatDate(r.nextDate)}</span>
                            <span className="mx-1">·</span>
                            <span>{r.category}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                        <div className="text-right">
                          <div
                            className={`font-semibold tabular-nums text-xs ${
                              r.type === 'Income' ? 'text-[#3E7459]' : 'text-[#29272F]'
                            }`}
                          >
                            {r.type === 'Income' ? '+' : '−'}
                            {formatCurrency(r.amount, currencySymbol)}
                          </div>
                          <div className="text-[10px] text-[#898393] uppercase">
                            {r.type}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => onUpdateRule(r.id, { active: !r.active })}
                            className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#E2D9E8] bg-white text-[#6A6273] hover:text-[#7867B5] transition-colors"
                            title={r.active ? 'Pause rule' : 'Resume rule'}
                          >
                            {r.active ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                          </button>
                          <button
                            onClick={() => onDeleteRule(r.id)}
                            className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#E2D9E8] bg-white text-[#6A6273] hover:text-rose-600 transition-colors"
                            title="Delete rule"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
