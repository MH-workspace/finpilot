import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownLeft,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Sparkles,
  Target,
  Repeat,
  Plus,
} from 'lucide-react';
import { Transaction, Budget, SavingsGoal, RecurringRule } from '../types/finance';
import {
  formatCurrency,
  formatDate,
  getMonthLabel,
  CATEGORY_COLORS,
  CATEGORY_GLYPHS,
} from '../utils/formatters';

interface DashboardViewProps {
  transactions: Transaction[];
  budgets: Budget[];
  goals: SavingsGoal[];
  recurring: RecurringRule[];
  selectedMonth: string;
  currencySymbol: string;
  targetSavingsRate: number;
  onNavigate: (page: any) => void;
  onOpenAddTransaction: () => void;
  onProcessDueRecurring: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  transactions,
  budgets,
  goals,
  recurring,
  selectedMonth,
  currencySymbol,
  targetSavingsRate,
  onNavigate,
  onOpenAddTransaction,
  onProcessDueRecurring,
}) => {
  // Sliced month transactions
  const monthTx = transactions.filter((tx) => tx.date.startsWith(selectedMonth));
  const monthIncome = monthTx
    .filter((tx) => tx.type === 'Income')
    .reduce((sum, tx) => sum + tx.amount, 0);
  const monthExpenses = monthTx
    .filter((tx) => tx.type === 'Expense')
    .reduce((sum, tx) => sum + tx.amount, 0);
  const monthNet = monthIncome - monthExpenses;
  const savingsRate = monthIncome > 0 ? (monthNet / monthIncome) * 100 : null;

  // Due recurring
  const today = new Date().toISOString().split('T')[0];
  const dueRecurring = recurring.filter((r) => r.active && r.nextDate <= today);

  // Group expenses by category
  const expensesByCategory: Record<string, number> = {};
  monthTx
    .filter((tx) => tx.type === 'Expense')
    .forEach((tx) => {
      expensesByCategory[tx.category] = (expensesByCategory[tx.category] || 0) + tx.amount;
    });

  const sortedCategories = Object.entries(expensesByCategory).sort(
    ([, a], [, b]) => b - a
  );
  const maxCategoryAmount = sortedCategories.length > 0 ? sortedCategories[0][1] : 1;

  // Empty state check
  const isCompletelyEmpty = transactions.length === 0;

  return (
    <div className="space-y-6">
      {/* Calm Hero Card */}
      <div className="relative overflow-hidden rounded-3xl border border-white/90 bg-gradient-to-br from-[#EAE2F5] via-[#EFE6F1] to-[#F5ECF0] p-6 md:p-8 shadow-sm">
        <div className="relative z-10 max-w-2xl">
          <div className="text-[11px] font-bold tracking-[0.16em] uppercase text-[#7867B5]">
            MONTHLY OVERVIEW · {getMonthLabel(selectedMonth)}
          </div>
          <h2 className="mt-2 font-['Plus_Jakarta_Sans'] text-2xl md:text-3xl font-bold tracking-tight text-[#29272F]">
            A little more clarity.<br className="hidden sm:inline" /> A lot more confidence.
          </h2>
          <p className="mt-2 text-xs md:text-sm text-[#6C6377] leading-relaxed">
            Your cash flow, spending patterns, goals, and upcoming commitments — brought together in one calm space.
          </p>
        </div>
        <div className="pointer-events-none absolute -right-12 -top-12 h-64 w-64 rounded-full bg-[#A99BEA]/15 blur-2xl" />
      </div>

      {/* Onboarding Welcome Card when user has no transactions yet */}
      {transactions.length === 0 && (
        <div className="rounded-3xl border border-[#AA9FF1]/40 bg-gradient-to-r from-[#FAF8FD] to-[#F3EEFA] p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#7867B5]">
              <Sparkles className="h-4 w-4" />
              <span>Welcome to FinPilot</span>
            </div>
            <h3 className="font-['Plus_Jakarta_Sans'] text-base font-bold text-[#29272F]">
              Your financial space is ready
            </h3>
            <p className="text-xs text-[#7A7285] max-w-xl">
              Record your first income or expense to generate live cashflow analytics, or set a category budget to begin planning.
            </p>
          </div>
          <button
            onClick={onOpenAddTransaction}
            className="rounded-xl bg-gradient-to-r from-[#A99BEA] to-[#9282D7] px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-[#7867B5]/25 hover:brightness-105 active:scale-95 transition-all whitespace-nowrap self-start sm:self-auto"
          >
            + Record First Entry
          </button>
        </div>
      )}

      {/* Due Recurring items alert banner if any */}
      {dueRecurring.length > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-[#AA9FF1]/40 bg-[#FAF7FD] p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#A99BEA]/20 text-[#6B5BA5]">
              <Repeat className="h-4 w-4" />
            </span>
            <div>
              <div className="text-xs font-semibold text-[#29272F]">
                {dueRecurring.length} recurring rule{dueRecurring.length > 1 ? 's' : ''} scheduled for processing
              </div>
              <div className="text-[11px] text-[#7A7285]">
                {dueRecurring.map((r) => r.description).join(' · ')}
              </div>
            </div>
          </div>
          <button
            onClick={onProcessDueRecurring}
            className="rounded-xl bg-[#7867B5] px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-[#6857A4] transition-colors whitespace-nowrap self-end sm:self-auto"
          >
            Review & Post Due
          </button>
        </div>
      )}

      {/* Primary KPI Metrics Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {/* Income Card */}
        <div className="rounded-2xl border border-white/90 bg-white p-4 md:p-5 shadow-xs transition-transform hover:-translate-y-0.5">
          <div className="flex items-center justify-between text-xs font-semibold text-[#7A7285]">
            <span>Income</span>
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#EAF2ED] text-[#427A5B]">
              <ArrowDownLeft className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="mt-2 font-['Plus_Jakarta_Sans'] text-xl md:text-2xl font-bold tabular-nums tracking-tight text-[#29272F]">
            {formatCurrency(monthIncome, currencySymbol)}
          </div>
          <div className="mt-1 text-[11px] text-[#789687] font-medium">
            Cash inflow for {getMonthLabel(selectedMonth)}
          </div>
        </div>

        {/* Expenses Card */}
        <div className="rounded-2xl border border-white/90 bg-white p-4 md:p-5 shadow-xs transition-transform hover:-translate-y-0.5">
          <div className="flex items-center justify-between text-xs font-semibold text-[#7A7285]">
            <span>Expenses</span>
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#F9ECEF] text-[#9A4E6C]">
              <ArrowUpRight className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="mt-2 font-['Plus_Jakarta_Sans'] text-xl md:text-2xl font-bold tabular-nums tracking-tight text-[#29272F]">
            {formatCurrency(monthExpenses, currencySymbol)}
          </div>
          <div className="mt-1 text-[11px] text-[#9A4E6C] font-medium">
            Recorded outflows this month
          </div>
        </div>

        {/* Net for Month Card */}
        <div className="rounded-2xl border border-white/90 bg-white p-4 md:p-5 shadow-xs transition-transform hover:-translate-y-0.5">
          <div className="flex items-center justify-between text-xs font-semibold text-[#7A7285]">
            <span>Net Cashflow</span>
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-lg ${
                monthNet >= 0 ? 'bg-[#EAF2ED] text-[#427A5B]' : 'bg-[#F9ECEF] text-[#9A4E6C]'
              }`}
            >
              {monthNet >= 0 ? (
                <TrendingUp className="h-3.5 w-3.5" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5" />
              )}
            </span>
          </div>
          <div
            className={`mt-2 font-['Plus_Jakarta_Sans'] text-xl md:text-2xl font-bold tabular-nums tracking-tight ${
              monthNet >= 0 ? 'text-[#3E7459]' : 'text-[#9A4E6C]'
            }`}
          >
            {monthNet >= 0 ? '+' : ''}
            {formatCurrency(monthNet, currencySymbol)}
          </div>
          <div className="mt-1 text-[11px] text-[#7A7285]">
            {monthNet >= 0 ? 'Surplus retained' : 'Deficit this month'}
          </div>
        </div>

        {/* Savings Rate Card */}
        <div className="rounded-2xl border border-white/90 bg-white p-4 md:p-5 shadow-xs transition-transform hover:-translate-y-0.5">
          <div className="flex items-center justify-between text-xs font-semibold text-[#7A7285]">
            <span>Savings Rate</span>
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#F0ECFA] text-[#7867B5]">
              <Target className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="mt-2 font-['Plus_Jakarta_Sans'] text-xl md:text-2xl font-bold tabular-nums tracking-tight text-[#29272F]">
            {savingsRate !== null ? `${savingsRate.toFixed(1)}%` : '—'}
          </div>
          <div className="mt-1 text-[11px] text-[#7A7285]">
            {savingsRate !== null
              ? savingsRate >= targetSavingsRate
                ? `Exceeds ${targetSavingsRate}% target`
                : `${(targetSavingsRate - savingsRate).toFixed(1)}% below ${targetSavingsRate}% target`
              : 'Add income to calculate'}
          </div>
        </div>
      </div>

      {/* Main 2-Column Split: Spending Breakdown & Budget Health */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Spending Breakdown */}
        <div className="lg:col-span-7 rounded-3xl border border-white/90 bg-white p-5 md:p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-['Plus_Jakarta_Sans'] text-sm md:text-base font-bold text-[#29272F]">
                Spending Breakdown
              </h3>
              <p className="text-xs text-[#7A7285]">Expenses by category this month</p>
            </div>
            <button
              onClick={() => onNavigate('Analytics')}
              className="text-xs font-semibold text-[#7867B5] hover:underline"
            >
              Full Analytics →
            </button>
          </div>

          {sortedCategories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <span className="text-3xl text-[#C1B7C7]">◇</span>
              <p className="mt-2 text-xs font-medium text-[#7A7285]">
                No expenses recorded for {getMonthLabel(selectedMonth)} yet.
              </p>
              <button
                onClick={onOpenAddTransaction}
                className="mt-3 rounded-xl border border-[#D5CBE5] bg-[#FAF8FC] px-3.5 py-1.5 text-xs font-semibold text-[#6654A0] hover:bg-[#F0EAF8] transition-colors"
              >
                Record First Expense
              </button>
            </div>
          ) : (
            <div className="space-y-3.5 pt-2">
              {sortedCategories.map(([cat, amount]) => {
                const percentage = monthExpenses > 0 ? (amount / monthExpenses) * 100 : 0;
                const glyph = CATEGORY_GLYPHS[cat] || '•';
                const color = CATEGORY_COLORS[cat] || '#AA9FF1';
                return (
                  <div key={cat} className="group">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[13px] text-[#7867B5]">{glyph}</span>
                        <span className="font-medium text-[#302D35]">{cat}</span>
                      </div>
                      <div className="flex items-center gap-2 tabular-nums">
                        <span className="text-[#898393]">{percentage.toFixed(0)}%</span>
                        <span className="font-semibold text-[#29272F]">
                          {formatCurrency(amount, currencySymbol)}
                        </span>
                      </div>
                    </div>
                    {/* Visual bar meter */}
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[#F3EEF5]">
                      <div
                        className="h-full rounded-full transition-all duration-500 ease-out"
                        style={{
                          width: `${(amount / maxCategoryAmount) * 100}%`,
                          backgroundColor: color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Monthly Budget Health */}
        <div className="lg:col-span-5 rounded-3xl border border-white/90 bg-white p-5 md:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-['Plus_Jakarta_Sans'] text-sm md:text-base font-bold text-[#29272F]">
                  Budget Limits
                </h3>
                <p className="text-xs text-[#7A7285]">Category progress in {getMonthLabel(selectedMonth)}</p>
              </div>
              <button
                onClick={() => onNavigate('Budgets')}
                className="text-xs font-semibold text-[#7867B5] hover:underline"
              >
                Manage →
              </button>
            </div>

            {budgets.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-xs text-[#7A7285]">
                  Set category targets to avoid surprises at month-end.
                </p>
                <button
                  onClick={() => onNavigate('Budgets')}
                  className="mt-3 rounded-xl bg-gradient-to-r from-[#A99BEA] to-[#9282D7] px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs"
                >
                  Create Monthly Budget
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {budgets.slice(0, 5).map((b) => {
                  const spent = expensesByCategory[b.category] || 0;
                  const ratio = b.monthlyLimit > 0 ? spent / b.monthlyLimit : 0;
                  const percent = Math.min(ratio * 100, 100);
                  const isOver = spent > b.monthlyLimit;
                  const isWarning = !isOver && ratio >= 0.8;

                  return (
                    <div key={b.category} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-[#302D35]">{b.category}</span>
                        <span className="tabular-nums font-medium text-[#7A7285]">
                          {formatCurrency(spent, currencySymbol)} of{' '}
                          {formatCurrency(b.monthlyLimit, currencySymbol)}
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-[#F3EEF5]">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isOver
                              ? 'bg-[#C25875]'
                              : isWarning
                              ? 'bg-[#E0A458]'
                              : 'bg-[#789687]'
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-[#898393]">
                        <span>
                          {isOver
                            ? `Over budget by ${formatCurrency(spent - b.monthlyLimit, currencySymbol)}`
                            : `${formatCurrency(b.monthlyLimit - spent, currencySymbol)} remaining`}
                        </span>
                        <span>{ratio > 0 ? `${(ratio * 100).toFixed(0)}%` : '0%'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-[#F0EBF2] text-[11px] text-[#7A7285] flex items-center justify-between">
            <span>{budgets.length} categories tracked</span>
            <button
              onClick={() => onNavigate('Budgets')}
              className="text-[#7867B5] font-semibold hover:underline"
            >
              Add category limit
            </button>
          </div>
        </div>
      </div>

      {/* Rule-Based Financial Insights Strip */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-white/90 bg-[#FAF8FC] p-4 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#7867B5] mb-1">
            <Sparkles className="h-4 w-4" />
            <span>Cashflow Observation</span>
          </div>
          <p className="text-xs text-[#534C5D] leading-relaxed">
            {monthIncome <= 0 ? (
              'Record income this month to see real savings rate and benchmark against the 50/30/20 budget framework.'
            ) : monthNet < 0 ? (
              `Recorded expenses exceed income by ${formatCurrency(
                Math.abs(monthNet),
                currencySymbol
              )}. Review flexible spending categories like Shopping or Entertainment.`
            ) : (
              `Your recorded savings rate is ${savingsRate?.toFixed(
                1
              )}%. You have a surplus of ${formatCurrency(
                monthNet,
                currencySymbol
              )} that can be allocated to your savings goals.`
            )}
          </p>
        </div>

        <div className="rounded-2xl border border-white/90 bg-[#FAF8FC] p-4 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#7867B5] mb-1">
            <Target className="h-4 w-4" />
            <span>Largest Spending Area</span>
          </div>
          <p className="text-xs text-[#534C5D] leading-relaxed">
            {sortedCategories.length > 0 ? (
              `Your biggest outflow in ${getMonthLabel(selectedMonth)} is ${sortedCategories[0][0]} at ${formatCurrency(
                sortedCategories[0][1],
                currencySymbol
              )} (${((sortedCategories[0][1] / monthExpenses) * 100).toFixed(0)}% of total monthly expenses).`
            ) : (
              'Record transactions to view an instant breakdown of your primary expense categories.'
            )}
          </p>
        </div>
      </div>

      {/* Savings Goals Snapshot */}
      <div className="rounded-3xl border border-white/90 bg-white p-5 md:p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-['Plus_Jakarta_Sans'] text-sm md:text-base font-bold text-[#29272F]">
              Savings Goals
            </h3>
            <p className="text-xs text-[#7A7285]">
              {goals.length} target{goals.length === 1 ? '' : 's'} being funded
            </p>
          </div>
          <button
            onClick={() => onNavigate('Savings goals')}
            className="text-xs font-semibold text-[#7867B5] hover:underline"
          >
            Manage Goals →
          </button>
        </div>

        {goals.length === 0 ? (
          <div className="py-6 text-center text-xs text-[#7A7285]">
            No goals yet. Turn a dream purchase or emergency fund into a trackable plan.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {goals.slice(0, 3).map((g) => {
              const progress = Math.min((g.savedAmount / g.targetAmount) * 100, 100);
              const isCompleted = g.savedAmount >= g.targetAmount;
              return (
                <div
                  key={g.id}
                  className="rounded-2xl border border-[#ECE7F0] bg-[#FAF8FB] p-4 transition-all hover:bg-white hover:shadow-xs"
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-[#29272F] truncate">{g.name}</span>
                    {isCompleted && (
                      <span className="text-[10px] font-bold text-[#3E7459] bg-[#EAF2ED] px-2 py-0.5 rounded-full">
                        Achieved
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-[#7A7285] mb-2">
                    {g.targetDate ? `Target: ${formatDate(g.targetDate)}` : 'Ongoing target'}
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[#EAE3F0]">
                    <div
                      className="h-full rounded-full bg-[#789687] transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] tabular-nums">
                    <span className="font-semibold text-[#29272F]">
                      {formatCurrency(g.savedAmount, currencySymbol)}
                    </span>
                    <span className="text-[#898393]">
                      of {formatCurrency(g.targetAmount, currencySymbol)} ({progress.toFixed(0)}%)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Transactions Feed */}
      <div className="rounded-3xl border border-white/90 bg-white p-5 md:p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-['Plus_Jakarta_Sans'] text-sm md:text-base font-bold text-[#29272F]">
              Recent Activity
            </h3>
            <p className="text-xs text-[#7A7285]">
              Latest ledger entries in {getMonthLabel(selectedMonth)}
            </p>
          </div>
          <button
            onClick={() => onNavigate('Transactions')}
            className="text-xs font-semibold text-[#7867B5] hover:underline"
          >
            View All Ledger →
          </button>
        </div>

        {monthTx.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#7A7285]">
            No records for this month yet. Click "+ New Entry" above to add one.
          </div>
        ) : (
          <div className="divide-y divide-[#F0EDF2] overflow-hidden rounded-2xl border border-[#ECE7F0]">
            {monthTx.slice(0, 6).map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-3.5 hover:bg-[#FAF8FC] transition-colors text-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#F0EBF5] font-mono text-sm text-[#7867B5]">
                    {CATEGORY_GLYPHS[tx.category] || '•'}
                  </span>
                  <div className="min-w-0">
                    <div className="font-semibold text-[#29272F] truncate">
                      {tx.description}
                    </div>
                    {/* Zero-pill unboxed metadata as requested in design constitution */}
                    <div className="text-[11px] text-[#898393]">
                      <span>{formatDate(tx.date)}</span>
                      <span className="mx-1 text-[#C4BBC8]">·</span>
                      <span>{tx.category}</span>
                      {tx.notes && (
                        <>
                          <span className="mx-1 text-[#C4BBC8]">·</span>
                          <span className="italic">{tx.notes}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0 pl-3">
                  <div
                    className={`font-semibold tabular-nums ${
                      tx.type === 'Income' ? 'text-[#3E7459]' : 'text-[#29272F]'
                    }`}
                  >
                    {tx.type === 'Income' ? '+' : '−'}
                    {formatCurrency(tx.amount, currencySymbol)}
                  </div>
                  <div className="text-[10px] text-[#898393] uppercase tracking-wider">
                    {tx.type}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
