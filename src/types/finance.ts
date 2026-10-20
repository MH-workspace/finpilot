export type TransactionType = 'Income' | 'Expense';

export type Frequency = 'Weekly' | 'Bi-Weekly' | 'Monthly' | 'Yearly';

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  description: string;
  category: string;
  type: TransactionType;
  amount: number;
  notes?: string;
}

export interface Budget {
  category: string;
  monthlyLimit: number;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  savedAmount: number;
  targetDate?: string; // YYYY-MM-DD
  notes?: string;
}

export interface RecurringRule {
  id: string;
  description: string;
  category: string;
  type: TransactionType;
  amount: number;
  frequency: Frequency;
  nextDate: string; // YYYY-MM-DD
  active: boolean;
}

export interface UserSettings {
  currency: {
    symbol: string;
    code: string;
    name: string;
  };
  targetSavingsRate: number; // percentage, e.g. 20
  hasLoadedInitialData: boolean;
}

export interface BackupData {
  format: 'finpilot-backup-v2';
  createdAt: string;
  transactions: Transaction[];
  budgets: Budget[];
  goals: SavingsGoal[];
  recurring: RecurringRule[];
  settings?: UserSettings;
}

export type ActivePage =
  | 'Dashboard'
  | 'Transactions'
  | 'Budgets'
  | 'Analytics'
  | 'Savings goals'
  | 'Recurring'
  | 'AI Assistant'
  | 'Settings';
