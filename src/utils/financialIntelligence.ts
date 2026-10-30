import { Transaction, Budget, SavingsGoal, RecurringRule } from '../types/finance';

export interface UnusualCategorySpike {
  category: string;
  currentMonthSpend: number;
  historicalMonthlyAverage: number;
  percentAboveAverage: number;
}

export interface LargeExpenseOutlier {
  date: string;
  description: string;
  category: string;
  amount: number;
  shareOfMonthExpensesPct: string;
}

export interface FinancialSnapshot {
  userName?: string;
  selectedMonth: string;
  currencySymbol: string;
  income: number;
  expenses: number;
  net: number;
  savingsRatePercentage: string;
  targetSavingsRate: number;
  incomeByCategory: Record<string, number>;
  expensesByCategory: Record<string, number>;
  topExpenseCategory?: { name: string; amount: number; percentage: string };
  budgets: {
    category: string;
    monthlyLimit: number;
    spentThisMonth: number;
    percentageUsed: number;
    isOver: boolean;
    isNearLimit: boolean;
    remaining: number;
  }[];
  overBudgetCount: number;
  savingsGoals: {
    name: string;
    targetAmount: number;
    savedAmount: number;
    remaining: number;
    percentComplete: string;
    targetDate?: string;
    estimatedMonthsLeft?: number;
    monthlyNeeded?: number;
  }[];
  recurringRules: {
    description: string;
    amount: number;
    frequency: string;
    category: string;
    type: string;
  }[];
  totalMonthlyRecurringExpense: number;
  totalMonthlyRecurringIncome: number;
  monthTransactionsCount: number;
  totalTransactionsCount: number;
  recentTransactions: {
    date: string;
    description: string;
    category: string;
    type: string;
    amount: number;
  }[];
  unusualSpending: {
    categorySpikes: UnusualCategorySpike[];
    largeSingleExpenses: LargeExpenseOutlier[];
  };
  needsTotal: number;
  wantsTotal: number;
  savingsTotal: number;
  healthScore: number;
}

// Classify expense categories into 50/30/20 buckets
const NEEDS_CATEGORIES = new Set(['Bills', 'Food', 'Transport', 'Health', 'Education']);

export function buildDetailedFinancialSnapshot(
  transactions: Transaction[],
  budgets: Budget[],
  goals: SavingsGoal[],
  recurring: RecurringRule[],
  selectedMonth: string,
  currencySymbol: string = '₹',
  targetSavingsRate: number = 20,
  userName: string = ''
): FinancialSnapshot {
  const monthTx = transactions.filter((tx) => tx.date.startsWith(selectedMonth));
  const monthIncomeTx = monthTx.filter((tx) => tx.type === 'Income');
  const monthExpenseTx = monthTx.filter((tx) => tx.type === 'Expense');

  const income = monthIncomeTx.reduce((sum, tx) => sum + tx.amount, 0);
  const expenses = monthExpenseTx.reduce((sum, tx) => sum + tx.amount, 0);
  const net = income - expenses;
  const savingsRate = income > 0 ? (net / income) * 100 : 0;

  const incomeByCategory: Record<string, number> = {};
  monthIncomeTx.forEach((tx) => {
    incomeByCategory[tx.category] = (incomeByCategory[tx.category] || 0) + tx.amount;
  });

  const categoryTotals: Record<string, number> = {};
  monthExpenseTx.forEach((tx) => {
    categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + tx.amount;
  });

  let topCategoryName = '';
  let topCategoryAmount = 0;
  for (const [cat, amt] of Object.entries(categoryTotals)) {
    if (amt > topCategoryAmount) {
      topCategoryAmount = amt;
      topCategoryName = cat;
    }
  }

  const topExpenseCategory =
    topCategoryAmount > 0
      ? {
          name: topCategoryName,
          amount: topCategoryAmount,
          percentage: expenses > 0 ? ((topCategoryAmount / expenses) * 100).toFixed(1) : '0',
        }
      : undefined;

  // Detect unusual category spikes relative to prior months in the user's ledger
  const priorMonthCategoryMap: Record<string, Record<string, number>> = {};
  const priorMonthsSet = new Set<string>();
  transactions.forEach((tx) => {
    if (tx.type !== 'Expense' || !tx.date || tx.date.length < 7) return;
    const m = tx.date.slice(0, 7);
    if (m === selectedMonth) return;
    priorMonthsSet.add(m);
    if (!priorMonthCategoryMap[tx.category]) {
      priorMonthCategoryMap[tx.category] = {};
    }
    priorMonthCategoryMap[tx.category][m] =
      (priorMonthCategoryMap[tx.category][m] || 0) + tx.amount;
  });

  const priorMonthCount = priorMonthsSet.size;
  const categorySpikes: UnusualCategorySpike[] = [];
  if (priorMonthCount > 0) {
    for (const [cat, currentAmt] of Object.entries(categoryTotals)) {
      const catHistory = priorMonthCategoryMap[cat];
      if (!catHistory) continue;
      const totalPrior = Object.values(catHistory).reduce((s, v) => s + v, 0);
      const avgMonthly = totalPrior / priorMonthCount;
      if (avgMonthly > 0 && currentAmt >= avgMonthly * 1.25) {
        categorySpikes.push({
          category: cat,
          currentMonthSpend: Math.round(currentAmt * 100) / 100,
          historicalMonthlyAverage: Math.round(avgMonthly * 100) / 100,
          percentAboveAverage: Math.round(((currentAmt - avgMonthly) / avgMonthly) * 100),
        });
      }
    }
    categorySpikes.sort((a, b) => b.percentAboveAverage - a.percentAboveAverage);
  }

  // Detect unusually large individual expenses within the selected month
  const avgExpenseSize = monthExpenseTx.length > 0 ? expenses / monthExpenseTx.length : 0;
  const largeSingleExpenses: LargeExpenseOutlier[] = monthExpenseTx
    .filter(
      (tx) =>
        (monthExpenseTx.length >= 2 && expenses > 0 && tx.amount >= expenses * 0.35) ||
        (monthExpenseTx.length >= 3 && avgExpenseSize > 0 && tx.amount >= avgExpenseSize * 2)
    )
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)
    .map((tx) => ({
      date: tx.date,
      description: tx.description,
      category: tx.category,
      amount: tx.amount,
      shareOfMonthExpensesPct:
        expenses > 0 ? ((tx.amount / expenses) * 100).toFixed(1) : '0.0',
    }));

  let overBudgetCount = 0;
  const budgetDetails = budgets.map((b) => {
    const spent = categoryTotals[b.category] || 0;
    const percentageUsed = b.monthlyLimit > 0 ? Math.round((spent / b.monthlyLimit) * 100) : 0;
    const isOver = spent > b.monthlyLimit;
    const isNearLimit = !isOver && percentageUsed >= 80;
    if (isOver) overBudgetCount++;
    return {
      category: b.category,
      monthlyLimit: b.monthlyLimit,
      spentThisMonth: spent,
      percentageUsed,
      isOver,
      isNearLimit,
      remaining: Math.max(0, b.monthlyLimit - spent),
    };
  });

  const now = new Date();
  const goalDetails = goals.map((g) => {
    const remaining = Math.max(0, g.targetAmount - g.savedAmount);
    const percentComplete =
      g.targetAmount > 0 ? ((g.savedAmount / g.targetAmount) * 100).toFixed(0) : '0';

    let monthsLeft = 6;
    if (g.targetDate) {
      const targetD = new Date(g.targetDate);
      const diffMonths =
        (targetD.getFullYear() - now.getFullYear()) * 12 +
        (targetD.getMonth() - now.getMonth());
      monthsLeft = Math.max(1, diffMonths);
    }
    const monthlyNeeded = Math.round(remaining / monthsLeft);

    return {
      name: g.name,
      targetAmount: g.targetAmount,
      savedAmount: g.savedAmount,
      remaining,
      percentComplete,
      targetDate: g.targetDate,
      estimatedMonthsLeft: monthsLeft,
      monthlyNeeded,
    };
  });

  const activeRecurring = recurring.filter((r) => r.active);
  const totalMonthlyRecurringExpense = activeRecurring
    .filter((r) => r.type === 'Expense')
    .reduce((sum, r) => {
      if (r.frequency === 'Weekly') return sum + r.amount * 4.33;
      if (r.frequency === 'Bi-Weekly') return sum + r.amount * 2.17;
      if (r.frequency === 'Yearly') return sum + r.amount / 12;
      return sum + r.amount;
    }, 0);

  const totalMonthlyRecurringIncome = activeRecurring
    .filter((r) => r.type === 'Income')
    .reduce((sum, r) => {
      if (r.frequency === 'Weekly') return sum + r.amount * 4.33;
      if (r.frequency === 'Bi-Weekly') return sum + r.amount * 2.17;
      if (r.frequency === 'Yearly') return sum + r.amount / 12;
      return sum + r.amount;
    }, 0);

  let needsTotal = 0;
  let wantsTotal = 0;
  for (const [cat, amt] of Object.entries(categoryTotals)) {
    if (NEEDS_CATEGORIES.has(cat)) {
      needsTotal += amt;
    } else {
      wantsTotal += amt;
    }
  }
  const savingsTotal = Math.max(0, net);

  // Compute Financial Health Score (0 - 100)
  let score = 50;
  if (monthTx.length === 0 && transactions.length === 0) {
    score = 50;
  } else {
    if (savingsRate >= targetSavingsRate) score += 20;
    else if (savingsRate > 0) score += 10;
    else if (expenses > 0) score -= 15;

    if (overBudgetCount === 0 && budgets.length > 0) score += 15;
    else score -= overBudgetCount * 8;

    if (goals.length > 0) {
      const avgGoalProgress =
        goals.reduce(
          (acc, g) => acc + (g.targetAmount > 0 ? Math.min(1, g.savedAmount / g.targetAmount) : 0),
          0
        ) / goals.length;
      score += Math.round(avgGoalProgress * 15);
    }
  }

  const healthScore = Math.max(15, Math.min(100, score));

  // Prioritize transactions from the selected month, then newest overall
  const prioritizedTx =
    monthTx.length > 0
      ? [...monthTx].sort((a, b) => b.date.localeCompare(a.date))
      : [...transactions].sort((a, b) => b.date.localeCompare(a.date));

  const recentTransactions = prioritizedTx.slice(0, 12).map((t) => ({
    date: t.date,
    description: t.description,
    category: t.category,
    type: t.type,
    amount: t.amount,
  }));

  return {
    userName,
    selectedMonth,
    currencySymbol,
    income,
    expenses,
    net,
    savingsRatePercentage: savingsRate.toFixed(1),
    targetSavingsRate,
    incomeByCategory,
    expensesByCategory: categoryTotals,
    topExpenseCategory,
    budgets: budgetDetails,
    overBudgetCount,
    savingsGoals: goalDetails,
    recurringRules: activeRecurring.map((r) => ({
      description: r.description,
      amount: r.amount,
      frequency: r.frequency,
      category: r.category,
      type: r.type,
    })),
    totalMonthlyRecurringExpense: Math.round(totalMonthlyRecurringExpense),
    totalMonthlyRecurringIncome: Math.round(totalMonthlyRecurringIncome),
    monthTransactionsCount: monthTx.length,
    totalTransactionsCount: transactions.length,
    recentTransactions,
    unusualSpending: {
      categorySpikes,
      largeSingleExpenses,
    },
    needsTotal,
    wantsTotal,
    savingsTotal,
    healthScore,
  };
}
