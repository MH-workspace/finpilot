import React, { useState } from 'react';
import {
  PieChart,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Info,
} from 'lucide-react';
import { Budget, Transaction } from '../types/finance';
import {
  formatCurrency,
  getMonthLabel,
  EXPENSE_CATEGORIES,
  CATEGORY_GLYPHS,
} from '../utils/formatters';

interface BudgetsViewProps {
  budgets: Budget[];
  transactions: Transaction[];
  selectedMonth: string;
  currencySymbol: string;
  onSaveBudget: (category: string, monthlyLimit: number) => void;
  onDeleteBudget: (category: string) => void;
}

export const BudgetsView: React.FC<BudgetsViewProps> = ({
  budgets,
  transactions,
  selectedMonth,
  currencySymbol,
  onSaveBudget,
  onDeleteBudget,
}) => {
  const [selectedCat, setSelectedCat] = useState(EXPENSE_CATEGORIES[0]);
  const [customCat, setCustomCat] = useState('');
  const [limitInput, setLimitInput] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Month-filtered expenses
  const monthExpenses = transactions.filter(
    (tx) => tx.date.startsWith(selectedMonth) && tx.type === 'Expense'
  );
  const monthIncome = transactions
    .filter((tx) => tx.date.startsWith(selectedMonth) && tx.type === 'Income')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const spentByCategory: Record<string, number> = {};
  monthExpenses.forEach((tx) => {
    spentByCategory[tx.category] = (spentByCategory[tx.category] || 0) + tx.amount;
  });

  const totalLimits = budgets.reduce((sum, b) => sum + b.monthlyLimit, 0);
  const totalSpentInBudgeted = budgets.reduce(
    (sum, b) => sum + (spentByCategory[b.category] || 0),
    0
  );

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const cat = isCustom ? customCat.trim() : selectedCat;
    const limit = parseFloat(limitInput);
    if (!cat) {
      setFeedback('Please specify a category name.');
      return;
    }
    if (isNaN(limit) || limit < 0) {
      setFeedback('Limit must be a positive number.');
      return;
    }

    onSaveBudget(cat, limit);
    setFeedback(`Budget for ${cat} set to ${formatCurrency(limit, currencySymbol)}.`);
    setLimitInput('');
    setCustomCat('');
    setIsCustom(false);
  };

  // 50/30/20 Framework Calculations
  const needsCategories = ['Bills', 'Food', 'Transport', 'Health'];
  const wantsCategories = ['Shopping', 'Entertainment', 'Other'];
  const savingsCategories = ['Savings'];

  const actualNeedsSpent = monthExpenses
    .filter((tx) => needsCategories.includes(tx.category))
    .reduce((sum, tx) => sum + tx.amount, 0);
  const actualWantsSpent = monthExpenses
    .filter((tx) => wantsCategories.includes(tx.category))
    .reduce((sum, tx) => sum + tx.amount, 0);

  const idealNeeds = monthIncome * 0.5;
  const idealWants = monthIncome * 0.3;
  const idealSavings = monthIncome * 0.2;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-3xl border border-white/90 bg-white p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-[10px] font-bold tracking-[0.16em] uppercase text-[#7867B5]">
              PLAN WITH CONFIDENCE
            </div>
            <h2 className="mt-1 font-['Plus_Jakarta_Sans'] text-2xl font-bold tracking-tight text-[#29272F]">
              Monthly Budgets
            </h2>
            <p className="text-xs text-[#7A7285]">
              Establish category spending caps for {getMonthLabel(selectedMonth)} and avoid overspending.
            </p>
          </div>
        </div>

        {/* Top Summary Strip */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-2xl border border-[#ECE7F0] bg-[#FAF8FB] p-4">
            <div className="text-[11px] font-semibold text-[#7A7285]">Total Budget Limits</div>
            <div className="mt-1 font-['Plus_Jakarta_Sans'] text-xl font-bold text-[#29272F] tabular-nums">
              {formatCurrency(totalLimits, currencySymbol)}
            </div>
            <div className="text-[10px] text-[#898393] mt-0.5">{budgets.length} categories budgeted</div>
          </div>

          <div className="rounded-2xl border border-[#ECE7F0] bg-[#FAF8FB] p-4">
            <div className="text-[11px] font-semibold text-[#7A7285]">Spent in Budgeted Categories</div>
            <div className="mt-1 font-['Plus_Jakarta_Sans'] text-xl font-bold text-[#29272F] tabular-nums">
              {formatCurrency(totalSpentInBudgeted, currencySymbol)}
            </div>
            <div className="text-[10px] text-[#898393] mt-0.5">
              {totalLimits > 0
                ? `${((totalSpentInBudgeted / totalLimits) * 100).toFixed(0)}% of total allowance used`
                : 'No limits set'}
            </div>
          </div>

          <div className="rounded-2xl border border-[#ECE7F0] bg-[#FAF8FB] p-4">
            <div className="text-[11px] font-semibold text-[#7A7285]">Overall Remaining Cushion</div>
            <div
              className={`mt-1 font-['Plus_Jakarta_Sans'] text-xl font-bold tabular-nums ${
                totalLimits - totalSpentInBudgeted >= 0 ? 'text-[#3E7459]' : 'text-[#9A4E6C]'
              }`}
            >
              {formatCurrency(totalLimits - totalSpentInBudgeted, currencySymbol)}
            </div>
            <div className="text-[10px] text-[#898393] mt-0.5">
              {totalLimits - totalSpentInBudgeted >= 0 ? 'Available surplus' : 'Net category deficit'}
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Set Budget Form + Budget Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Set / Update Budget Form */}
        <div className="lg:col-span-5 rounded-3xl border border-white/90 bg-white p-6 shadow-xs h-fit">
          <div className="flex items-center gap-2 text-xs font-bold text-[#7867B5] uppercase tracking-wider mb-1">
            <Plus className="h-4 w-4" />
            <span>Set or Update Limit</span>
          </div>
          <h3 className="font-['Plus_Jakarta_Sans'] text-base font-bold text-[#29272F]">
            Define Category Limit
          </h3>
          <p className="text-xs text-[#7A7285] mb-4">
            Setting a limit for an existing category updates it immediately.
          </p>

          {feedback && (
            <div className="mb-4 rounded-xl border border-purple-200 bg-purple-50 p-2.5 text-xs text-purple-900">
              {feedback}
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-[#534C5D]">Category</label>
                <button
                  type="button"
                  onClick={() => setIsCustom(!isCustom)}
                  className="text-[11px] font-medium text-[#7867B5] hover:underline"
                >
                  {isCustom ? 'Standard category' : '+ Custom category'}
                </button>
              </div>

              {isCustom ? (
                <input
                  type="text"
                  placeholder="e.g. Pet Care, Gadgets"
                  value={customCat}
                  onChange={(e) => setCustomCat(e.target.value)}
                  className="w-full rounded-xl border border-[#E2D9E8] bg-white px-3.5 py-2.5 text-xs text-[#29272F] outline-none focus:border-[#A99BEA] focus:ring-2 focus:ring-[#A99BEA]/20"
                />
              ) : (
                <select
                  value={selectedCat}
                  onChange={(e) => setSelectedCat(e.target.value)}
                  className="w-full rounded-xl border border-[#E2D9E8] bg-white px-3.5 py-2.5 text-xs text-[#29272F] outline-none focus:border-[#A99BEA] focus:ring-2 focus:ring-[#A99BEA]/20"
                >
                  {EXPENSE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#534C5D] mb-1">
                Monthly Spending Limit ({currencySymbol})
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-xs font-bold text-[#7A7285]">
                  {currencySymbol}
                </span>
                <input
                  type="number"
                  step="100"
                  min="0"
                  placeholder="e.g. 12000"
                  value={limitInput}
                  onChange={(e) => setLimitInput(e.target.value)}
                  className="w-full rounded-xl border border-[#E2D9E8] bg-white pl-8 pr-3.5 py-2.5 text-xs font-semibold tabular-nums text-[#29272F] outline-none focus:border-[#A99BEA] focus:ring-2 focus:ring-[#A99BEA]/20"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-gradient-to-r from-[#A99BEA] to-[#9282D7] py-2.5 text-xs font-semibold text-white shadow-xs hover:brightness-105 active:scale-95 transition-all"
            >
              Save Category Budget
            </button>
          </form>

          {/* 50/30/20 Guideline Box */}
          <div className="mt-6 rounded-2xl border border-[#ECE7F0] bg-[#FAF8FC] p-4 text-xs text-[#6A6273]">
            <div className="font-semibold text-[#29272F] flex items-center gap-1.5 mb-2">
              <Sparkles className="h-4 w-4 text-[#7867B5]" />
              <span>50/30/20 Budget Benchmark</span>
            </div>
            {monthIncome > 0 ? (
              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between">
                  <span>Needs (50% max):</span>
                  <span className="font-semibold text-[#29272F] tabular-nums">
                    {formatCurrency(actualNeedsSpent, currencySymbol)} / {formatCurrency(idealNeeds, currencySymbol)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Wants (30% max):</span>
                  <span className="font-semibold text-[#29272F] tabular-nums">
                    {formatCurrency(actualWantsSpent, currencySymbol)} / {formatCurrency(idealWants, currencySymbol)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Savings target (20%):</span>
                  <span className="font-semibold text-[#3E7459] tabular-nums">
                    {formatCurrency(idealSavings, currencySymbol)}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-[#898393]">
                Record income to see dynamic 50/30/20 budget allocations calculated for your earnings.
              </p>
            )}
          </div>
        </div>

        {/* Budget Cards List */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-3xl border border-white/90 bg-white p-6 shadow-xs">
            <h3 className="font-['Plus_Jakarta_Sans'] text-base font-bold text-[#29272F] mb-1">
              Active Category Budgets
            </h3>
            <p className="text-xs text-[#7A7285] mb-5">
              Live spending progress against your defined limits for {getMonthLabel(selectedMonth)}.
            </p>

            {budgets.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#7A7285]">
                No budgets have been created yet. Use the form on the left to set your first limit.
              </div>
            ) : (
              <div className="space-y-4">
                {budgets.map((b) => {
                  const spent = spentByCategory[b.category] || 0;
                  const ratio = b.monthlyLimit > 0 ? spent / b.monthlyLimit : 0;
                  const percent = Math.min(ratio * 100, 100);
                  const remaining = b.monthlyLimit - spent;
                  const isOver = spent > b.monthlyLimit;
                  const isWarning = !isOver && ratio >= 0.8;

                  return (
                    <div
                      key={b.category}
                      className="rounded-2xl border border-[#ECE7F0] bg-[#FAF8FB] p-4 transition-all hover:bg-white hover:shadow-xs"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F0EBF5] font-mono text-sm text-[#7867B5]">
                            {CATEGORY_GLYPHS[b.category] || '•'}
                          </span>
                          <span className="font-semibold text-xs text-[#29272F]">{b.category}</span>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-xs font-semibold tabular-nums text-[#29272F]">
                            {formatCurrency(spent, currencySymbol)}{' '}
                            <span className="text-[#898393] font-normal">
                              of {formatCurrency(b.monthlyLimit, currencySymbol)}
                            </span>
                          </span>
                          <button
                            onClick={() => onDeleteBudget(b.category)}
                            className="text-[#9E95A5] hover:text-rose-600 transition-colors p-1"
                            title="Delete budget"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Progress meter */}
                      <div className="h-2 w-full overflow-hidden rounded-full bg-[#EAE3F0]">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isOver ? 'bg-[#C25875]' : isWarning ? 'bg-[#E0A458]' : 'bg-[#789687]'
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>

                      <div className="mt-2 flex items-center justify-between text-[11px]">
                        <span
                          className={`font-medium ${
                            isOver ? 'text-[#9A4E6C]' : isWarning ? 'text-[#B47936]' : 'text-[#3E7459]'
                          }`}
                        >
                          {isOver
                            ? `Over by ${formatCurrency(Math.abs(remaining), currencySymbol)}`
                            : `${formatCurrency(remaining, currencySymbol)} remaining`}
                        </span>
                        <span className="text-[#898393] tabular-nums font-mono">
                          {(ratio * 100).toFixed(0)}% used
                        </span>
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
