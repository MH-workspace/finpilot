import {
  Transaction,
  Budget,
  SavingsGoal,
  RecurringRule,
  UserSettings,
  BackupData,
} from '../types/finance';
import { getTodayString, getMonthString } from './formatters';

const STORAGE_KEYS = {
  TRANSACTIONS: 'finpilot_transactions_v2',
  BUDGETS: 'finpilot_budgets_v2',
  GOALS: 'finpilot_goals_v2',
  RECURRING: 'finpilot_recurring_v2',
  SETTINGS: 'finpilot_settings_v2',
};

export const DEFAULT_SETTINGS: UserSettings = {
  currency: {
    symbol: '₹',
    code: 'INR',
    name: 'Indian Rupee (₹)',
  },
  targetSavingsRate: 20,
  hasLoadedInitialData: false,
};

export function loadSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: UserSettings): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save guest settings:', e);
  }
}

export function loadTransactions(): Transaction[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    if (!raw) {
      return seedInitialTransactions();
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : seedInitialTransactions();
  } catch {
    return seedInitialTransactions();
  }
}

export function saveTransactions(data: Transaction[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save guest transactions:', e);
  }
}

export function loadBudgets(): Budget[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.BUDGETS);
    if (!raw) {
      return seedInitialBudgets();
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : seedInitialBudgets();
  } catch {
    return seedInitialBudgets();
  }
}

export function saveBudgets(data: Budget[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save guest budgets:', e);
  }
}

export function loadGoals(): SavingsGoal[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.GOALS);
    if (!raw) {
      return seedInitialGoals();
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : seedInitialGoals();
  } catch {
    return seedInitialGoals();
  }
}

export function saveGoals(data: SavingsGoal[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save guest goals:', e);
  }
}

export function loadRecurring(): RecurringRule[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.RECURRING);
    if (!raw) {
      return seedInitialRecurring();
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : seedInitialRecurring();
  } catch {
    return seedInitialRecurring();
  }
}

export function saveRecurring(data: RecurringRule[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.RECURRING, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save guest recurring rules:', e);
  }
}

export function buildSampleDataset(): {
  transactions: Transaction[];
  budgets: Budget[];
  goals: SavingsGoal[];
  recurring: RecurringRule[];
} {
  const currentMonth = getMonthString();
  const today = getTodayString();

  const transactions: Transaction[] = [
    {
      id: 'tx_seed_1',
      date: `${currentMonth}-01`,
      description: 'Monthly Salary Credit',
      category: 'Salary',
      type: 'Income',
      amount: 85000,
      notes: 'Direct deposit',
    },
    {
      id: 'tx_seed_2',
      date: `${currentMonth}-02`,
      description: 'Apartment Rent & Maintenance',
      category: 'Bills',
      type: 'Expense',
      amount: 22000,
      notes: 'Transfer to landlord',
    },
    {
      id: 'tx_seed_3',
      date: `${currentMonth}-04`,
      description: 'Supermarket Groceries',
      category: 'Food',
      type: 'Expense',
      amount: 4350,
      notes: 'Weekly pantry restock',
    },
    {
      id: 'tx_seed_4',
      date: `${currentMonth}-06`,
      description: 'Metro Smart Card & Cabs',
      category: 'Transport',
      type: 'Expense',
      amount: 1800,
    },
    {
      id: 'tx_seed_5',
      date: `${currentMonth}-08`,
      description: 'Consulting Project Milestone',
      category: 'Freelance',
      type: 'Income',
      amount: 18500,
      notes: 'Client payment',
    },
    {
      id: 'tx_seed_6',
      date: `${currentMonth}-09`,
      description: 'Weekend Dining & Coffee',
      category: 'Food',
      type: 'Expense',
      amount: 2450,
    },
    {
      id: 'tx_seed_7',
      date: `${currentMonth}-11`,
      description: 'Electricity & Fiber Internet',
      category: 'Bills',
      type: 'Expense',
      amount: 2850,
    },
    {
      id: 'tx_seed_8',
      date: `${currentMonth}-13`,
      description: 'Annual Health Checkup & Vitamins',
      category: 'Health',
      type: 'Expense',
      amount: 3200,
    },
    {
      id: 'tx_seed_9',
      date: `${currentMonth}-15`,
      description: 'Work Wear & Footwear',
      category: 'Shopping',
      type: 'Expense',
      amount: 4500,
    },
    {
      id: 'tx_seed_10',
      date: `${currentMonth}-16`,
      description: 'Cloud Streaming & Music Subs',
      category: 'Entertainment',
      type: 'Expense',
      amount: 1199,
    },
  ];

  const budgets: Budget[] = [
    { category: 'Food', monthlyLimit: 12000 },
    { category: 'Bills', monthlyLimit: 28000 },
    { category: 'Transport', monthlyLimit: 5000 },
    { category: 'Shopping', monthlyLimit: 8000 },
    { category: 'Entertainment', monthlyLimit: 4000 },
    { category: 'Health', monthlyLimit: 6000 },
  ];

  const goals: SavingsGoal[] = [
    {
      id: 'goal_1',
      name: 'Emergency Fund (6 Months)',
      targetAmount: 250000,
      savedAmount: 165000,
      targetDate: '2026-12-31',
      notes: 'High-yield reserve fund',
    },
    {
      id: 'goal_2',
      name: 'MacBook Pro & Setup Upgrade',
      targetAmount: 180000,
      savedAmount: 110000,
      targetDate: '2026-11-30',
      notes: 'M4 chip workstation',
    },
    {
      id: 'goal_3',
      name: 'Kyoto Autumn Travel',
      targetAmount: 140000,
      savedAmount: 72000,
      targetDate: '2026-10-15',
      notes: 'Flights and ryokan bookings',
    },
  ];

  const recurring: RecurringRule[] = [
    {
      id: 'rec_1',
      description: 'Monthly Salary',
      category: 'Salary',
      type: 'Income',
      amount: 85000,
      frequency: 'Monthly',
      nextDate: today,
      active: true,
    },
    {
      id: 'rec_2',
      description: 'Apartment Rent',
      category: 'Bills',
      type: 'Expense',
      amount: 22000,
      frequency: 'Monthly',
      nextDate: today,
      active: true,
    },
    {
      id: 'rec_3',
      description: 'Fiber Broadband',
      category: 'Bills',
      type: 'Expense',
      amount: 1499,
      frequency: 'Monthly',
      nextDate: '2026-10-25',
      active: true,
    },
    {
      id: 'rec_4',
      description: 'Streaming & Media Bundle',
      category: 'Entertainment',
      type: 'Expense',
      amount: 999,
      frequency: 'Monthly',
      nextDate: '2026-10-28',
      active: true,
    },
  ];

  return { transactions, budgets, goals, recurring };
}

function seedInitialTransactions(): Transaction[] {
  const { transactions } = buildSampleDataset();
  saveTransactions(transactions);
  return transactions;
}

function seedInitialBudgets(): Budget[] {
  const { budgets } = buildSampleDataset();
  saveBudgets(budgets);
  return budgets;
}

function seedInitialGoals(): SavingsGoal[] {
  const { goals } = buildSampleDataset();
  saveGoals(goals);
  return goals;
}

function seedInitialRecurring(): RecurringRule[] {
  const { recurring } = buildSampleDataset();
  saveRecurring(recurring);
  return recurring;
}

export function createFullBackup(liveData?: {
  transactions: Transaction[];
  budgets: Budget[];
  goals: SavingsGoal[];
  recurring: RecurringRule[];
  settings?: UserSettings;
}): BackupData {
  if (liveData) {
    return {
      format: 'finpilot-backup-v2',
      createdAt: new Date().toISOString(),
      transactions: liveData.transactions,
      budgets: liveData.budgets,
      goals: liveData.goals,
      recurring: liveData.recurring,
      settings: liveData.settings,
    };
  }

  return {
    format: 'finpilot-backup-v2',
    createdAt: new Date().toISOString(),
    transactions: loadTransactions(),
    budgets: loadBudgets(),
    goals: loadGoals(),
    recurring: loadRecurring(),
    settings: loadSettings(),
  };
}

export function parseBackupForMerge(
  data: BackupData,
  existingTransactions: Transaction[]
): {
  mergedTransactions: Transaction[];
  addedTransactions: Transaction[];
  budgets: Budget[];
  goals: SavingsGoal[];
  recurring: RecurringRule[];
  settings?: UserSettings;
} {
  if (data.format !== 'finpilot-backup-v2' && (data as any).format !== 'finpilot-backup-v1') {
    throw new Error('Unsupported backup format. Must be finpilot-backup-v2.');
  }

  const newTx = Array.isArray(data.transactions) ? data.transactions : [];
  const mergedTransactions = [...existingTransactions];
  const addedTransactions: Transaction[] = [];

  for (const item of newTx) {
    if (!item || !item.date || !item.description || !(Number(item.amount) > 0)) continue;
    const isDup = mergedTransactions.some(
      (m) =>
        m.date === item.date &&
        m.description.trim().toLowerCase() === item.description.trim().toLowerCase() &&
        Math.abs(m.amount - Number(item.amount)) < 0.005
    );
    if (!isDup) {
      const normalized: Transaction = {
        id:
          typeof item.id === 'string' && item.id.trim()
            ? item.id.trim()
            : `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        date: item.date,
        description: item.description,
        category: item.category || 'Other',
        type: item.type === 'Income' ? 'Income' : 'Expense',
        amount: Number(item.amount),
        notes: item.notes || '',
      };
      mergedTransactions.push(normalized);
      addedTransactions.push(normalized);
    }
  }

  return {
    mergedTransactions,
    addedTransactions,
    budgets: Array.isArray(data.budgets) ? data.budgets : [],
    goals: Array.isArray(data.goals) ? data.goals : [],
    recurring: Array.isArray(data.recurring) ? data.recurring : [],
    settings: data.settings,
  };
}

export function restoreFullBackup(data: BackupData): {
  transactionsCount: number;
  budgetsCount: number;
  goalsCount: number;
  recurringCount: number;
} {
  const existingTx = loadTransactions();
  const parsed = parseBackupForMerge(data, existingTx);

  saveTransactions(parsed.mergedTransactions);

  if (parsed.budgets.length > 0) {
    saveBudgets(parsed.budgets);
  }
  if (parsed.goals.length > 0) {
    saveGoals(parsed.goals);
  }
  if (parsed.recurring.length > 0) {
    saveRecurring(parsed.recurring);
  }
  if (parsed.settings) {
    saveSettings(parsed.settings);
  }

  return {
    transactionsCount: parsed.addedTransactions.length,
    budgetsCount: parsed.budgets.length,
    goalsCount: parsed.goals.length,
    recurringCount: parsed.recurring.length,
  };
}

export function resetToDemoData(): void {
  localStorage.removeItem(STORAGE_KEYS.TRANSACTIONS);
  localStorage.removeItem(STORAGE_KEYS.BUDGETS);
  localStorage.removeItem(STORAGE_KEYS.GOALS);
  localStorage.removeItem(STORAGE_KEYS.RECURRING);
  seedInitialTransactions();
  seedInitialBudgets();
  seedInitialGoals();
  seedInitialRecurring();
}

export function clearAllUserData(): void {
  saveTransactions([]);
  saveBudgets([]);
  saveGoals([]);
  saveRecurring([]);
}
