import React, { useState, useMemo } from 'react';
import {
  Download,
  Calendar,
  Filter,
  TrendingUp,
  TrendingDown,
  PieChart as PieIcon,
  BarChart3,
  Layers,
  ArrowUpRight,
  ArrowDownLeft,
  Sparkles,
  ChevronRight,
  X,
  Target,
  Wallet,
  Clock,
  Percent,
} from 'lucide-react';
import { Transaction } from '../types/finance';
import {
  formatCurrency,
  formatDate,
  CATEGORY_COLORS,
  CATEGORY_GLYPHS,
} from '../utils/formatters';

interface AnalyticsViewProps {
  transactions: Transaction[];
  currencySymbol: string;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  transactions,
  currencySymbol,
}) => {
  const [dateRangePreset, setDateRangePreset] = useState<
    '7d' | '30d' | '90d' | '180d' | '365d' | 'all'
  >('180d');
  const [typeFilter, setTypeFilter] = useState<'All' | 'Income' | 'Expense'>('All');
  const [chartMode, setChartMode] = useState<'bars' | 'trend'>('bars');
  const [hoveredMonth, setHoveredMonth] = useState<{
    month: string;
    income: number;
    expense: number;
    net: number;
  } | null>(null);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [drilldownCategory, setDrilldownCategory] = useState<string | null>(null);

  // Filter transactions by chosen range and type
  const filteredData = useMemo(() => {
    if (transactions.length === 0) return [];

    const now = new Date();
    let startDate: Date | null = null;
    if (dateRangePreset === '7d') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
    } else if (dateRangePreset === '30d') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
    } else if (dateRangePreset === '90d') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 90);
    } else if (dateRangePreset === '180d') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 180);
    } else if (dateRangePreset === '365d') {
      startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    }

    const startStr = startDate ? startDate.toISOString().split('T')[0] : '1970-01-01';

    return transactions.filter((tx) => {
      if (tx.date < startStr) return false;
      if (typeFilter !== 'All' && tx.type !== typeFilter) return false;
      return true;
    });
  }, [transactions, dateRangePreset, typeFilter]);

  const totalIncome = useMemo(
    () =>
      filteredData
        .filter((tx) => tx.type === 'Income')
        .reduce((sum, tx) => sum + tx.amount, 0),
    [filteredData]
  );

  const totalExpenses = useMemo(
    () =>
      filteredData
        .filter((tx) => tx.type === 'Expense')
        .reduce((sum, tx) => sum + tx.amount, 0),
    [filteredData]
  );

  const netBalance = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : null;

  // Days in selected period
  const daysInPeriod = useMemo(() => {
    switch (dateRangePreset) {
      case '7d':
        return 7;
      case '30d':
        return 30;
      case '90d':
        return 90;
      case '180d':
        return 180;
      case '365d':
        return 365;
      case 'all': {
        if (transactions.length < 2) return 30;
        const dates = transactions.map((t) => new Date(t.date).getTime());
        const minDate = Math.min(...dates);
        const maxDate = Math.max(...dates);
        const diffDays = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24));
        return Math.max(diffDays, 1);
      }
      default:
        return 30;
    }
  }, [dateRangePreset, transactions]);

  const avgDailySpend = daysInPeriod > 0 ? totalExpenses / daysInPeriod : 0;
  const expenseCount = filteredData.filter((tx) => tx.type === 'Expense').length;
  const avgTicketSize = expenseCount > 0 ? totalExpenses / expenseCount : 0;

  // Monthly cash flow grouped data
  const monthlyAggregates = useMemo(() => {
    const map: Record<string, { month: string; income: number; expense: number; net: number }> = {};
    filteredData.forEach((tx) => {
      const monthKey = tx.date.substring(0, 7); // YYYY-MM
      if (!map[monthKey]) {
        map[monthKey] = { month: monthKey, income: 0, expense: 0, net: 0 };
      }
      if (tx.type === 'Income') map[monthKey].income += tx.amount;
      else map[monthKey].expense += tx.amount;
      map[monthKey].net = map[monthKey].income - map[monthKey].expense;
    });
    return Object.values(map).sort((a, b) => a.month.localeCompare(b.month));
  }, [filteredData]);

  const maxMonthValue = useMemo(() => {
    if (monthlyAggregates.length === 0) return 1;
    return Math.max(...monthlyAggregates.map((m) => Math.max(m.income, m.expense)), 1);
  }, [monthlyAggregates]);

  // Category breakdown for expenses
  const categoryAggregates = useMemo(() => {
    const map: Record<string, number> = {};
    filteredData
      .filter((tx) => tx.type === 'Expense')
      .forEach((tx) => {
        map[tx.category] = (map[tx.category] || 0) + tx.amount;
      });
    return Object.entries(map)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [filteredData, totalExpenses]);

  // Donut chart calculations
  const donutSlices = useMemo(() => {
    const radius = 70;
    const circumference = 2 * Math.PI * radius; // ~439.82
    let accumulatedAngle = 0;

    return categoryAggregates.map((cat) => {
      const ratio = totalExpenses > 0 ? cat.amount / totalExpenses : 0;
      const strokeDash = ratio * circumference;
      const offset = -accumulatedAngle;
      accumulatedAngle += strokeDash;
      return {
        ...cat,
        strokeDash,
        circumference,
        offset,
        color: CATEGORY_COLORS[cat.category] || '#AA9FF1',
      };
    });
  }, [categoryAggregates, totalExpenses]);

  // Active Category details for center of Donut
  const activeDonutCategory = useMemo(() => {
    if (!hoveredCategory) return null;
    return categoryAggregates.find((c) => c.category === hoveredCategory) || null;
  }, [hoveredCategory, categoryAggregates]);

  // Drilldown transactions
  const drilldownTransactions = useMemo(() => {
    if (!drilldownCategory) return [];
    return filteredData
      .filter((tx) => tx.category === drilldownCategory)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [filteredData, drilldownCategory]);

  // Day of Week spending distribution
  const dayOfWeekSpending = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const sums = [0, 0, 0, 0, 0, 0, 0];
    filteredData
      .filter((tx) => tx.type === 'Expense')
      .forEach((tx) => {
        const [y, m, d] = tx.date.split('-').map(Number);
        const dayIdx = new Date(y, m - 1, d).getDay();
        sums[dayIdx] += tx.amount;
      });

    // Reorder Mon to Sun
    const ordered = [1, 2, 3, 4, 5, 6, 0].map((idx) => ({
      day: days[idx],
      amount: sums[idx],
    }));

    const maxDay = Math.max(...sums, 1);
    const highestDay = [...ordered].sort((a, b) => b.amount - a.amount)[0];

    return { ordered, maxDay, highestDay };
  }, [filteredData]);

  // 50/30/20 Rule Analysis
  const rule502030 = useMemo(() => {
    const needsCategories = [
      'Food',
      'Transport',
      'Bills',
      'Health',
      'Education',
      'Groceries',
      'Utilities',
      'Rent',
    ];
    let needs = 0;
    let wants = 0;
    let savings = 0;

    filteredData
      .filter((tx) => tx.type === 'Expense')
      .forEach((tx) => {
        if (tx.category === 'Savings' || tx.category === 'Investments') {
          savings += tx.amount;
        } else if (needsCategories.includes(tx.category)) {
          needs += tx.amount;
        } else {
          wants += tx.amount;
        }
      });

    // Net surplus also contributes to savings if positive
    if (netBalance > 0) {
      savings += netBalance;
    }

    const base = Math.max(totalIncome, totalExpenses, 1);
    const needsPct = (needs / base) * 100;
    const wantsPct = (wants / base) * 100;
    const savingsPct = (savings / base) * 100;

    return {
      needs,
      needsPct,
      wants,
      wantsPct,
      savings,
      savingsPct,
      base,
    };
  }, [filteredData, totalIncome, totalExpenses, netBalance]);

  // Top spending transactions
  const topSpendingItems = useMemo(() => {
    return [...filteredData]
      .filter((tx) => tx.type === 'Expense')
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [filteredData]);

  const handleExportCSV = () => {
    const headers = ['date', 'description', 'category', 'type', 'amount', 'notes'];
    const rows = filteredData.map((tx) => [
      tx.date,
      `"${tx.description.replace(/"/g, '""')}"`,
      `"${tx.category.replace(/"/g, '""')}"`,
      tx.type,
      tx.amount,
      `"${(tx.notes || '').replace(/"/g, '""')}"`,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `finpilot_analytics_report_${dateRangePreset}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header & Date Range Studio */}
      <div className="rounded-3xl border border-white/90 bg-white p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-[10px] font-bold tracking-[0.16em] uppercase text-[#7867B5]">
              FINANCIAL PATTERNS & VELOCITY
            </div>
            <h2 className="mt-1 font-['Plus_Jakarta_Sans'] text-2xl font-bold tracking-tight text-[#29272F]">
              Cash Flow & Spending Analytics
            </h2>
            <p className="text-xs text-[#7A7285]">
              Explore income trends, category distributions, day-of-week habits, and 50/30/20 financial health.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#D5CBE5] bg-white px-3.5 py-2 text-xs font-semibold text-[#5B4E80] shadow-xs hover:bg-[#F8F5FC] transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export Analytics CSV</span>
            </button>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#F0EBF2]">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-[#6A6273] mr-1 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-[#7867B5]" /> Range:
            </span>
            {[
              { id: '7d', label: '7 Days' },
              { id: '30d', label: '30 Days' },
              { id: '90d', label: '90 Days' },
              { id: '180d', label: '6 Months' },
              { id: '365d', label: '1 Year' },
              { id: 'all', label: 'All History' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setDateRangePreset(p.id as any)}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                  dateRangePreset === p.id
                    ? 'bg-[#7867B5] text-white shadow-xs'
                    : 'bg-[#F4EFF6] text-[#6A6273] hover:text-[#29272F] hover:bg-[#EAE2F0]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#6A6273]">Filter Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="rounded-xl border border-[#E2D9E8] bg-[#FAF8FC] px-3 py-1.5 text-xs text-[#29272F] outline-none focus:border-[#7867B5] focus:bg-white"
            >
              <option value="All">All Transactions (±)</option>
              <option value="Income">Income Inflow (+)</option>
              <option value="Expense">Expense Outflow (−)</option>
            </select>
          </div>
        </div>
      </div>

      {/* KPI Financial Health Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {/* Total Income */}
        <div className="rounded-2xl border border-white/90 bg-white p-4 md:p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-[#7A7285]">
            <span>Total Inflow</span>
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#EAF2ED] text-[#427A5B]">
              <ArrowDownLeft className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="mt-2 font-['Plus_Jakarta_Sans'] text-xl md:text-2xl font-bold tabular-nums text-[#3E7459]">
            {formatCurrency(totalIncome, currencySymbol)}
          </div>
          <div className="mt-1 text-[11px] text-[#789687]">
            Recorded across {filteredData.filter((t) => t.type === 'Income').length} credits
          </div>
        </div>

        {/* Total Expenses */}
        <div className="rounded-2xl border border-white/90 bg-white p-4 md:p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-[#7A7285]">
            <span>Total Outflow</span>
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#F9ECEF] text-[#9A4E6C]">
              <ArrowUpRight className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="mt-2 font-['Plus_Jakarta_Sans'] text-xl md:text-2xl font-bold tabular-nums text-[#9A4E6C]">
            {formatCurrency(totalExpenses, currencySymbol)}
          </div>
          <div className="mt-1 text-[11px] text-[#9A4E6C]">
            {expenseCount} debit events in period
          </div>
        </div>

        {/* Net Cash Retained */}
        <div className="rounded-2xl border border-white/90 bg-white p-4 md:p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-[#7A7285]">
            <span>Net Retained</span>
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-lg ${
                netBalance >= 0 ? 'bg-[#EAF2ED] text-[#427A5B]' : 'bg-[#F9ECEF] text-[#9A4E6C]'
              }`}
            >
              {netBalance >= 0 ? (
                <TrendingUp className="h-3.5 w-3.5" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5" />
              )}
            </span>
          </div>
          <div
            className={`mt-2 font-['Plus_Jakarta_Sans'] text-xl md:text-2xl font-bold tabular-nums ${
              netBalance >= 0 ? 'text-[#3E7459]' : 'text-[#9A4E6C]'
            }`}
          >
            {netBalance >= 0 ? '+' : ''}
            {formatCurrency(netBalance, currencySymbol)}
          </div>
          <div className="mt-1 text-[11px] text-[#7A7285]">
            {savingsRate !== null
              ? `${savingsRate.toFixed(1)}% savings retention rate`
              : 'Record income to calculate rate'}
          </div>
        </div>

        {/* Average Daily Spend */}
        <div className="rounded-2xl border border-white/90 bg-white p-4 md:p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-[#7A7285]">
            <span>Daily Outflow Velocity</span>
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#F3EFF8] text-[#7867B5]">
              <Clock className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="mt-2 font-['Plus_Jakarta_Sans'] text-xl md:text-2xl font-bold tabular-nums text-[#29272F]">
            {formatCurrency(avgDailySpend, currencySymbol)}
            <span className="text-xs font-normal text-[#8A8194]">/day</span>
          </div>
          <div className="mt-1 text-[11px] text-[#7A7285]">
            Avg ticket: {formatCurrency(avgTicketSize, currencySymbol)}
          </div>
        </div>
      </div>

      {/* Main Chart Section: Monthly Cash Flow & Trend Visualizer */}
      <div className="rounded-3xl border border-white/90 bg-white p-6 shadow-xs relative">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-['Plus_Jakarta_Sans'] text-base font-bold text-[#29272F]">
                Cash Flow & Net Trajectory
              </h3>
              <span className="rounded-full bg-[#F3EEF9] px-2.5 py-0.5 text-[10px] font-semibold text-[#7867B5]">
                {monthlyAggregates.length} Months Tracked
              </span>
            </div>
            <p className="text-xs text-[#7A7285]">
              Interactive monthly comparison of inflows, outflows, and net capital growth
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* View Switcher: Bar vs Trend */}
            <div className="flex rounded-xl border border-[#E4DCE8] bg-[#F7F3F9] p-0.5 text-xs font-semibold">
              <button
                onClick={() => setChartMode('bars')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1 transition-all ${
                  chartMode === 'bars'
                    ? 'bg-white text-[#29272F] shadow-xs'
                    : 'text-[#6D6577] hover:text-[#29272F]'
                }`}
              >
                <BarChart3 className="h-3.5 w-3.5" />
                <span>Cash Flow Bars</span>
              </button>
              <button
                onClick={() => setChartMode('trend')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1 transition-all ${
                  chartMode === 'trend'
                    ? 'bg-white text-[#29272F] shadow-xs'
                    : 'text-[#6D6577] hover:text-[#29272F]'
                }`}
              >
                <TrendingUp className="h-3.5 w-3.5" />
                <span>Net Trajectory</span>
              </button>
            </div>

            {/* Legend */}
            <div className="hidden md:flex items-center gap-3 text-xs font-medium">
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-md bg-[#4F8D6F]" />
                <span className="text-[#554E5E]">Inflow</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-md bg-[#B35D7E]" />
                <span className="text-[#554E5E]">Outflow</span>
              </div>
            </div>
          </div>
        </div>

        {monthlyAggregates.length === 0 ? (
          <div className="py-14 text-center text-xs text-[#7A7285]">
            No records found for the selected timeframe. Adjust your range above to see cash flow analytics.
          </div>
        ) : (
          <div className="relative pt-2">
            {/* Tooltip Hover Overlay */}
            {hoveredMonth && (
              <div className="absolute top-2 right-4 z-20 rounded-2xl border border-[#E4DCE8] bg-white/95 p-3.5 shadow-lg backdrop-blur-md text-xs space-y-1 min-w-[200px]">
                <div className="font-bold text-[#29272F] border-b border-[#F0EBF2] pb-1 mb-1.5">
                  {new Date(
                    Number(hoveredMonth.month.split('-')[0]),
                    Number(hoveredMonth.month.split('-')[1]) - 1,
                    1
                  ).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </div>
                <div className="flex justify-between items-center text-[#3E7459]">
                  <span>Inflow:</span>
                  <span className="font-semibold tabular-nums">
                    {formatCurrency(hoveredMonth.income, currencySymbol)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[#9A4E6C]">
                  <span>Outflow:</span>
                  <span className="font-semibold tabular-nums">
                    {formatCurrency(hoveredMonth.expense, currencySymbol)}
                  </span>
                </div>
                <div className="flex justify-between items-center font-bold pt-1 border-t border-[#F0EBF2]">
                  <span className="text-[#554E5E]">Net Surplus:</span>
                  <span
                    className={
                      hoveredMonth.net >= 0 ? 'text-[#3E7459] tabular-nums' : 'text-[#9A4E6C] tabular-nums'
                    }
                  >
                    {hoveredMonth.net >= 0 ? '+' : ''}
                    {formatCurrency(hoveredMonth.net, currencySymbol)}
                  </span>
                </div>
              </div>
            )}

            {/* Mode 1: Interactive Grouped Cash Flow Bars */}
            {chartMode === 'bars' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 lg:grid-cols-12 gap-2.5">
                  {monthlyAggregates.map((m) => {
                    const incomePercent = (m.income / maxMonthValue) * 100;
                    const expensePercent = (m.expense / maxMonthValue) * 100;
                    const [year, monthNum] = m.month.split('-').map(Number);
                    const d = new Date(year, monthNum - 1, 1);
                    const monthName = d.toLocaleDateString('en-US', { month: 'short' });
                    const isHovered = hoveredMonth?.month === m.month;

                    return (
                      <div
                        key={m.month}
                        onMouseEnter={() => setHoveredMonth(m)}
                        onMouseLeave={() => setHoveredMonth(null)}
                        className={`flex flex-col items-center justify-end rounded-2xl border p-2.5 transition-all cursor-pointer ${
                          isHovered
                            ? 'border-[#7867B5] bg-white shadow-md ring-2 ring-[#7867B5]/20'
                            : 'border-[#F0EAF2] bg-[#FAF8FB] hover:bg-white hover:border-[#D5CBE5]'
                        }`}
                      >
                        {/* Bars container */}
                        <div className="flex h-40 w-full items-end justify-center gap-1.5 pb-2">
                          {/* Inflow Bar */}
                          <div
                            className="w-3 sm:w-3.5 rounded-t-lg bg-gradient-to-t from-[#41765A] to-[#5AA380] transition-all duration-300 shadow-xs"
                            style={{ height: `${Math.max(incomePercent, 4)}%` }}
                            title={`Income: ${formatCurrency(m.income, currencySymbol)}`}
                          />
                          {/* Outflow Bar */}
                          <div
                            className="w-3 sm:w-3.5 rounded-t-lg bg-gradient-to-t from-[#9B4867] to-[#C96F90] transition-all duration-300 shadow-xs"
                            style={{ height: `${Math.max(expensePercent, 4)}%` }}
                            title={`Expense: ${formatCurrency(m.expense, currencySymbol)}`}
                          />
                        </div>

                        {/* Month Label */}
                        <div className="text-[11px] font-bold text-[#29272F]">{monthName}</div>
                        <div
                          className={`text-[10px] font-semibold tabular-nums mt-0.5 ${
                            m.net >= 0 ? 'text-[#3E7459]' : 'text-[#9A4E6C]'
                          }`}
                        >
                          {m.net >= 0 ? '+' : ''}
                          {formatCurrency(m.net, currencySymbol)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Mode 2: Net Savings Trajectory Area & Line */}
            {chartMode === 'trend' && (
              <div className="py-2">
                <div className="h-56 w-full relative">
                  {/* SVG Area Chart */}
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 800 200" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#7867B5" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="#7867B5" stopOpacity="0.02" />
                      </linearGradient>
                    </defs>

                    {/* Horizontal Zero/Reference lines */}
                    <line x1="0" y1="100" x2="800" y2="100" stroke="#E6E0EC" strokeDasharray="4 4" strokeWidth="1" />

                    {/* Area Polygon & Curve */}
                    {(() => {
                      if (monthlyAggregates.length < 2) return null;
                      const count = monthlyAggregates.length;
                      const minNet = Math.min(...monthlyAggregates.map((m) => m.net), 0);
                      const maxNet = Math.max(...monthlyAggregates.map((m) => m.net), 100);
                      const range = Math.max(maxNet - minNet, 1);

                      const points = monthlyAggregates.map((m, idx) => {
                        const x = (idx / (count - 1)) * 800;
                        const y = 180 - ((m.net - minNet) / range) * 160;
                        return { x, y, m };
                      });

                      const pathD = points.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`, '');
                      const areaD = `${pathD} L 800 200 L 0 200 Z`;

                      return (
                        <>
                          <path d={areaD} fill="url(#areaGradient)" />
                          <path d={pathD} fill="none" stroke="#7867B5" strokeWidth="3" strokeLinecap="round" />
                          {points.map((p, idx) => (
                            <circle
                              key={idx}
                              cx={p.x}
                              cy={p.y}
                              r="5"
                              className="fill-white stroke-[#7867B5] stroke-[2.5] hover:r-7 transition-all cursor-pointer"
                              onMouseEnter={() => setHoveredMonth(p.m)}
                              onMouseLeave={() => setHoveredMonth(null)}
                            />
                          ))}
                        </>
                      );
                    })()}
                  </svg>
                </div>

                {/* X-Axis Month Labels */}
                <div className="flex justify-between text-[11px] font-semibold text-[#8C8397] pt-3 border-t border-[#F0EBF2]">
                  {monthlyAggregates.map((m) => {
                    const [y, mo] = m.month.split('-').map(Number);
                    return (
                      <span key={m.month}>
                        {new Date(y, mo - 1, 1).toLocaleDateString('en-US', { month: 'short' })}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Row 2: Category Spending Distribution (Donut + Legend) & 50/30/20 Framework */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Category Donut & Interactive Breakdown */}
        <div className="lg:col-span-7 rounded-3xl border border-white/90 bg-white p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-['Plus_Jakarta_Sans'] text-base font-bold text-[#29272F]">
                  Category Spending Distribution
                </h3>
                <p className="text-xs text-[#7A7285]">
                  Hover over any slice or click a category below to inspect transactions
                </p>
              </div>
              <span className="text-xs font-semibold text-[#7867B5]">
                {categoryAggregates.length} Categories
              </span>
            </div>

            {categoryAggregates.length === 0 ? (
              <div className="py-14 text-center text-xs text-[#7A7285]">
                No expense records found in this timeframe.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center pt-2">
                {/* SVG Donut Ring */}
                <div className="md:col-span-5 flex justify-center relative">
                  <div className="relative h-48 w-48 flex items-center justify-center">
                    <svg className="h-full w-full -rotate-90" viewBox="0 0 200 200">
                      {/* Background track circle */}
                      <circle
                        cx="100"
                        cy="100"
                        r="70"
                        fill="transparent"
                        stroke="#F5F0F8"
                        strokeWidth="24"
                      />
                      {/* Dynamic Slices */}
                      {donutSlices.map((slice) => {
                        const isHovered = hoveredCategory === slice.category;
                        return (
                          <circle
                            key={slice.category}
                            cx="100"
                            cy="100"
                            r="70"
                            fill="transparent"
                            stroke={slice.color}
                            strokeWidth={isHovered ? 28 : 24}
                            strokeDasharray={`${slice.strokeDash} ${slice.circumference}`}
                            strokeDashoffset={slice.offset}
                            strokeLinecap="round"
                            className="transition-all duration-300 cursor-pointer"
                            onMouseEnter={() => setHoveredCategory(slice.category)}
                            onMouseLeave={() => setHoveredCategory(null)}
                            onClick={() =>
                              setDrilldownCategory(
                                drilldownCategory === slice.category ? null : slice.category
                              )
                            }
                          />
                        );
                      })}
                    </svg>

                    {/* Donut Center Label */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
                      {activeDonutCategory ? (
                        <>
                          <span className="font-mono text-base text-[#7867B5]">
                            {CATEGORY_GLYPHS[activeDonutCategory.category] || '•'}
                          </span>
                          <span className="text-[11px] font-bold text-[#29272F] truncate max-w-[100px]">
                            {activeDonutCategory.category}
                          </span>
                          <span className="text-xs font-bold text-[#7867B5] tabular-nums mt-0.5">
                            {formatCurrency(activeDonutCategory.amount, currencySymbol)}
                          </span>
                          <span className="text-[10px] text-[#8C8397]">
                            {activeDonutCategory.percentage.toFixed(1)}%
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-[10px] font-semibold text-[#8C8397] uppercase tracking-wider">
                            Total Outflow
                          </span>
                          <span className="font-['Plus_Jakarta_Sans'] text-sm font-bold text-[#29272F] tabular-nums">
                            {formatCurrency(totalExpenses, currencySymbol)}
                          </span>
                          <span className="text-[10px] text-[#8C8397]">
                            {categoryAggregates.length} categories
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Interactive Legend List */}
                <div className="md:col-span-7 space-y-2.5 max-h-56 overflow-y-auto pr-1">
                  {categoryAggregates.map((cat) => {
                    const color = CATEGORY_COLORS[cat.category] || '#AA9FF1';
                    const glyph = CATEGORY_GLYPHS[cat.category] || '•';
                    const isHovered = hoveredCategory === cat.category;
                    const isDrill = drilldownCategory === cat.category;

                    return (
                      <div
                        key={cat.category}
                        onMouseEnter={() => setHoveredCategory(cat.category)}
                        onMouseLeave={() => setHoveredCategory(null)}
                        onClick={() =>
                          setDrilldownCategory(isDrill ? null : cat.category)
                        }
                        className={`p-2 rounded-xl transition-all cursor-pointer ${
                          isDrill
                            ? 'bg-[#EFE8F7] border border-[#7867B5]/40 shadow-xs'
                            : isHovered
                            ? 'bg-[#F8F5FA]'
                            : 'hover:bg-[#FAF8FB]'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs mb-1">
                          <div className="flex items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: color }}
                            />
                            <span className="font-mono text-xs text-[#7867B5]">{glyph}</span>
                            <span className="font-semibold text-[#29272F]">{cat.category}</span>
                            {isDrill && (
                              <span className="text-[9px] font-bold uppercase rounded bg-[#7867B5] text-white px-1.5 py-0.2">
                                Inspecting
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 tabular-nums">
                            <span className="text-[11px] text-[#8C8397]">
                              {cat.percentage.toFixed(1)}%
                            </span>
                            <span className="font-bold text-[#29272F]">
                              {formatCurrency(cat.amount, currencySymbol)}
                            </span>
                          </div>
                        </div>

                        {/* Visual Progress Bar */}
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#F3EEF5]">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${cat.percentage}%`,
                              backgroundColor: color,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-[#F0EBF2] flex items-center justify-between text-[11px] text-[#8C8397]">
            <span>Click any category to open transaction drilldown</span>
            {drilldownCategory && (
              <button
                onClick={() => setDrilldownCategory(null)}
                className="text-[#7867B5] font-semibold hover:underline"
              >
                Clear inspection
              </button>
            )}
          </div>
        </div>

        {/* 50/30/20 Budget Health Framework Card */}
        <div className="lg:col-span-5 rounded-3xl border border-white/90 bg-white p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-['Plus_Jakarta_Sans'] text-base font-bold text-[#29272F]">
                  50/30/20 Framework
                </h3>
                <p className="text-xs text-[#7A7285]">
                  Benchmark actual cash distribution against standard financial health targets
                </p>
              </div>
              <span className="rounded-full bg-[#EAF2ED] p-1.5 text-[#3E7459]">
                <Target className="h-4 w-4" />
              </span>
            </div>

            {/* Framework Meters */}
            <div className="space-y-4 pt-2">
              {/* Needs (50%) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#29272F]">
                    Essential Needs <span className="font-normal text-[#8C8397]">(Target: 50%)</span>
                  </span>
                  <span className="font-bold text-[#29272F] tabular-nums">
                    {rule502030.needsPct.toFixed(1)}% · {formatCurrency(rule502030.needs, currencySymbol)}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-[#F3EEF5]">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      rule502030.needsPct <= 50 ? 'bg-[#5AA380]' : 'bg-[#E0A458]'
                    }`}
                    style={{ width: `${Math.min(rule502030.needsPct, 100)}%` }}
                  />
                </div>
                <div className="text-[10px] text-[#8C8397]">
                  Rent, Bills, Groceries, Utilities, Healthcare, Transport
                </div>
              </div>

              {/* Wants (30%) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#29272F]">
                    Discretionary Wants <span className="font-normal text-[#8C8397]">(Target: 30%)</span>
                  </span>
                  <span className="font-bold text-[#29272F] tabular-nums">
                    {rule502030.wantsPct.toFixed(1)}% · {formatCurrency(rule502030.wants, currencySymbol)}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-[#F3EEF5]">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      rule502030.wantsPct <= 30 ? 'bg-[#7867B5]' : 'bg-[#C25875]'
                    }`}
                    style={{ width: `${Math.min(rule502030.wantsPct, 100)}%` }}
                  />
                </div>
                <div className="text-[10px] text-[#8C8397]">
                  Dining out, Shopping, Entertainment, Travel, Subscriptions
                </div>
              </div>

              {/* Savings & Debt (20%) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#29272F]">
                    Savings & Surplus <span className="font-normal text-[#8C8397]">(Target: 20%)</span>
                  </span>
                  <span className="font-bold text-[#29272F] tabular-nums">
                    {rule502030.savingsPct.toFixed(1)}% · {formatCurrency(rule502030.savings, currencySymbol)}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-[#F3EEF5]">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      rule502030.savingsPct >= 20 ? 'bg-[#5AA380]' : 'bg-[#7867B5]'
                    }`}
                    style={{ width: `${Math.min(rule502030.savingsPct, 100)}%` }}
                  />
                </div>
                <div className="text-[10px] text-[#8C8397]">
                  Direct Savings, Investments, and Period Net Surplus
                </div>
              </div>
            </div>
          </div>

          {/* Actionable Health Insight */}
          <div className="mt-5 rounded-2xl bg-[#FAF8FC] border border-[#ECE5F2] p-3.5 text-xs text-[#554E5E] space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-[#7867B5]">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Framework Assessment</span>
            </div>
            <p className="text-[11px] leading-relaxed text-[#6E6678]">
              {rule502030.needsPct > 50
                ? `Needs are at ${rule502030.needsPct.toFixed(0)}% (exceeding 50% guideline). Look for fixed bill optimizations to free up cash flow.`
                : rule502030.savingsPct >= 20
                ? `Outstanding! You retained ${rule502030.savingsPct.toFixed(0)}% for savings and capital accumulation in this timeframe.`
                : `Your current savings rate is ${rule502030.savingsPct.toFixed(0)}%. Limiting discretionary wants could bring you closer to the 20% savings milestone.`}
            </p>
          </div>
        </div>
      </div>

      {/* Drilldown Inspector Card (Conditional) */}
      {drilldownCategory && (
        <div className="rounded-3xl border border-[#7867B5]/30 bg-white p-6 shadow-md transition-all animate-fadeIn">
          <div className="flex items-center justify-between mb-4 border-b border-[#F0EBF2] pb-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F0EBF5] font-mono text-base text-[#7867B5]">
                {CATEGORY_GLYPHS[drilldownCategory] || '•'}
              </span>
              <div>
                <h4 className="font-['Plus_Jakarta_Sans'] text-base font-bold text-[#29272F]">
                  {drilldownCategory} Category Drilldown
                </h4>
                <p className="text-xs text-[#7A7285]">
                  Showing all {drilldownTransactions.length} transaction{drilldownTransactions.length === 1 ? '' : 's'} in selected period
                </p>
              </div>
            </div>
            <button
              onClick={() => setDrilldownCategory(null)}
              className="flex items-center gap-1 rounded-xl border border-[#D5CBE5] bg-white px-3 py-1.5 text-xs font-semibold text-[#5B4E80] hover:bg-[#F8F5FC]"
            >
              <X className="h-3.5 w-3.5" />
              <span>Close Inspection</span>
            </button>
          </div>

          {drilldownTransactions.length === 0 ? (
            <div className="py-6 text-center text-xs text-[#7A7285]">
              No transactions found for {drilldownCategory} in the selected timeframe.
            </div>
          ) : (
            <div className="divide-y divide-[#F0EDF2] max-h-72 overflow-y-auto rounded-2xl border border-[#ECE7F0]">
              {drilldownTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="p-3 text-xs flex justify-between items-center hover:bg-[#FAF8FC] transition-colors"
                >
                  <div>
                    <div className="font-semibold text-[#29272F]">{tx.description}</div>
                    <div className="text-[11px] text-[#8C8397]">
                      {formatDate(tx.date)} {tx.notes && `· ${tx.notes}`}
                    </div>
                  </div>
                  <div className="font-bold tabular-nums text-sm text-[#9A4E6C]">
                    {formatCurrency(tx.amount, currencySymbol)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Row 3: Day of Week Spending Behavior & Largest Single Outlays */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Day-of-Week Spending Heatmap/Bars */}
        <div className="lg:col-span-7 rounded-3xl border border-white/90 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-['Plus_Jakarta_Sans'] text-base font-bold text-[#29272F]">
                Day-of-the-Week Spending Habits
              </h3>
              <p className="text-xs text-[#7A7285]">
                Outflows by weekday to pinpoint peak spending days
              </p>
            </div>
            {dayOfWeekSpending.highestDay && dayOfWeekSpending.highestDay.amount > 0 && (
              <span className="rounded-full bg-[#F3EEF9] px-2.5 py-1 text-[11px] font-bold text-[#7867B5]">
                Peak: {dayOfWeekSpending.highestDay.day} ({formatCurrency(dayOfWeekSpending.highestDay.amount, currencySymbol)})
              </span>
            )}
          </div>

          <div className="grid grid-cols-7 gap-2 pt-4">
            {dayOfWeekSpending.ordered.map((item) => {
              const heightPercent =
                dayOfWeekSpending.maxDay > 0
                  ? (item.amount / dayOfWeekSpending.maxDay) * 100
                  : 0;
              const isPeak =
                item.amount === dayOfWeekSpending.highestDay?.amount && item.amount > 0;

              return (
                <div
                  key={item.day}
                  className="flex flex-col items-center justify-end rounded-2xl border border-[#F0EAF2] bg-[#FAF8FB] p-2.5 transition-colors hover:bg-white"
                >
                  <div className="flex h-28 w-full items-end justify-center pb-2">
                    <div
                      className={`w-5 sm:w-6 rounded-t-lg transition-all duration-300 ${
                        isPeak
                          ? 'bg-gradient-to-t from-[#7867B5] to-[#A294DA] shadow-xs'
                          : 'bg-[#CCA5C3]'
                      }`}
                      style={{ height: `${Math.max(heightPercent, 6)}%` }}
                      title={`${item.day}: ${formatCurrency(item.amount, currencySymbol)}`}
                    />
                  </div>
                  <div className={`text-xs font-bold ${isPeak ? 'text-[#7867B5]' : 'text-[#29272F]'}`}>
                    {item.day}
                  </div>
                  <div className="text-[10px] font-semibold text-[#8C8397] tabular-nums mt-0.5 truncate max-w-full">
                    {formatCurrency(item.amount, currencySymbol)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Highest Single Outflows */}
        <div className="lg:col-span-5 rounded-3xl border border-white/90 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-['Plus_Jakarta_Sans'] text-base font-bold text-[#29272F]">
                Largest Single Outflows
              </h3>
              <p className="text-xs text-[#7A7285]">Top individual expenses in timeframe</p>
            </div>
            <span className="text-[11px] font-semibold text-[#8C8397]">Top 5</span>
          </div>

          {topSpendingItems.length === 0 ? (
            <div className="py-10 text-center text-xs text-[#7A7285]">
              No expenses recorded in this period.
            </div>
          ) : (
            <div className="divide-y divide-[#F0EDF2] rounded-2xl border border-[#ECE7F0] overflow-hidden">
              {topSpendingItems.map((tx) => (
                <div
                  key={tx.id}
                  className="p-3 text-xs flex justify-between items-center hover:bg-[#FAF8FC] transition-colors"
                >
                  <div className="min-w-0 pr-3">
                    <div className="font-semibold text-[#29272F] truncate">{tx.description}</div>
                    <div className="text-[11px] text-[#8C8397]">
                      {formatDate(tx.date)} ·{' '}
                      <span className="font-medium text-[#655D70]">{tx.category}</span>
                    </div>
                  </div>
                  <div className="font-bold tabular-nums text-sm text-[#9A4E6C] shrink-0">
                    {formatCurrency(tx.amount, currencySymbol)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
