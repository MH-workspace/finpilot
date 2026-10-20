import { Transaction, RecurringRule, Frequency } from '../types/finance';

export const EXPENSE_CATEGORIES = [
  'Food',
  'Transport',
  'Shopping',
  'Bills',
  'Health',
  'Education',
  'Entertainment',
  'Savings',
  'Other',
];

export const INCOME_CATEGORIES = [
  'Salary',
  'Freelance',
  'Business',
  'Investments',
  'Gifts',
  'Refunds',
  'Other',
];

export const CATEGORY_COLORS: Record<string, string> = {
  Food: '#AA9FF1',
  Transport: '#CCA5C3',
  Shopping: '#789687',
  Bills: '#C8B9E9',
  Health: '#A9C0B2',
  Education: '#D7BDCF',
  Entertainment: '#9182CF',
  Savings: '#91AA9E',
  Salary: '#789687',
  Freelance: '#AA9FF1',
  Business: '#8F80D5',
  Investments: '#5F8271',
  Gifts: '#CCA5C3',
  Refunds: '#B6A9C6',
  Other: '#B6A9C6',
};

export const CATEGORY_GLYPHS: Record<string, string> = {
  Food: '◒',
  Transport: '↗',
  Shopping: '◇',
  Bills: '▤',
  Health: '✚',
  Education: '▱',
  Entertainment: '♫',
  Savings: '◎',
  Salary: '💼',
  Freelance: '⚡',
  Business: '🏛',
  Investments: '📈',
  Gifts: '🎁',
  Refunds: '↩',
  Other: '•',
};

export function formatCurrency(amount: number, symbol: string = '₹'): string {
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  const formatted = absAmount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${isNegative ? '-' : ''}${symbol}${formatted}`;
}

export function formatDate(dateString: string): string {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-').map(Number);
  if (!year || !month || !day) return dateString;
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function getMonthString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function getMonthLabel(monthStr: string): string {
  const [year, month] = monthStr.split('-').map(Number);
  const d = new Date(year, month - 1, 1);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function generateMonthList(count: number = 24): string[] {
  const months: string[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(getMonthString(d));
  }
  return months;
}

export function isDuplicateTransaction(
  existing: Transaction[],
  date: string,
  description: string,
  category: string,
  type: string,
  amount: number,
  excludeId?: string
): boolean {
  const normDesc = description.trim().toLowerCase();
  return existing.some(
    (tx) =>
      tx.id !== excludeId &&
      tx.date === date &&
      tx.description.trim().toLowerCase() === normDesc &&
      tx.category.toLowerCase() === category.toLowerCase() &&
      tx.type === type &&
      Math.abs(tx.amount - amount) < 0.005
  );
}

export function advanceRecurringDate(currentDateStr: string, frequency: Frequency): string {
  const [y, m, d] = currentDateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);

  switch (frequency) {
    case 'Weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'Bi-Weekly':
      date.setDate(date.getDate() + 14);
      break;
    case 'Monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'Yearly':
      date.setFullYear(date.getFullYear() + 1);
      break;
  }

  const newYear = date.getFullYear();
  const newMonth = String(date.getMonth() + 1).padStart(2, '0');
  const newDay = String(date.getDate()).padStart(2, '0');
  return `${newYear}-${newMonth}-${newDay}`;
}

export function getTodayString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
