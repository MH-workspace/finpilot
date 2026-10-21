import { Transaction, Budget, SavingsGoal, RecurringRule } from '../types/finance';

export interface FinancialSnapshot {
  userName?: string;
  selectedMonth: string;
  currencySymbol: string;
  income: number;
  expenses: number;
  net: number;
  savingsRatePercentage: string;
  targetSavingsRate: number;
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
  totalTransactionsCount: number;
  recentTransactions: {
    date: string;
    description: string;
    category: string;
    type: string;
    amount: number;
  }[];
  needsTotal: number;
  wantsTotal: number;
  savingsTotal: number;
  healthScore: number;
}

// Classify expense categories into 50/30/20 buckets
const NEEDS_CATEGORIES = new Set(['Bills', 'Food', 'Transport', 'Health', 'Education']);
const WANTS_CATEGORIES = new Set(['Shopping', 'Entertainment', 'Dining', 'Travel', 'Other']);

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

  const income = monthTx
    .filter((tx) => tx.type === 'Income')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const expenses = monthTx
    .filter((tx) => tx.type === 'Expense')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const net = income - expenses;
  const savingsRate = income > 0 ? (net / income) * 100 : 0;

  const categoryTotals: Record<string, number> = {};
  monthTx
    .filter((tx) => tx.type === 'Expense')
    .forEach((tx) => {
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

  const topExpenseCategory = topCategoryAmount > 0 ? {
    name: topCategoryName,
    amount: topCategoryAmount,
    percentage: expenses > 0 ? ((topCategoryAmount / expenses) * 100).toFixed(1) : '0',
  } : undefined;

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
    const percentComplete = g.targetAmount > 0 ? ((g.savedAmount / g.targetAmount) * 100).toFixed(0) : '0';
    
    let monthsLeft = 6;
    if (g.targetDate) {
      const targetD = new Date(g.targetDate);
      const diffMonths = (targetD.getFullYear() - now.getFullYear()) * 12 + (targetD.getMonth() - now.getMonth());
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
    .reduce((sum, r) => sum + r.amount, 0);
  const totalMonthlyRecurringIncome = activeRecurring
    .filter((r) => r.type === 'Income')
    .reduce((sum, r) => sum + r.amount, 0);

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
  if (savingsRate >= targetSavingsRate) score += 20;
  else if (savingsRate > 0) score += 10;
  else score -= 15;

  if (overBudgetCount === 0 && budgets.length > 0) score += 15;
  else score -= overBudgetCount * 8;

  if (goals.length > 0) {
    const avgGoalProgress = goals.reduce((acc, g) => acc + (g.targetAmount > 0 ? g.savedAmount / g.targetAmount : 0), 0) / goals.length;
    score += Math.round(avgGoalProgress * 15);
  }

  const healthScore = Math.max(15, Math.min(100, score));

  const recentTransactions = transactions
    .slice(0, 8)
    .map((t) => ({
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
    totalMonthlyRecurringExpense,
    totalMonthlyRecurringIncome,
    totalTransactionsCount: transactions.length,
    recentTransactions,
    needsTotal,
    wantsTotal,
    savingsTotal,
    healthScore,
  };
}

/**
 * Advanced Deterministic AI Financial Advisor Reasoning Engine.
 * Used whenever the Gemini API is unreachable, times out, or when instant smart response is required.
 * Generates insightful, bespoke financial analysis tailored directly to the user's questions and metrics.
 */
export function generateAdvancedFinancialAdvice(
  snapshot: FinancialSnapshot,
  prompt: string,
  userGreetingName?: string
): string {
  const p = prompt.toLowerCase();
  const symbol = snapshot.currencySymbol;
  const name = userGreetingName ? userGreetingName : (snapshot.userName ? snapshot.userName : '');
  const salutation = name ? `${name}, ` : '';

  // 1. 50/30/20 Rule Analysis
  if (p.includes('50/30/20') || p.includes('rule') || p.includes('recommendation') || p.includes('framework')) {
    const baselineIncome = snapshot.income > 0 ? snapshot.income : snapshot.totalMonthlyRecurringIncome || 85000;
    const targetNeeds = baselineIncome * 0.5;
    const targetWants = baselineIncome * 0.3;
    const targetSavings = baselineIncome * 0.2;

    const actualNeedsPct = snapshot.income > 0 ? ((snapshot.needsTotal / snapshot.income) * 100).toFixed(0) : '—';
    const actualWantsPct = snapshot.income > 0 ? ((snapshot.wantsTotal / snapshot.income) * 100).toFixed(0) : '—';
    const actualSavingsPct = snapshot.savingsRatePercentage;

    return `### 50/30/20 Budget Blueprint ${name ? `for ${name}` : ''}
${salutation}here is how your monthly baseline (${symbol}${baselineIncome.toLocaleString()}) maps to the classic wealth-building framework:

| Category | Guideline | Target Amount | Your Recorded Spend | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Needs (50%)** | Housing, groceries, bills, transport | **${symbol}${targetNeeds.toLocaleString()}** | ${symbol}${snapshot.needsTotal.toLocaleString()} (${actualNeedsPct}%) | ${snapshot.needsTotal <= targetNeeds ? '✅ Balanced' : '⚠️ Elevated'} |
| **Wants (30%)** | Dining, shopping, leisure | **${symbol}${targetWants.toLocaleString()}** | ${symbol}${snapshot.wantsTotal.toLocaleString()} (${actualWantsPct}%) | ${snapshot.wantsTotal <= targetWants ? '✅ Well Controlled' : '⚠️ High'} |
| **Savings & Goals (20%)** | Emergency fund, investments | **${symbol}${targetSavings}** | ${symbol}${snapshot.savingsTotal.toLocaleString()} (${actualSavingsPct}%) | ${Number(actualSavingsPct) >= 20 ? '🌟 Excellent' : '📈 Opportunity to grow'} |

**Strategic Takeaway:**
${snapshot.income === 0 ? `Since your income for this reporting month is still pending, this blueprint uses your monthly baseline of ${symbol}${baselineIncome.toLocaleString()} to guide your upcoming transactions.` : `You currently allocate **${actualSavingsPct}%** to savings. Reallocating just ${symbol}${Math.round(baselineIncome * 0.05).toLocaleString()} from discretionary spending will push you right into the top tier.`}`;
  }

  // 2. Overspending & Budget Audit
  if (p.includes('overspend') || p.includes('fix') || p.includes('cut') || p.includes('budget audit')) {
    const overBudgets = snapshot.budgets.filter((b) => b.isOver);
    const nearBudgets = snapshot.budgets.filter((b) => b.isNearLimit);

    let budgetFindings = '';
    if (overBudgets.length > 0) {
      budgetFindings = overBudgets.map((b) => `- **${b.category}:** Spent ${symbol}${b.spentThisMonth.toLocaleString()} of ${symbol}${b.monthlyLimit.toLocaleString()} (**${symbol}${(b.spentThisMonth - b.monthlyLimit).toLocaleString()} over limit**)`).join('\n');
    } else if (nearBudgets.length > 0) {
      budgetFindings = nearBudgets.map((b) => `- **${b.category}:** Spent ${symbol}${b.spentThisMonth.toLocaleString()} of ${symbol}${b.monthlyLimit.toLocaleString()} (${b.percentageUsed}% used — approaching limit)`).join('\n');
    } else if (snapshot.budgets.length > 0) {
      budgetFindings = `✅ All ${snapshot.budgets.length} configured budgets are running cleanly within their limits.`;
    } else {
      budgetFindings = `You haven't set up budget limits yet. Tap **Budgets** in the navigation to configure monthly limits for Food, Shopping, and Bills.`;
    }

    return `### Spending & Budget Risk Audit
${salutation}here is the inspection of your recorded expenses:

${budgetFindings}

${snapshot.topExpenseCategory ? `**Highest Cost Driver:**\nYour top spending category is **${snapshot.topExpenseCategory.name}** at **${symbol}${snapshot.topExpenseCategory.amount.toLocaleString()}** (${snapshot.topExpenseCategory.percentage}% of all expenses).` : ''}

**FinPilot Action Plan:**
1. **Set strict weekly caps:** Divide your category limits into 4 weekly portions to prevent end-of-month spikes.
2. **Review subscriptions:** Audit recurring auto-debits in the **Recurring** tab to eliminate dormant services.
3. **Automate savings first:** Transfer your savings target on salary day before beginning discretionary spending.`;
  }

  // 3. Savings Goals Acceleration
  if (p.includes('goal') || p.includes('savings') || p.includes('reach') || p.includes('faster')) {
    if (snapshot.savingsGoals.length === 0) {
      return `### Savings Goal Strategy
${salutation}you do not have any active savings goals recorded yet.

Setting tangible goals gives your money direction. In the **Savings Goals** workspace, you can create targets like:
- **Emergency Reserve:** 3 to 6 months of essential expenses (${symbol}${((snapshot.totalMonthlyRecurringExpense || 30000) * 3).toLocaleString()})
- **Equipment & Upgrades:** Workstation, technology, or gadgets
- **Vacation & Travel:** Planned experiences without credit debt

Once created, I will calculate the exact monthly deposit needed to reach each target!`;
    }

    const goalsBreakdown = snapshot.savingsGoals.map((g) => {
      return `- **${g.name}:** Saved ${symbol}${g.savedAmount.toLocaleString()} of ${symbol}${g.targetAmount.toLocaleString()} (${g.percentComplete}%)\n  *Needs approx. **${symbol}${g.monthlyNeeded?.toLocaleString()} / month** to reach by ${g.targetDate || 'target date'}*`;
    }).join('\n\n');

    const totalNeededMonthly = snapshot.savingsGoals.reduce((sum, g) => sum + (g.monthlyNeeded || 0), 0);

    return `### Savings Goals Acceleration Roadmap
${salutation}here is the status and accelerated trajectory of your financial goals:

${goalsBreakdown}

**Total Monthly Goal Commitment:** **${symbol}${totalNeededMonthly.toLocaleString()} / month**

**How to speed up completion:**
1. **Allocate Surplus:** Your current monthly surplus is **${symbol}${Math.max(0, snapshot.net).toLocaleString()}**. Directing 60% of this surplus immediately to your highest-priority goal will shave months off your timeline.
2. **Deposit Windfalls:** Funnel tax refunds, freelance milestone payments, or bonuses directly into goal reserves.
3. **Automate Standing Instructions:** Schedule automatic transfers on the 1st of every month to eliminate decision fatigue.`;
  }

  // 4. Recurring Bills & Subscriptions Audit
  if (p.includes('recurring') || p.includes('subscription') || p.includes('bill') || p.includes('fixed')) {
    if (snapshot.recurringRules.length === 0) {
      return `### Fixed Costs & Recurring Audit
${salutation}you have no recurring rules configured in your workspace.

Configuring recurring entries (Rent, Utilities, Subscriptions, Salary) automates ledger updates and helps forecast upcoming cash commitments. Head to the **Recurring** workspace to add your monthly subscriptions!`;
    }

    const billsList = snapshot.recurringRules
      .filter((r) => r.type === 'Expense')
      .map((r) => `- **${r.description}:** ${symbol}${r.amount.toLocaleString()} (${r.frequency}, ${r.category})`)
      .join('\n');

    const annualCommitment = snapshot.totalMonthlyRecurringExpense * 12;

    return `### Recurring Commitments & Subscription Audit
${salutation}here is your fixed cost breakdown:

${billsList}

- **Total Monthly Fixed Outflow:** **${symbol}${snapshot.totalMonthlyRecurringExpense.toLocaleString()}**
- **Annualized Fixed Obligation:** **${symbol}${annualCommitment.toLocaleString()} / year**

**Optimization Checklist:**
1. **Audit Duplicates:** Ensure you don't have overlapping entertainment or cloud storage services.
2. **Annual Payment Discounts:** Switching software or streaming plans from monthly to annual billing often saves 15–20%.
3. **Broadband & Utility Negotiation:** Calling providers every 12 months often unlocks promotional retention rates.`;
  }

  // 5. Default Comprehensive Monthly Cashflow & Overview
  const netLabel = snapshot.net >= 0 ? `+${symbol}${snapshot.net.toLocaleString()}` : `-${symbol}${Math.abs(snapshot.net).toLocaleString()}`;
  const statusBadge = snapshot.net >= 0 ? 'Surplus' : 'Deficit';

  let categoryBreakdown = '';
  if (Object.keys(snapshot.expensesByCategory).length > 0) {
    categoryBreakdown = Object.entries(snapshot.expensesByCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([cat, amt]) => `- **${cat}:** ${symbol}${amt.toLocaleString()} (${snapshot.expenses > 0 ? ((amt / snapshot.expenses) * 100).toFixed(0) : 0}%)`)
      .join('\n');
  } else {
    categoryBreakdown = '- No categorized expenses recorded for this specific month yet.';
  }

  return `### Monthly Cashflow & Financial Intelligence (${snapshot.selectedMonth})
${salutation}here is a comprehensive analysis of your financial standing:

**Executive Summary:**
- **Total Inflow:** **${symbol}${snapshot.income.toLocaleString()}**
- **Total Outflow:** **${symbol}${snapshot.expenses.toLocaleString()}**
- **Net Cashflow:** **${netLabel}** (${statusBadge})
- **Savings Rate:** **${snapshot.savingsRatePercentage}%** (Target benchmark: ${snapshot.targetSavingsRate}%)
- **FinPilot Health Score:** **${snapshot.healthScore}/100**

**Top Expense Allocations:**
${categoryBreakdown}

${snapshot.overBudgetCount > 0 ? `⚠️ **Alert:** You have **${snapshot.overBudgetCount}** categories exceeding monthly limits. Check your **Budgets** view.` : '✅ **Budget Discipline:** All category budgets are currently within safe limits.'}

**Next Recommended Action:**
${snapshot.net > 0 ? `You have an unallocated surplus of **${symbol}${snapshot.net.toLocaleString()}**. Direct this toward your **Savings Goals** or an emergency liquid reserve.` : 'Focus on trimming discretionary shopping or dining expenses to restore a positive monthly cashflow margin.'}`;
}
